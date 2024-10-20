import * as functions from '@google-cloud/functions-framework';
import { PrismaClient } from '@prisma/client';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { HttpFunction } from '@google-cloud/functions-framework';
import { z } from 'zod';

const prisma = new PrismaClient();

const BATCH_SIZE = 5;

// Helper functions
function isTranscriptionBody(obj: any): obj is TranscriptionBody {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'transcript' in obj &&
    'sentences' in obj.transcript &&
    Array.isArray(obj.transcript.sentences)
  );
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  } else {
    s = 0;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

function generateHarmoniousColor(primaryColor: string, secondaryColor: string, existingColors: string[]): string {
  const [h1, s1, l1] = hexToHsl(primaryColor);
  const [h2, s2, l2] = hexToHsl(secondaryColor);

  let newColor;
  do {
    const avgS = (s1 + s2) / 2;
    const avgL = (l1 + l2) / 2;

    const newH = (h1 + h2 + Math.random() * 180) % 360;
    const newS = Math.max(0, Math.min(100, avgS + (Math.random() - 0.5) * 20));
    const newL = Math.max(0, Math.min(100, avgL + (Math.random() - 0.5) * 20));

    newColor = hslToHex(newH, newS, newL);
  } while (existingColors.includes(newColor));

  return newColor;
}

function createCitation(citation: any, responseIds: string[], responseSentences: string[][], sentenceMetadata: any[][], themeInfo: { id?: string, name?: string }) {
  const { responseIndex, startSentenceIndex, endSentenceIndex } = citation;
  
  if (!sentenceMetadata[responseIndex] || 
      !sentenceMetadata[responseIndex][startSentenceIndex] ||
      !sentenceMetadata[responseIndex][endSentenceIndex]) {
    logEntry('WARNING', 'Invalid sentence metadata access, skipping citation', {
      ...themeInfo,
      responseIndex,
      startSentenceIndex,
      endSentenceIndex,
      sentenceMetadataLength: sentenceMetadata.length,
      responseMetadataLength: sentenceMetadata[responseIndex]?.length
    });
    return [];
  }

  return [{
    responseId: responseIds[responseIndex],
    text: responseSentences[responseIndex].slice(startSentenceIndex, endSentenceIndex + 1).join(' '),
    start_word_index: sentenceMetadata[responseIndex][startSentenceIndex].start_word_index,
    end_word_index: sentenceMetadata[responseIndex][endSentenceIndex].end_word_index,
    start_time: sentenceMetadata[responseIndex][startSentenceIndex].start_time,
    end_time: sentenceMetadata[responseIndex][endSentenceIndex].end_time,
  }];
}

// Helper function for structured logging
function logEntry(severity: string, message: string, additionalFields: Record<string, any> = {}): void {
  const entry = {
    severity,
    message,
    ...additionalFields
  };
  console.log(JSON.stringify(entry));
}

interface SentenceMetadata {
  start_word_index: number;
  end_word_index: number;
  start_time: number;
  end_time: number;
}

const LLMCitationSchema = z.object({
  responseIndex: z.number().describe("The index of the response in the responseSentences array"),
  startSentenceIndex: z.number().describe("The index of the first sentence of the quote in the response"),
  endSentenceIndex: z.number().describe("The index of the last sentence of the quote in the response"),
});

const LLMThemeAnalysisResultSchema = z.object({
  existingThemes: z.array(z.object({
    id: z.string(),
    citations: z.array(LLMCitationSchema),
  })),
  newThemes: z.array(z.object({
    name: z.string(),
    description: z.string(),
    citations: z.array(LLMCitationSchema),
  })),
});

type LLMThemeAnalysisResult = z.infer<typeof LLMThemeAnalysisResultSchema>;

interface Citation {
  responseId: string;
  text: string;
  start_word_index: number;
  end_word_index: number;
  start_time: number;
  end_time: number;
}

export interface ThemeAnalysisResult {
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

interface TranscriptionBody {
  transcript: {
    sentences: Array<{
      text: string;
      start_word_index: number;
      end_word_index: number;
      start_time: number;
      end_time: number;
    }>;
  };
}

export async function generateThemeAnalysis(
  questionText: string,
  questionContext: string,
  studyBackground: string,
  responsesSentences: string[][],
  existingThemes: { id: string; name: string; description: string | null }[],
  responseIds: string[],
  sentenceMetadata: SentenceMetadata[][],
  apiKey?: string
): Promise<ThemeAnalysisResult> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
    openAIApiKey: apiKey ?? process.env.OPENAI_API_KEY,
  }).withStructuredOutput(LLMThemeAnalysisResultSchema, {
    method: 'jsonSchema',
    name: "ThemeAnalysisResult",
  });

  const prompt = ChatPromptTemplate.fromTemplate(`
    You are an expert in qualitative research. I am giving you a list of transcribed responses to a question from a qualitative interview administered to a group of people.
    You are to help a market researcher understand the responses better by identifying key insights across the responses. 
    I've also included a list of insights that have already been identified from the rest of the study. 
    You can think of the words "themes" and "insights" interchangeably in my instructions.

    Please analyze the following transcribed responses and see if you can identify quotes in the responses that support existing insights ("existingThemes") and if there are any new
    insights ("newThemes") that should be identified. Each insight should be a concise statement, ideally 6-7 words or less, that captures a key finding or observation in the responses.
    
    Please also include citations for each insight, where each citation is a sentence or group of sentences from a response in the responses that supports the insight.

    The question being responded to is:
    "{questionText}"

    The question context (which can describe useful additional information about the question like the goals of asking it) is:
    "{questionContext}"

    The study background (which can describe useful additional information about the study like the goals of administering the interview) is:
    "{studyBackground}"

    The format of the responses is a 2D array where each inner array represents an entire response, and each entry within the inner array represents a sentence of that response. The list of transcribed responses and their sentences are:
    {responsesSentences}

    The existing insights identified from the rest of the study are:
    {existingThemes}

    For citations, please provide the index of the response (remember, each inner array in responseSentences represents a response), the index of the first sentence of the identified quote from that response, and the index of the last sentence of the quote from that response.
    Avoid using sentences that express a partial thought as a citation. Citations can and usually will be multiple sentences from a response combined. 
    You can bias towards including more of the sentences from the response in the citation if you think it helps support the insight, and each theme does not need to have an equal number of citations.

    If the name of a theme is "Health considerations drive choices" for example, a good quote in a citation would be "I'm looking for that high protein item, low carb, low sugar, and low sodium.", and a bad quote would be "I can give you 2 items.". 
    Notice how in the bad quote, the user is expressing a partial thought that does not fully support the insight ("I can give you 2 items") rather than a complete thought that fully expresses an insight ("I can give you 2 items that are high protein, low carb, low sugar, and low sodium.").

    Ensure that for something to qualify as a theme, it should have multiple citations. Have a VERY high bar for what qualifies as a new theme, and bias towards having fewer themes with more citations rather than a lot of themes with only a couple of citations each for example. 
    *STRONGLY* bias towards trying to find citations for existing themes rather than generate new ones- You should almost never have more than 1-2 new themes identified, if any at all.

    Here's an example of the input format:

    responseSentences:
    [
      ["I love using this product every day.", "It has really improved my productivity.", "The interface is so intuitive."],
      ["The price is a bit high for me.", "But the quality makes up for it.", "I've had it for a year and it still works like new."],
      ["I'm not sure if it's worth the hype.", "It does the job, but I expected more features.", "The customer service is excellent though."],
      ["This product has changed my life!", "I can't imagine going back to my old routine.", "It's so easy to use and effective."]
    ]

    existingThemes:
    [
      {{
        "id": "insight1",
        "name": "Intuitive interface enhances user experience",
        "description": "Users find the product's interface easy to use, contributing to a positive experience."
      }}
    ]

    And here's an example of the expected output format:

    {{
      "existingThemes": [
        {{
          "id": "insight1",
          "citations": [
            {{
              "responseIndex": 0,
              "startSentenceIndex": 2,
              "endSentenceIndex": 2
            }},
            {{
              "responseIndex": 3,
              "startSentenceIndex": 2,
              "endSentenceIndex": 2
            }}
          ]
        }}
      ],
      "newThemes": [
        {{
          "name": "Product significantly improves daily productivity",
          "description": "Users report that the product has a substantial positive impact on their daily work efficiency and routines.",
          "citations": [
            {{
              "responseIndex": 0,
              "startSentenceIndex": 1,
              "endSentenceIndex": 1
            }},
            {{
              "responseIndex": 3,
              "startSentenceIndex": 0,
              "endSentenceIndex": 1
            }}
          ]
        }},
        {{
          "name": "Users demand value for their money",
          "description": "There's a tension between the product's price and its perceived value, with some users questioning if the features justify the cost.",
          "citations": [
            {{
              "responseIndex": 1,
              "startSentenceIndex": 0,
              "endSentenceIndex": 1
            }},
            {{
              "responseIndex": 2,
              "startSentenceIndex": 0,
              "endSentenceIndex": 1
            }}
          ]
        }}
      ]
    }}
  `);

  const chain = RunnableSequence.from([prompt, model]);

  const response = await chain.invoke({ 
    questionText,
    questionContext,
    studyBackground,
    responsesSentences: JSON.stringify(responsesSentences),
    existingThemes: JSON.stringify(existingThemes.map(theme => ({
      ...theme,
      description: theme.description ?? ''
    })))
  });

  const llmResult: LLMThemeAnalysisResult = response;

  return {
    existingThemes: llmResult.existingThemes.map(theme => ({
      id: theme.id,
      citations: theme.citations.flatMap(citation => 
        createCitation(citation, responseIds, responsesSentences, sentenceMetadata, { id: theme.id })
      ),
    })),
    newThemes: llmResult.newThemes.map(theme => ({
      name: theme.name,
      description: theme.description,
      citations: theme.citations.flatMap(citation => 
        createCitation(citation, responseIds, responsesSentences, sentenceMetadata, { name: theme.name })
      ),
    })),
  };
}

// Request body schema
const requestSchema = z.object({
  testMode: z.boolean().optional().default(false)
});

const CitationValidationSchema = z.object({
  existingThemes: z.array(z.array(z.boolean())),
  newThemes: z.array(z.array(z.boolean()))
});

type CitationValidationResult = z.infer<typeof CitationValidationSchema>;

async function validateCitations(
  analysisResult: ThemeAnalysisResult, 
  themeData: { id: string; name: string; description: string | null }[],
  studyBackground: string,
  questionContext: string,
  questionTitle: string,
  apiKey?: string
): Promise<CitationValidationResult> {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
    openAIApiKey: apiKey ?? process.env.OPENAI_API_KEY,
  }).withStructuredOutput(CitationValidationSchema, {
    method: 'jsonSchema',
    name: "CitationValidationResult",
  });

  const prompt = ChatPromptTemplate.fromTemplate(`
    You are an expert in qualitative research and thematic analysis. Your task is to validate citations for themes identified among responses to a single question in a qualitative study. A citation is a quote from an individual response to the question in the study.
    
    The title of the question being responded to is:
    {questionTitle}

    The background of the study (which can describe useful additional information about the study like the goals of administering the interview) is:
    {studyBackground}

    The context of the question being responded to (which can describe useful additional information about the question like the goals of asking it) is:
    {questionContext}

    For each theme and its associated citations, determine whether each citation genuinely supports the theme. A good citation should clearly demonstrate or exemplify the theme it's associated with.

    Here are some guidelines for validating citations:
    1. The citation should directly relate to the theme's content.
    2. The citation should provide clear evidence or an example of the theme by itself.
    3. The citation should be substantial enough to support the theme (not just a brief, vague statement).
    4. The citation should not be taken out of context in a way that misrepresents its meaning.

    For each citation, return true if it's a valid support for the theme, and false if it should be removed. If the name for an existing theme is "Unknown", ignore that theme.

    Note: We are providing the name and description of each theme. A citation is a quote from an individual response to the question in the study.

    Example:
    Theme: "Health considerations drive choices"
    Good citation (should not be filtered out): "I'm looking for that high protein item, low carb, low sugar, and low sodium. That's really important for my diet and overall health."
    Bad citation (should be filtered out): "I can give you 2 items."

    The themes and citations are as follows:

    Existing Themes:
    {existingThemes}

    New Themes:
    {newThemes}

    Please provide your analysis in the following format:
    {{
      "existingThemes": [
        [true, false, true],  // Citations for the first existing theme
        [false, true, true]   // Citations for the second existing theme
      ],
      "newThemes": [
        [true, true, false],  // Citations for the first new theme
        [false, true, true]   // Citations for the second new theme
      ]
    }}

    Ensure that the number of boolean values for each theme matches the number of citations provided for that theme.
  `);

  const chain = RunnableSequence.from([prompt, model]);

  const existingThemesWithDetails = analysisResult.existingThemes.map(theme => {
    const matchingTheme = themeData.find(t => t.id === theme.id);
    return {
      id: theme.id,
      name: matchingTheme?.name ?? 'Unknown',
      description: matchingTheme?.description ?? '',
      citations: theme.citations.map(citation => citation.text)
    };
  });

  const response = await chain.invoke({ 
    studyBackground,
    questionContext,
    questionTitle,
    existingThemes: JSON.stringify(existingThemesWithDetails),
    newThemes: JSON.stringify(analysisResult.newThemes.map(theme => ({
      name: theme.name,
      description: theme.description,
      citations: theme.citations.map(citation => citation.text)
    })))
  });

  // Log the raw response from the validation LLM call
  logEntry('INFO', 'Raw validation LLM response', { 
    rawResponse: JSON.stringify(response, null, 2)
  });

  return response;
}

// Main function
export const questionThemeAnalysisForBatch: HttpFunction = async (req, res) => {
  let batch: any[] | null = null;
  let testMode = false;
  
  try {
    const parsedBody = requestSchema.parse(req.body);
    testMode = parsedBody.testMode;
    logEntry('INFO', `Starting questionThemeAnalysisForBatch function in ${testMode ? 'test' : 'production'} mode`);

    // Database queries and data preparation
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

    // Fetch the main question and its follow-up questions
    const questionWithFollowUps = await prisma.question.findUnique({
      where: {
        id: questionId
      },
      include: {
        FollowUpQuestion: true
      }
    });

    if (!questionWithFollowUps) {
      throw new Error(`Question with id ${questionId} not found`);
    }

    // Prepare an array of all question IDs (main question + follow-ups)
    const allQuestionIds = [questionWithFollowUps.id, ...questionWithFollowUps.FollowUpQuestion.map(q => q.id)];

    // Fetch responses for the main question and all follow-up questions
    const responses = await prisma.response.findMany({
      where: {
        OR: [
          {
            questionId: {
              in: allQuestionIds
            }
          },
          {
            followUpQuestionId: {
              in: allQuestionIds
            }
          }
        ],
        interviewSessionId: {
          in: batch.map(job => job.interviewSessionId)
        },
        fastTranscribedText: {
          not: ""
        }
      },
      select: {
        id: true,
        transcriptionBody: true,
        questionId: true,
        followUpQuestionId: true
      }
    });

    logEntry('INFO', `Fetched responses`, { responseCount: responses.length });

    // Fetch the study to get the organizationId
    const study = await prisma.study.findUnique({
      where: { id: studyId },
      include: { organization: true }
    });

    if (!study) {
      throw new Error(`Study with id ${studyId} not found`);
    }

    // Fetch existing themes
    const existingThemes = await prisma.theme.findMany({
      where: {
        studyId: studyId
      },
      select: {
        id: true,
        name: true,
        description: true,
        tagColor: true
      }
    });

    const existingColors = existingThemes.map(theme => theme.tagColor);

    logEntry('INFO', `Fetched existing themes`, { themeCount: existingThemes.length });

    // Prepare data for LLM
    const responseIds: string[] = [];
    const sentenceMetadata: SentenceMetadata[][] = [];
    const responsesSentences: string[][] = [];

    responses.forEach((response) => {
      try {
        if (!isTranscriptionBody(response.transcriptionBody)) {
          logEntry('WARNING', 'Invalid transcriptionBody structure, skipping response', { 
            responseId: response.id, 
            transcriptionBody: JSON.stringify(response.transcriptionBody)
          });
          return; // Skip this response and continue with the next one
        }

        const transcriptionBody = response.transcriptionBody;

        responseIds.push(response.id);
        sentenceMetadata.push(transcriptionBody.transcript.sentences.map(sentence => ({
          start_word_index: sentence.start_word_index,
          end_word_index: sentence.end_word_index,
          start_time: sentence.start_time,
          end_time: sentence.end_time,
        })));
        responsesSentences.push(transcriptionBody.transcript.sentences.map(sentence => sentence.text));
      } catch (error) {
        logEntry('WARNING', `Error processing transcriptionBody, skipping response`, { 
          responseId: response.id, 
          error: (error as Error).message,
          transcriptionBody: JSON.stringify(response.transcriptionBody)
        });
      }
    });

    // Add these log statements after the forEach loop
    logEntry('INFO', 'Processed response data', {
      responseIds: JSON.stringify(responseIds),
      sentenceMetadata: JSON.stringify(sentenceMetadata),
      responseSentencesLength: responsesSentences.length,
    });

    const themeData = existingThemes.map(theme => ({
      id: theme.id,
      name: theme.name,
      description: theme.description
    }));

    // Generate theme analysis
    const analysisResult: ThemeAnalysisResult = await generateThemeAnalysis(
      questionWithFollowUps.title,
      questionWithFollowUps.context ?? "",
      study.studyBackground ?? "",
      responsesSentences,
      themeData,
      responseIds,
      sentenceMetadata
    );

    logEntry('INFO', 'Generated theme analysis; beginning validation');

    // Validate citations
    const validationResult = await validateCitations(
      analysisResult,
      themeData,
      study.studyBackground ?? "",
      questionWithFollowUps.context ?? "",
      questionWithFollowUps.title,
      process.env.OPENAI_API_KEY
    );

    // Log filtered citations
    let filteredCitations: { themeName: string, citations: string[] }[] = [];

    // Apply validation results to analysisResult and log filtered citations
    analysisResult.existingThemes = analysisResult.existingThemes.map((theme, themeIndex) => {
      const filtered = theme.citations.filter((_, citationIndex) => !validationResult.existingThemes[themeIndex][citationIndex]);
      if (filtered.length > 0) {
        filteredCitations.push({
          themeName: themeData.find(t => t.id === theme.id)?.name ?? 'Unknown Theme',
          citations: filtered.map(c => c.text)
        });
      }
      return {
        ...theme,
        citations: theme.citations.filter((_, citationIndex) => validationResult.existingThemes[themeIndex][citationIndex])
      };
    });

    analysisResult.newThemes = analysisResult.newThemes.map((theme, themeIndex) => {
      const filtered = theme.citations.filter((_, citationIndex) => !validationResult.newThemes[themeIndex][citationIndex]);
      if (filtered.length > 0) {
        filteredCitations.push({
          themeName: theme.name,
          citations: filtered.map(c => c.text)
        });
      }
      return {
        ...theme,
        citations: theme.citations.filter((_, citationIndex) => validationResult.newThemes[themeIndex][citationIndex])
      };
    });

    // Log the filtered citations
    if (filteredCitations.length > 0) {
      logEntry('INFO', 'Filtered citations', { filteredCitations: JSON.stringify(filteredCitations) });
    }

    if (testMode) {
      // Log analysisResult
      logEntry('INFO', 'Analysis result in test mode:', { analysisResult: JSON.stringify(analysisResult) });

      // Update job statuses back to NOT_STARTED
      await prisma.questionThemeAnalysisJob.updateMany({
        where: {
          id: {
            in: batch.map(job => job.id)
          }
        },
        data: {
          status: 'NOT_STARTED'
        }
      });
      logEntry('INFO', 'Updated job statuses back to NOT_STARTED for test mode');
    } else {
      // Update database based on analysis results
      logEntry('INFO', 'Updating database based on analysis results');
      await updateDatabase(analysisResult, questionId, studyId, study.organization.primaryColor ?? "#F0F2F3", study.organization.secondaryColor ?? "#64748B", existingColors);

      // Delete job rows
      await prisma.questionThemeAnalysisJob.deleteMany({
        where: {
          id: {
            in: batch.map(job => job.id)
          }
        }
      });
    }

    logEntry('INFO', `Batch processing completed successfully in ${testMode ? 'test' : 'production'} mode`);
    res.status(200).send(`Batch processing completed successfully in ${testMode ? 'test' : 'production'} mode`);
  } catch (error) {
    logEntry('ERROR', `Error in questionThemeAnalysisForBatch: ${error instanceof Error ? error.message : String(error)}`);
    
    // Set jobs to FAILED status if not in test mode
    if (!testMode && batch) {
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
        logEntry('ERROR', `Failed to update job statuses: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
      }
    }

    if (error instanceof z.ZodError) {
      res.status(400).send(`Invalid request body: ${error.message}`);
    } else {
      res.status(500).send('Internal server error');
    }
  } finally {
    await prisma.$disconnect();
    logEntry('INFO', 'Disconnected from Prisma');
  }
};

// Database update function
async function updateDatabase(result: ThemeAnalysisResult, questionId: string, studyId: string, primaryColor: string, secondaryColor: string, existingColors: string[]) {
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
    const newColor = generateHarmoniousColor(primaryColor, secondaryColor, existingColors);
    existingColors.push(newColor);

    const theme = await prisma.theme.create({
      data: {
        name: newTheme.name,
        description: newTheme.description,
        studyId: studyId,
        tagColor: newColor
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
