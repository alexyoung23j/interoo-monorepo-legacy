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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeInterview = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = require("@langchain/openai");
const prompts_1 = require("@langchain/core/prompts");
const runnables_1 = require("@langchain/core/runnables");
// Initialize Supabase client
const supabaseUrl = (_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '';
const supabaseKey = (_b = process.env.SUPABASE_KEY) !== null && _b !== void 0 ? _b : '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
const model = new openai_1.ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
});
// Helper function for structured logging
function logEntry(severity, message, additionalFields = {}) {
    const entry = Object.assign({ severity,
        message }, additionalFields);
    console.log(JSON.stringify(entry));
}
const summarizeInterview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    logEntry('INFO', 'Function started', { requestBody: req.body });
    try {
        const { interviewSessionId } = req.body;
        if (!interviewSessionId) {
            logEntry('ERROR', 'Missing interviewSessionId');
            return res.status(400).send('Missing interviewSessionId');
        }
        logEntry('INFO', `Fetching interview session data`, { interviewSessionId });
        // Fetch interview session data
        const { data: interviewSession, error: sessionError } = yield supabase
            .from('InterviewSession')
            .select('*')
            .eq('id', interviewSessionId)
            .single();
        if (sessionError) {
            logEntry('ERROR', 'Error fetching interview session', { error: sessionError });
            throw sessionError;
        }
        logEntry('INFO', 'Interview session data fetched successfully');
        logEntry('INFO', 'Fetching responses with related questions and follow-up questions');
        // Fetch responses with related questions and follow-up questions
        const { data: responses, error: responsesError } = yield supabase
            .from('Response')
            .select(`
        *,
        question:Question(*, followUpQuestions:FollowUpQuestion(*)),
        followUpQuestion:FollowUpQuestion(*)
      `)
            .eq('interviewSessionId', interviewSessionId)
            .order('question(questionOrder)', { ascending: true })
            .order('followUpQuestion(followUpQuestionOrder)', { ascending: true });
        if (responsesError) {
            logEntry('ERROR', 'Error fetching responses', { error: responsesError });
            throw responsesError;
        }
        logEntry('INFO', `Fetched responses`, { count: (_a = responses === null || responses === void 0 ? void 0 : responses.length) !== null && _a !== void 0 ? _a : 0 });
        if (!responses) {
            throw new Error('No responses found');
        }
        logEntry('INFO', 'Building interview overview');
        // Build interview overview
        const interviewOverview = buildInterviewOverview(responses);
        logEntry('INFO', 'Interview overview built successfully', { interviewOverview });
        logEntry('INFO', 'Generating summary using GPT-4');
        // Generate summary using GPT-4
        const summary = yield generateSummary(interviewOverview);
        logEntry('INFO', 'Summary generated successfully', { summary });
        logEntry('INFO', 'Updating InterviewSession with summary');
        // Update InterviewSession with summary
        const { error: updateError } = yield supabase
            .from('InterviewSession')
            .update({ summary })
            .eq('id', interviewSessionId);
        if (updateError) {
            logEntry('ERROR', 'Error updating InterviewSession', { error: updateError });
            throw updateError;
        }
        logEntry('INFO', 'InterviewSession updated successfully');
        res.status(200).send({ message: 'Interview summarized successfully', summary });
    }
    catch (error) {
        logEntry('ERROR', 'Error occurred while summarizing the interview', { error: error.message });
        res.status(500).send(`An error occurred while summarizing the interview: ${error.message}`);
    }
});
exports.summarizeInterview = summarizeInterview;
function buildInterviewOverview(responses) {
    logEntry('DEBUG', 'Starting to build interview overview', { responseCount: responses.length });
    const overview = [];
    const questionMap = new Map();
    responses.forEach(response => {
        const question = response.question;
        const followUpQuestion = response.followUpQuestion;
        logEntry('DEBUG', 'Processing response', {
            responseId: response.id,
            questionId: response.questionId,
            hasQuestion: !!question,
            hasFollowUpQuestion: !!followUpQuestion,
            responseText: response.fastTranscribedText
        });
        if (question && !questionMap.has(question.id)) {
            questionMap.set(question.id, {
                question: question.title,
                responses: [],
                followUps: []
            });
            overview.push(questionMap.get(question.id));
        }
        const questionEntry = questionMap.get(response.questionId);
        if (questionEntry) {
            if (followUpQuestion) {
                questionEntry.followUps.push({
                    question: followUpQuestion.title,
                    response: response.fastTranscribedText
                });
                logEntry('DEBUG', 'Added follow-up question', {
                    questionId: response.questionId,
                    followUpQuestionTitle: followUpQuestion.title,
                    followUpResponseText: response.fastTranscribedText
                });
            }
            else {
                questionEntry.responses.push(response.fastTranscribedText);
                logEntry('DEBUG', 'Added response', {
                    questionId: response.questionId,
                    responseText: response.fastTranscribedText
                });
            }
        }
    });
    logEntry('DEBUG', 'Interview overview built successfully', {
        overviewLength: overview.length,
        totalQuestions: questionMap.size,
        totalResponses: overview.reduce((sum, q) => sum + q.responses.length, 0),
        totalFollowUps: overview.reduce((sum, q) => sum + q.followUps.length, 0)
    });
    return overview.map(entry => formatQuestionThread(entry)).join('\n\n');
}
function formatQuestionThread(entry) {
    let thread = `<Question>\n${entry.question}\n</Question>\n\n`;
    entry.responses.forEach(response => {
        if (response && response.trim() !== "") {
            thread += `<Response>\n${response}\n</Response>\n\n`;
        }
    });
    entry.followUps.forEach(followUp => {
        thread += `<Follow-up Question>\n${followUp.question}\n</Follow-up Question>\n\n`;
        if (followUp.response && followUp.response.trim() !== "") {
            thread += `<Follow-up Response>\n${followUp.response}\n</Follow-up Response>\n\n`;
        }
    });
    return thread.trim();
}
function extractTextContent(content) {
    if (typeof content === 'string')
        return content;
    return content.map(item => {
        if (typeof item === 'string')
            return item;
        if ('text' in item)
            return item.text;
        return JSON.stringify(item);
    }).join(' ');
}
function generateSummary(interviewOverview) {
    return __awaiter(this, void 0, void 0, function* () {
        logEntry('DEBUG', 'Generating summary', { interviewOverview });
        const prompt = prompts_1.ChatPromptTemplate.fromTemplate(`Please summarize the following interview, focusing on the participant's responses. The interview is formatted as a series of questions and responses, including follow-up questions where applicable.

{interviewOverview}

Provide a summary in the following format:

1. A short preamble (1-2 sentences) introducing the overall context of the interview.
2. A list of 3-15 bullet points capturing key insights, notable opinions, and main themes from the participant's responses. Each bullet point should start with "- " (hyphen followed by a space).
3. A brief conclusion (1-2 sentences) summarizing the most important takeaways.

Format your response as follows:
- The preamble should be a single paragraph.
- Each bullet point should be on a new line, starting with "- ".
- The conclusion should be a single paragraph on a new line after the bullet points.

Ensure that each section (preamble, bullet points, and conclusion) is separated by a single blank line.

Example format:
Preamble text here...

- Bullet point 1
- Bullet point 2
- Bullet point 3

Conclusion text here...`);
        const chain = runnables_1.RunnableSequence.from([prompt, model]);
        logEntry('DEBUG', 'Calling GPT-4o model');
        const response = yield chain.invoke({ interviewOverview });
        logEntry('DEBUG', 'Summary generated successfully');
        return extractTextContent(response.content);
    });
}
