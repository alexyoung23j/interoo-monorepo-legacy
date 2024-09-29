import * as functions from '@google-cloud/functions-framework';
import { PrismaClient } from '@prisma/client';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { MessageContent } from '@langchain/core/messages';
import { HttpFunction } from '@google-cloud/functions-framework';

const BATCH_SIZE = 10;

const prisma = new PrismaClient();

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
});

interface TranscriptionSentence {
  text: string;
  start_time: number;
  end_time: number;
  start_word_index: number;
  end_word_index: number;
  is_paragraph_end: boolean;
}

interface TranscriptionBody {
  responseId: string;
  transcript: {
    sentences: TranscriptionSentence[];
  };
}

interface ThemeAnalysisResult {
  existingThemes: {
    id: string;
    citations: Citation[];
  }[];
  newThemes: {
    name: string;
    description: string;
    citations: Citation[];
  }[];
}

interface Citation {
  responseId: string;
  text: string;
  start_word_index: number;
  end_word_index: number;
  start_time: number;
  end_time: number;
}

const questionThemeAnalysisForBatch: HttpFunction = async (req, res) => {
  try {
    const batch = await prisma.$transaction(async (tx) => {
      // Attempt to fetch exactly BATCH_SIZE rows
      const result = await tx.questionThemeAnalysisJob.findMany({
        where: {
          status: {
            in: ['NOT_STARTED', 'FAILED']
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: BATCH_SIZE
      });
    
      // If we got fewer than BATCH_SIZE rows, return null
      if (result.length < BATCH_SIZE) {
        return null;
      }
    
      // Otherwise, return the batch
      return result;
    });

    if (!batch) {
      console.log('Not enough jobs to process');
      res.status(200).send('Not enough jobs to process');
      return;
    }

    const questionId = batch[0].questionId;
    const studyId = batch[0].studyId;

    if (!batch.every(job => job.questionId === questionId && job.studyId === studyId)) {
      throw new Error('Inconsistent questionId or studyId in batch');
    }

    // Update job statuses to IN_PROGRESS
    await prisma.questionThemeAnalysisJob.updateMany({
      where: {
        id: {
          in: batch.map(job => job.id)
        }
      },
      data: {
        status: 'IN_PROGRESS'
      }
    });

    // Fetch responses
    const responses = await prisma.response.findMany({
      where: {
        questionId: questionId,
        interviewSessionId: {
          in: batch.map(job => job.interviewSessionId)
        },
        fastTranscribedText: {
          not: ""
        }
      },
      select: {
        id: true,
        transcriptionBody: true
      }
    });

    // Fetch existing themes
    const existingThemes = await prisma.theme.findMany({
      where: {
        studyId: studyId
      },
      select: {
        id: true,
        name: true,
        description: true
      }
    });

    // Prepare data for LLM
    const transcriptions: TranscriptionBody[] = responses.map(response => {
      try {
        const transcriptionBody = JSON.parse(response.transcriptionBody as string);
        return {
          responseId: response.id,
          transcript: transcriptionBody.transcript
        };
      } catch (error) {
        console.error(`Error parsing transcriptionBody for response ${response.id}:`, error);
        return null;
      }
    }).filter((t): t is TranscriptionBody => t !== null);

    const themeData = existingThemes.map(theme => ({
      id: theme.id,
      name: theme.name,
      description: theme.description
    }));

    // Generate LLM prompt
    const prompt = ChatPromptTemplate.fromTemplate(`
      Analyze the following transcriptions and identify themes. Compare with existing themes and suggest new ones if necessary.

      Transcriptions:
      {transcriptions}

      Existing Themes:
      {existingThemes}

      Please provide your analysis in the following JSON format:

      {
        "existingThemes": [
          {
            "id": "string",
            "citations": [
              {
                "responseId": "string",
                "text": "string",
                "start_word_index": number,
                "end_word_index": number,
                "start_time": number,
                "end_time": number
              }
            ]
          }
        ],
        "newThemes": [
          {
            "name": "string",
            "description": "string",
            "citations": [
              {
                "responseId": "string",
                "text": "string",
                "start_word_index": number,
                "end_word_index": number,
                "start_time": number,
                "end_time": number
              }
            ]
          }
        ]
      }

      Ensure to provide multiple citations for each theme where applicable.
    `);

    const chain = RunnableSequence.from([prompt, model]);

    const response = await chain.invoke({ 
      transcriptions: JSON.stringify(transcriptions),
      existingThemes: JSON.stringify(themeData)
    });

    const analysisResult = parseAnalysisResult(extractTextContent(response.content));

    // Update database based on analysis results
    await updateDatabase(analysisResult, questionId, studyId);

    // Update job statuses to COMPLETED
    await prisma.questionThemeAnalysisJob.updateMany({
      where: {
        id: {
          in: batch.map(job => job.id)
        }
      },
      data: {
        status: 'COMPLETED'
      }
    });

    res.status(200).send('Analysis completed successfully');
  } catch (error) {
    console.error('Error in questionThemeAnalysisForBatch:', error);
    res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await prisma.$disconnect();
  }
};

function extractTextContent(content: MessageContent): string {
  if (typeof content === 'string') return content;
  return content.map(item => {
    if (typeof item === 'string') return item;
    if ('text' in item) return item.text;
    return JSON.stringify(item);
  }).join(' ');
}

function parseAnalysisResult(content: string): ThemeAnalysisResult {
  try {
    return JSON.parse(content) as ThemeAnalysisResult;
  } catch (error) {
    console.error('Error parsing LLM output:', error);
    throw new Error('Failed to parse LLM output');
  }
}

async function updateDatabase(result: ThemeAnalysisResult, questionId: string, studyId: string) {
  for (const existingTheme of result.existingThemes) {
    for (const citation of existingTheme.citations) {
      const quote = await prisma.quote.create({
        data: {
          plainText: citation.text,
          wordStartIndex: citation.start_word_index,
          wordEndIndex: citation.end_word_index,
          mediaStartTime: citation.start_time,
          mediaEndTime: citation.end_time,
          response: {
            connect: {
              id: citation.responseId
            }
          }
        }
      });

      await prisma.quotesOnTheme.create({
        data: {
          quoteId: quote.id,
          themeId: existingTheme.id
        }
      });
    }

    // Check if the theme is already associated with the question
    const existingAssociation = await prisma.themesOnQuestion.findFirst({
      where: {
        themeId: existingTheme.id,
        questionId: questionId
      }
    });

    // If the association doesn't exist, create it
    if (!existingAssociation) {
      await prisma.themesOnQuestion.create({
        data: {
          themeId: existingTheme.id,
          questionId: questionId
        }
      });
    }
  }

  for (const newTheme of result.newThemes) {
    const theme = await prisma.theme.create({
      data: {
        name: newTheme.name,
        description: newTheme.description,
        studyId: studyId,
        tagColor: "blue"
      }
    });

    for (const citation of newTheme.citations) {
      const quote = await prisma.quote.create({
        data: {
          plainText: citation.text,
          wordStartIndex: citation.start_word_index,
          wordEndIndex: citation.end_word_index,
          mediaStartTime: citation.start_time,
          mediaEndTime: citation.end_time,
          response: {
            connect: {
              id: citation.responseId
            }
          }
        }
      });

      await prisma.quotesOnTheme.create({
        data: {
          quoteId: quote.id,
          themeId: theme.id
        }
      });
    }

    await prisma.themesOnQuestion.create({
      data: {
        themeId: theme.id,
        questionId: questionId
      }
    });
  }
}