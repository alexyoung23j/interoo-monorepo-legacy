const functions = require('@google-cloud/functions-framework');
const { createClient } = require('@supabase/supabase-js');
const { ChatOpenAI } = require("@langchain/openai");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { RunnableSequence } = require("@langchain/core/runnables");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
});

// Helper function for structured logging
function logEntry(severity, message, additionalFields = {}) {
  const entry = Object.assign(
    {
      severity: severity,
      message: message,
    },
    additionalFields
  );
  console.log(JSON.stringify(entry));
}

functions.http('summarizeInterview', async (req, res) => {
  logEntry('INFO', 'Function started', { requestBody: req.body });
  try {
    const { interviewSessionId } = req.body;

    if (!interviewSessionId) {
      logEntry('ERROR', 'Missing interviewSessionId');
      return res.status(400).send('Missing interviewSessionId');
    }

    logEntry('INFO', `Fetching interview session data`, { interviewSessionId });
    // Fetch interview session data
    const { data: interviewSession, error: sessionError } = await supabase
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
    const { data: responses, error: responsesError } = await supabase
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
    logEntry('INFO', `Fetched responses`, { count: responses.length });

    logEntry('INFO', 'Building interview overview');
    // Build interview overview
    const interviewOverview = buildInterviewOverview(responses);
    logEntry('INFO', 'Interview overview built successfully', { interviewOverview });

    logEntry('INFO', 'Generating summary using GPT-4');
    // Generate summary using GPT-4
    const summary = await generateSummary(interviewOverview);
    logEntry('INFO', 'Summary generated successfully', { summary });

    logEntry('INFO', 'Updating InterviewSession with summary');
    // Update InterviewSession with summary
    const { error: updateError } = await supabase
      .from('InterviewSession')
      .update({ summary })
      .eq('id', interviewSessionId);

    if (updateError) {
      logEntry('ERROR', 'Error updating InterviewSession', { error: updateError });
      throw updateError;
    }
    logEntry('INFO', 'InterviewSession updated successfully');

    res.status(200).send({ message: 'Interview summarized successfully', summary });
  } catch (error) {
    logEntry('ERROR', 'Error occurred while summarizing the interview', { error: error.message });
    res.status(500).send(`An error occurred while summarizing the interview: ${error.message}`);
  }
});

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
      } else {
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

async function generateSummary(interviewOverview) {
  logEntry('DEBUG', 'Generating summary', { interviewOverview });
  
  const prompt = ChatPromptTemplate.fromTemplate(`Please summarize the following interview, focusing on the participant's responses. The interview is formatted as a series of questions and responses, including follow-up questions where applicable.

{interviewOverview}

Provide a concise summary that captures the key points and insights from the participant's responses. Focus on the main themes, notable opinions, and any patterns or trends in the responses.`);

  const chain = RunnableSequence.from([prompt, model]);

  logEntry('DEBUG', 'Calling GPT-4 model');
  const response = await chain.invoke({ interviewOverview });
  logEntry('DEBUG', 'Summary generated successfully');
  return response.content;
}