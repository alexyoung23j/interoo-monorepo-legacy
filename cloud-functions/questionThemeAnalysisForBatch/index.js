"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionThemeAnalysisForBatch = void 0;
const client_1 = require("@prisma/client");
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const runnables_1 = require("@langchain/core/runnables");
const zod_1 = require("zod");
const BATCH_SIZE = 5;
const prisma = new client_1.PrismaClient();
// Helper function for structured logging
function logEntry(severity, message, additionalFields = {}) {
    const entry = Object.assign({ severity,
        message }, additionalFields);
    console.log(JSON.stringify(entry));
}
const CitationSchema = zod_1.z.object({
    responseId: zod_1.z.string().describe("id of the response the quote is from"),
    text: zod_1.z.string().describe("the quote's sentence(s) concatenated together"),
    start_word_index: zod_1.z.number().describe("start word index of the first sentence of the quote in the transcription"),
    end_word_index: zod_1.z.number().describe("end word index of the last sentence of the quote in the transcription"),
    start_time: zod_1.z.number().describe("start time of the first sentence of the quote"),
    end_time: zod_1.z.number().describe("end time of the last sentence of the quote"),
});
const ThemeAnalysisResultSchema = zod_1.z.object({
    existingThemes: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().describe("id of the existing theme"),
        citations: zod_1.z.array(CitationSchema),
    })),
    newThemes: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().describe("name of the new theme"),
        description: zod_1.z.string().describe("description of the new theme"),
        citations: zod_1.z.array(CitationSchema),
    })),
});
const model = new openai_1.ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
}).withStructuredOutput(ThemeAnalysisResultSchema, { method: "jsonSchema", name: "ThemeAnalysisResultWithQuoteCitationsToSupportThemes" });
const questionThemeAnalysisForBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    logEntry('INFO', 'Starting questionThemeAnalysisForBatch function');
    try {
        const batch = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // First, find questions with unprocessed jobs
            const eligibleQuestions = yield tx.questionThemeAnalysisJob.groupBy({
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
            const result = yield tx.questionThemeAnalysisJob.findMany({
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
        }));
        if (!batch) {
            logEntry('INFO', 'Not enough jobs to process');
            res.status(200).send('Not enough jobs to process');
            return;
        }
        logEntry('INFO', `Processing batch of jobs`, { batchSize: batch.length, questionId: batch[0].questionId, studyId: batch[0].studyId });
        const questionId = batch[0].questionId;
        const studyId = batch[0].studyId;
        // The check for consistent questionId and studyId is no longer necessary, but we can keep it for extra safety
        if (!batch.every(job => job.questionId === questionId && job.studyId === studyId)) {
            logEntry('ERROR', 'Inconsistent questionId or studyId in batch', { batch });
            throw new Error('Inconsistent questionId or studyId in batch');
        }
        // Update job statuses to IN_PROGRESS
        yield prisma.questionThemeAnalysisJob.updateMany({
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
        const question = yield prisma.question.findUnique({
            where: {
                id: questionId
            },
            select: {
                title: true
            }
        });
        logEntry('INFO', `Fetched question`, { questionTitle: question === null || question === void 0 ? void 0 : question.title });
        // Fetch responses
        const responses = yield prisma.response.findMany({
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
        const existingThemes = yield prisma.theme.findMany({
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
        const transcriptions = responses.map(response => {
            try {
                const transcriptionBody = JSON.parse(response.transcriptionBody);
                return {
                    responseId: response.id,
                    transcript: transcriptionBody.transcript
                };
            }
            catch (error) {
                logEntry('ERROR', `Error parsing transcriptionBody`, { responseId: response.id, error: error.message });
                return null;
            }
        }).filter((t) => t !== null);
        logEntry('INFO', `Prepared transcriptions for LLM`, { transcriptionCount: transcriptions.length });
        const themeData = existingThemes.map(theme => ({
            id: theme.id,
            name: theme.name,
            description: theme.description
        }));
        // Generate LLM prompt
        const prompt = prompts_1.ChatPromptTemplate.fromTemplate(`
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
        const chain = runnables_1.RunnableSequence.from([prompt, model]);
        logEntry('INFO', 'Invoking LLM chain');
        const response = yield chain.invoke({
            questionText: (_a = question === null || question === void 0 ? void 0 : question.title) !== null && _a !== void 0 ? _a : "",
            transcriptions: JSON.stringify(transcriptions),
            existingThemes: JSON.stringify(themeData)
        });
        logEntry('INFO', 'Received response from LLM');
        const analysisResult = response;
        logEntry('INFO', 'Updating database based on analysis results');
        // Update database based on analysis results
        yield updateDatabase(analysisResult, questionId, studyId);
        // Update job statuses to COMPLETED
        yield prisma.questionThemeAnalysisJob.updateMany({
            where: {
                id: {
                    in: batch.map(job => job.id)
                }
            },
            data: {
                status: 'COMPLETED'
            }
        });
        logEntry('INFO', 'Updated job statuses to COMPLETED');
        res.status(200).send('Analysis completed successfully');
    }
    catch (error) {
        logEntry('ERROR', 'Error in questionThemeAnalysisForBatch', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    finally {
        yield prisma.$disconnect();
        logEntry('INFO', 'Disconnected from Prisma');
    }
});
exports.questionThemeAnalysisForBatch = questionThemeAnalysisForBatch;
function updateDatabase(result, questionId, studyId) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const existingTheme of result.existingThemes) {
            for (const citation of existingTheme.citations) {
                const quote = yield prisma.quote.create({
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
                yield prisma.quotesOnTheme.create({
                    data: {
                        quoteId: quote.id,
                        themeId: existingTheme.id
                    }
                });
            }
            // Check if the theme is already associated with the question
            const existingAssociation = yield prisma.themesOnQuestion.findFirst({
                where: {
                    themeId: existingTheme.id,
                    questionId: questionId
                }
            });
            // If the association doesn't exist, create it
            if (!existingAssociation) {
                yield prisma.themesOnQuestion.create({
                    data: {
                        themeId: existingTheme.id,
                        questionId: questionId
                    }
                });
            }
        }
        for (const newTheme of result.newThemes) {
            const theme = yield prisma.theme.create({
                data: {
                    name: newTheme.name,
                    description: newTheme.description,
                    studyId: studyId,
                    tagColor: "blue"
                }
            });
            for (const citation of newTheme.citations) {
                const quote = yield prisma.quote.create({
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
                yield prisma.quotesOnTheme.create({
                    data: {
                        quoteId: quote.id,
                        themeId: theme.id
                    }
                });
            }
            yield prisma.themesOnQuestion.create({
                data: {
                    themeId: theme.id,
                    questionId: questionId
                }
            });
        }
    });
}
