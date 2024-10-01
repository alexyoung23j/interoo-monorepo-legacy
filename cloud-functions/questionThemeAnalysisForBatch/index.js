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
const prisma = new client_1.PrismaClient();
const BATCH_SIZE = 3;
// Helper function for structured logging
function logEntry(severity, message, additionalFields = {}) {
    const entry = Object.assign({ severity,
        message }, additionalFields);
    console.log(JSON.stringify(entry));
}
const LLMCitationSchema = zod_1.z.object({
    responseIndex: zod_1.z.number().describe("The index of the response in the responseSentences array"),
    startSentenceIndex: zod_1.z.number().describe("The index of the first sentence of the quote in the response"),
    endSentenceIndex: zod_1.z.number().describe("The index of the last sentence of the quote in the response"),
});
const LLMThemeAnalysisResultSchema = zod_1.z.object({
    existingThemes: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        citations: zod_1.z.array(LLMCitationSchema),
    })),
    newThemes: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string(),
        citations: zod_1.z.array(LLMCitationSchema),
    })),
});
const model = new openai_1.ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
}).withStructuredOutput(LLMThemeAnalysisResultSchema);
function isTranscriptionBody(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'transcript' in obj &&
        'sentences' in obj.transcript &&
        Array.isArray(obj.transcript.sentences));
}
function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    else {
        s = 0;
    }
    return [h * 360, s * 100, l * 100];
}
function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
function generateHarmoniousColor(primaryHex, secondaryHex, existingColors) {
    const [h1, s1, l1] = hexToHsl(primaryHex);
    const [h2, s2, l2] = hexToHsl(secondaryHex);
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
const questionThemeAnalysisForBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    logEntry('INFO', 'Starting questionThemeAnalysisForBatch function');
    let batch = null;
    try {
        batch = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
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
        if (!batch.every(job => job.questionId === questionId && job.studyId === studyId)) {
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
        // Fetch the main question and its follow-up questions
        const questionWithFollowUps = yield prisma.question.findUnique({
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
        const responses = yield prisma.response.findMany({
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
        const study = yield prisma.study.findUnique({
            where: { id: studyId },
            include: { organization: true }
        });
        if (!study) {
            throw new Error(`Study with id ${studyId} not found`);
        }
        // Fetch existing themes
        const existingThemes = yield prisma.theme.findMany({
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
        const responseIds = [];
        const sentenceMetadata = [];
        const responsesSentences = [];
        responses.forEach((response) => {
            try {
                if (!isTranscriptionBody(response.transcriptionBody)) {
                    throw new Error('Invalid transcriptionBody structure');
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
            }
            catch (error) {
                logEntry('ERROR', `Error processing transcriptionBody`, {
                    responseId: response.id,
                    error: error.message,
                    transcriptionBody: JSON.stringify(response.transcriptionBody)
                });
            }
        });
        // Add these log statements
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
        // Generate LLM prompt
        // TODO: add num_failed to jobs and stop retrying after a limit
        // TODO (maybe): also include concatenated sentences with each reponse to make easier to parse for LLM
        const prompt = prompts_1.ChatPromptTemplate.fromTemplate(`
      You are an expert in qualitative research. I am giving you a list of transcribed responses to a question from a qualitative interview administered to a group of people.
      You are to help a market researcher understand the responses better by identifying key insights across the responses. 
      I've also included a list of insights that have already been identified from the rest of the study. 
      You can think of the words "themes" and "insights" interchangeably in my instructions.

      Please analyze the following transcribed responses and see if you can identify responses that support existing insights ("existingThemes"), or if not, if there are any new
      insights ("newThemes") that should be identified. Each insight should be a concise statement, ideally 6-7 words or less, that captures a key finding or observation in the responses.
      Please also include citations for each insight, where each citation is a quote from the responses that supports the insight. Keep in mind that these quotes can be multiple sentences- don't feel the need to force a quote to be a single sentence.

      The question being responded to is:
      "{questionText}"

      The format of the responses is a 2D array where each inner array represents an entire response, and each entry within the inner array represents a sentence of that response. The list of transcribed responses and their sentences are:
      {responsesSentences}

      The existing insights identified from the rest of the study are:
      {existingThemes}

      For citations, please provide the index of the response (remember, each inner array in responseSentences represents a response), the index of the first sentence of the identified quote from that response, and the index of the last sentence of the quote from that response.
      The granularity of the responses I am giving you is at the sentence level, so sometimes a quote you pick out may contain some extra words that don't actually support the insight but are part of the sentence that was quoted. That's okay and expected behavior.

      Try to provide multiple citations for each insight where applicable, but don't force a quote if there isn't enough relevant information to support it being part of an insight.

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

      Please analyze the provided responses and identify both existing insights and new insights with their respective citations. Remember to keep new insight names concise, ideally 5-6 words or less.
    `);
        const chain = runnables_1.RunnableSequence.from([prompt, model]);
        logEntry('INFO', 'Invoking LLM chain', {
            prompt: prompt.toString(),
            questionText: questionWithFollowUps.title,
            responseSentences: JSON.stringify(responsesSentences),
            existingThemes: JSON.stringify(themeData)
        });
        const response = yield chain.invoke({
            questionText: questionWithFollowUps.title,
            responsesSentences: JSON.stringify(responsesSentences),
            existingThemes: JSON.stringify(themeData)
        });
        logEntry('INFO', 'Received response from LLM', {
            llmResponse: JSON.stringify(response, null, 2)
        });
        // Process LLM output
        const llmResult = response;
        // Convert LLM output to ThemeAnalysisResult
        const analysisResult = {
            existingThemes: llmResult.existingThemes.map(theme => ({
                id: theme.id,
                citations: theme.citations.map(citation => {
                    var _a;
                    const responseIndex = citation.responseIndex;
                    const startSentenceIndex = citation.startSentenceIndex;
                    const endSentenceIndex = citation.endSentenceIndex;
                    // Add this check and log
                    if (!sentenceMetadata[responseIndex] || !sentenceMetadata[responseIndex][startSentenceIndex]) {
                        logEntry('ERROR', 'Invalid sentence metadata access', {
                            responseIndex,
                            startSentenceIndex,
                            endSentenceIndex,
                            sentenceMetadataLength: sentenceMetadata.length,
                            responseMetadataLength: (_a = sentenceMetadata[responseIndex]) === null || _a === void 0 ? void 0 : _a.length
                        });
                        return null; // or some default value
                    }
                    return {
                        responseId: responseIds[responseIndex],
                        text: responsesSentences[responseIndex].slice(startSentenceIndex, endSentenceIndex + 1).join(' '),
                        start_word_index: sentenceMetadata[responseIndex][startSentenceIndex].start_word_index,
                        end_word_index: sentenceMetadata[responseIndex][endSentenceIndex].end_word_index,
                        start_time: sentenceMetadata[responseIndex][startSentenceIndex].start_time,
                        end_time: sentenceMetadata[responseIndex][endSentenceIndex].end_time,
                    };
                }).filter(citation => citation !== null),
            })),
            newThemes: llmResult.newThemes.map(theme => ({
                name: theme.name,
                description: theme.description,
                citations: theme.citations.map(citation => {
                    var _a;
                    const responseIndex = citation.responseIndex;
                    const startSentenceIndex = citation.startSentenceIndex;
                    const endSentenceIndex = citation.endSentenceIndex;
                    // Add this check and log
                    if (!sentenceMetadata[responseIndex] || !sentenceMetadata[responseIndex][startSentenceIndex]) {
                        logEntry('ERROR', 'Invalid sentence metadata access', {
                            responseIndex,
                            startSentenceIndex,
                            endSentenceIndex,
                            sentenceMetadataLength: sentenceMetadata.length,
                            responseMetadataLength: (_a = sentenceMetadata[responseIndex]) === null || _a === void 0 ? void 0 : _a.length
                        });
                        return null; // or some default value
                    }
                    return {
                        responseId: responseIds[responseIndex],
                        text: responsesSentences[responseIndex].slice(startSentenceIndex, endSentenceIndex + 1).join(' '),
                        start_word_index: sentenceMetadata[responseIndex][startSentenceIndex].start_word_index,
                        end_word_index: sentenceMetadata[responseIndex][endSentenceIndex].end_word_index,
                        start_time: sentenceMetadata[responseIndex][startSentenceIndex].start_time,
                        end_time: sentenceMetadata[responseIndex][endSentenceIndex].end_time,
                    };
                }).filter(citation => citation !== null),
            })),
        };
        logEntry('INFO', 'Updating database based on analysis results');
        // Update database based on analysis results
        yield updateDatabase(analysisResult, questionId, studyId, (_a = study.organization.primaryColor) !== null && _a !== void 0 ? _a : "#F0F2F3", (_b = study.organization.secondaryColor) !== null && _b !== void 0 ? _b : "#64748B", existingColors);
        // Delete job rows instead of marking them as complete
        yield prisma.questionThemeAnalysisJob.deleteMany({
            where: {
                id: {
                    in: batch.map(job => job.id)
                }
            }
        });
        logEntry('INFO', 'Batch processing completed successfully');
        res.status(200).send('Batch processing completed successfully');
    }
    catch (error) {
        logEntry('ERROR', 'Error in questionThemeAnalysisForBatch', {
            error: error.message,
            stack: error.stack
        });
        // If we have a batch, update the job statuses to FAILED
        if (batch) {
            try {
                yield prisma.questionThemeAnalysisJob.updateMany({
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
            }
            catch (updateError) {
                logEntry('ERROR', 'Error updating job statuses to FAILED', {
                    error: updateError.message
                });
            }
        }
        res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    finally {
        yield prisma.$disconnect();
        logEntry('INFO', 'Disconnected from Prisma');
    }
});
exports.questionThemeAnalysisForBatch = questionThemeAnalysisForBatch;
function updateDatabase(result, questionId, studyId, primaryColor, secondaryColor, existingColors) {
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
            const newColor = generateHarmoniousColor(primaryColor, secondaryColor, existingColors);
            existingColors.push(newColor);
            const theme = yield prisma.theme.create({
                data: {
                    name: newTheme.name,
                    description: newTheme.description,
                    studyId: studyId,
                    tagColor: newColor
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
