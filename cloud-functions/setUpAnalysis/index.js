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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpAnalysis = void 0;
const client_1 = require("@prisma/client");
const google_auth_library_1 = require("google-auth-library");
const axios_1 = __importDefault(require("axios"));
// Initialize Prisma Client
const prisma = new client_1.PrismaClient();
// Create a new GoogleAuth client
const auth = new google_auth_library_1.GoogleAuth();
// The URL of your summarize-interview function
const targetAudience = `https://us-central1-interoo-${(_a = process.env.PROJECT) !== null && _a !== void 0 ? _a : 'prod'}.cloudfunctions.net/summarizeInterview`;
const url = targetAudience;
const setUpAnalysis = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { interviewSessionId } = req.body;
    if (!interviewSessionId) {
        res.status(400).send('Missing interviewSessionId in request body');
        return;
    }
    try {
        // Fetch the study and questions using Prisma
        const interviewSession = yield prisma.interviewSession.findUnique({
            where: { id: interviewSessionId },
            include: {
                study: {
                    include: {
                        questions: true
                    }
                }
            }
        });
        if (!interviewSession) {
            throw new Error(`Interview session not found: ${interviewSessionId}`);
        }
        const { study } = interviewSession;
        // Create analysis job rows in a single transaction
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            for (const question of study.questions) {
                yield tx.questionThemeAnalysisJob.create({
                    data: {
                        studyId: study.id,
                        questionId: question.id,
                        interviewSessionId: interviewSessionId,
                        status: 'NOT_STARTED',
                    }
                });
                yield tx.questionAttributeAnalysisJob.create({
                    data: {
                        studyId: study.id,
                        questionId: question.id,
                        interviewSessionId: interviewSessionId,
                        status: 'NOT_STARTED',
                    }
                });
            }
        }));
        console.log(`Analysis jobs created for interview session: ${interviewSessionId}`);
        console.info(`Requesting ${url} with target audience ${targetAudience}`);
        const client = yield auth.getIdTokenClient(targetAudience);
        // Get the ID token
        const idToken = yield client.idTokenProvider.fetchIdToken(targetAudience);
        // Call the summarizeInterview function
        const response = yield axios_1.default.post(url, { interviewSessionId }, {
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Response from summarizeInterview:', response.data);
        res.status(200).send(`Interview ${interviewSessionId} setup completed and summary triggered`);
    }
    catch (error) {
        console.error('Error in summarizeInterviewAndSetUpAnalysis:', error);
        if (axios_1.default.isAxiosError(error) && error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        res.status(500).send(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    finally {
        yield prisma.$disconnect();
    }
});
exports.setUpAnalysis = setUpAnalysis;
