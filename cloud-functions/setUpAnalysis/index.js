"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
const functions = __importStar(require("@google-cloud/functions-framework"));
const google_auth_library_1 = require("google-auth-library");
const axios_1 = __importDefault(require("axios"));
// Create a new GoogleAuth client
const auth = new google_auth_library_1.GoogleAuth();
// The URL of your summarize-interview function
const targetAudience = 'https://us-central1-interoo-dev.cloudfunctions.net/summarize-interview';
const url = targetAudience;
functions.http('setUpAnalysis', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { interviewSessionId } = req.body;
    if (!interviewSessionId) {
        res.status(400).send('Missing interviewSessionId in request body');
        return;
    }
    try {
        // Stub: Setup Supabase tables for future jobs
        console.log(`Setting up Supabase tables for interview session: ${interviewSessionId}`);
        // Your Supabase setup code would go here
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
}));
