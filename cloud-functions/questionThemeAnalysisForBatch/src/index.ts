import * as functions from '@google-cloud/functions-framework';
import { PrismaClient } from '@prisma/client';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { MessageContent } from '@langchain/core/messages';
import { HttpFunction } from '@google-cloud/functions-framework';
import { z } from 'zod';

const BATCH_SIZE = 5;

const prisma = new PrismaClient();

// Helper function for structured logging
function logEntry(severity: string, message: string, additionalFields: Record<string, any> = {}): void {
  const entry = {
    severity,
    message,
    ...additionalFields
  };
  console.log(JSON.stringify(entry));
}

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

const CitationSchema = z.object({
  responseId: z.string().describe("id of the response the quote is from"),
  text: z.string().describe("the quote's sentence(s) concatenated together"),
  start_word_index: z.number().describe("start word index of the first sentence of the quote in the transcription"),
  end_word_index: z.number().describe("end word index of the last sentence of the quote in the transcription"),
  start_time: z.number().describe("start time of the first sentence of the quote"),
  end_time: z.number().describe("end time of the last sentence of the quote"),
});

const ThemeAnalysisResultSchema = z.object({
  existingThemes: z.array(
    z.object({
      id: z.string().describe("id of the existing theme"),
      citations: z.array(CitationSchema),
    })
  ),
  newThemes: z.array(
    z.object({
      name: z.string().describe("name of the new theme"),
      description: z.string().describe("description of the new theme"),
      citations: z.array(CitationSchema),
    })
  ),
});

type ThemeAnalysisResultSchema = z.infer<typeof ThemeAnalysisResultSchema>;

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
}).withStructuredOutput(ThemeAnalysisResultSchema, { method: "jsonSchema" , name: "ThemeAnalysisResultWithQuoteCitationsToSupportThemes"});

export const questionThemeAnalysisForBatch: HttpFunction = async (req, res) => {
  logEntry('INFO', 'Starting questionThemeAnalysisForBatch function');
  let batch: any[] | null = null;
  try {
    batch = await prisma.$transaction(async (tx) => {
      // First, find questions with unprocessed jobs
      const eligibleQuestions = await tx.questionThemeAnalysisJob.groupBy({
        by: ['questionId', 'studyId'],
        where: {
          status: {
            in: ['NOT_STARTED', 'FAILED']
          }
        },
        _count: {
          questionId: true
        },
        having: {
          questionId: {
            _count: {
              gte: BATCH_SIZE
            }
          }
        },
        orderBy: {
          _count: {
            questionId: 'desc'
          }
        },
        take: 1
      });

      if (eligibleQuestions.length === 0) {
        logEntry('INFO', 'No eligible questions with enough jobs to process');
        return null;
      }

      const { questionId, studyId } = eligibleQuestions[0];

      // Now fetch BATCH_SIZE jobs for this question
      const result = await tx.questionThemeAnalysisJob.findMany({
        where: {
          questionId: questionId,
          studyId: studyId,
          status: {
            in: ['NOT_STARTED', 'FAILED']
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: BATCH_SIZE
      });

      return result;
    });

    if (!batch) {
      logEntry('INFO', 'Not enough jobs to process');
      res.status(200).send('Not enough jobs to process');
      return;
    }

    logEntry('INFO', `Processing batch of jobs`, { batchSize: batch.length, questionId: batch[0].questionId, studyId: batch[0].studyId });

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

    logEntry('INFO', 'Updated job statuses to IN_PROGRESS');

    // Fetch question text
    const question = await prisma.question.findUnique({
      where: {
        id: questionId
      },
      select: {
        title: true
      }
    });

    logEntry('INFO', `Fetched question`, { questionTitle: question?.title });

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

    logEntry('INFO', `Fetched responses`, { responseCount: responses.length });

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

    logEntry('INFO', `Fetched existing themes`, { themeCount: existingThemes.length });

    // Prepare data for LLM
    const transcriptions: TranscriptionBody[] = responses.map(response => {
      try {
        const transcriptionBody = JSON.parse(response.transcriptionBody as string);
        return {
          responseId: response.id,
          transcript: transcriptionBody.transcript
        };
      } catch (error) {
        logEntry('ERROR', `Error parsing transcriptionBody`, { responseId: response.id, error: (error as Error).message });
        return null;
      }
    }).filter((t): t is TranscriptionBody => t !== null);

    logEntry('INFO', `Prepared transcriptions for LLM`, { transcriptionCount: transcriptions.length });

    const themeData = existingThemes.map(theme => ({
      id: theme.id,
      name: theme.name,
      description: theme.description
    }));

    // Generate LLM prompt
    const prompt = ChatPromptTemplate.fromTemplate(`
      You are an expert in qualitative research. I am giving you a list of transcribed responses to a question from a qualitative interview administered to a group of people.
      You are to help a market researcher understand the responses better by identifying themes across the responses.
      I've also included a list of themes that have already been identified from the rest of the study.

      Please analyze the following transcribed responses and see if you can identify responses that belong to existing themes, or if not, if there are any new
      themes that should be identified. I also want you to provide a description of each new theme you identify, along with the citations (i.e. the quotes from the responses that support the theme 
      along with the start and end word index of the quote in the transcription and the start and end time of the quote in the media of the response).

      To do this, each transcribed response in the list of transcriptions contains sentences of the response in the following format:
      {
        "responseId": "string",
        "transcript": {
          "sentences": [
            {
              "text": "string" - the sentence of the response,
              "start_time": number - the start time of the sentence in the media (media not provided in the transcription),
              "end_time": number - the end time of the sentence in the media (media not provided in the transcription),
              "start_word_index": number - the start word index of the sentence in the transcription,
              "end_word_index": number - the end word index of the sentence in the transcription,
              "is_paragraph_end": boolean - whether the sentence ends a paragraph in the response
            }
          ]
        }
      }

      The question being responded to is:
      "{questionText}"

      The list of transcribed repsponses and their sentences are:
      {transcriptions}

      The existing themes identified from the rest of the study are:
      {existingThemes}

      Ensure to provide multiple citations for each theme where applicable, but don't force a quote if there isn't enough relevant information to support it being part of a theme.
    `);

    const chain = RunnableSequence.from([prompt, model]);

    logEntry('INFO', 'Invoking LLM chain');
    const response = await chain.invoke({ 
      questionText: question?.title ?? "",
      transcriptions: JSON.stringify(transcriptions),
      existingThemes: JSON.stringify(themeData)
    });

    logEntry('INFO', 'Received response from LLM');

    const analysisResult = response;

    logEntry('INFO', 'Updating database based on analysis results');
    // Update database based on analysis results
    await updateDatabase(analysisResult, questionId, studyId);

    // If everything is successful, update job statuses to COMPLETED
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

    logEntry('INFO', 'Batch processing completed successfully');
    res.status(200).send('Batch processing completed successfully');
  } catch (error) {
    logEntry('ERROR', 'Error in questionThemeAnalysisForBatch', { 
      error: (error as Error).message,
      stack: (error as Error).stack
    });

    // If we have a batch, update the job statuses to FAILED
    if (batch) {
      try {
        await prisma.questionThemeAnalysisJob.updateMany({
          where: {
            id: {
              in: batch.map(job => job.id)
            }
          },
          data: {
            status: 'FAILED'
          }
        });
        logEntry('INFO', 'Updated job statuses to FAILED due to error');
      } catch (updateError) {
        logEntry('ERROR', 'Error updating job statuses to FAILED', { 
          error: (updateError as Error).message
        });
      }
    }

    res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await prisma.$disconnect();
    logEntry('INFO', 'Disconnected from Prisma');
  }
};

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