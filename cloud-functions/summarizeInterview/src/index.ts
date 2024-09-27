import { HttpFunction } from '@google-cloud/functions-framework';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { MessageContent } from '@langchain/core/messages';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_KEY ?? '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
});

// Helper function for structured logging
function logEntry(severity: string, message: string, additionalFields: Record<string, any> = {}): void {
  const entry = {
    severity,
    message,
    ...additionalFields
  };
  console.log(JSON.stringify(entry));
}

interface InterviewSession {
  id: string;
  summary?: string;
}

interface Question {
  id: string;
  title: string;
  questionOrder: number;
  followUpQuestions: FollowUpQuestion[];
}

interface FollowUpQuestion {
  id: string;
  title: string;
  followUpQuestionOrder: number;
}

interface Response {
  id: string;
  interviewSessionId: string;
  questionId: string;
  fastTranscribedText: string;
  question: Question;
  followUpQuestion: FollowUpQuestion | null;
}

interface QuestionEntry {
  question: string;
  responses: string[];
  followUps: {
    question: string;
    response: string;
  }[];
}

const summarizeInterview: HttpFunction = async (req, res) => {
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
    logEntry('INFO', `Fetched responses`, { count: responses?.length ?? 0 });

    if (!responses) {
      throw new Error('No responses found');
    }

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
    logEntry('ERROR', 'Error occurred while summarizing the interview', { error: (error as Error).message });
    res.status(500).send(`An error occurred while summarizing the interview: ${(error as Error).message}`);
  }
};

function buildInterviewOverview(responses: Response[]): string {
  logEntry('DEBUG', 'Starting to build interview overview', { responseCount: responses.length });
  const overview: QuestionEntry[] = [];
  const questionMap = new Map<string, QuestionEntry>();

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
      overview.push(questionMap.get(question.id)!);
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

function formatQuestionThread(entry: QuestionEntry): string {
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

function extractTextContent(content: MessageContent): string {
  if (typeof content === 'string') return content;
  return content.map(item => {
    if (typeof item === 'string') return item;
    if ('text' in item) return item.text;
    return JSON.stringify(item);
  }).join(' ');
}

async function generateSummary(interviewOverview: string): Promise<string> {
  logEntry('DEBUG', 'Generating summary', { interviewOverview });
  
  const prompt = ChatPromptTemplate.fromTemplate(`Please summarize the following interview, focusing on the participant's responses. The interview is formatted as a series of questions and responses, including follow-up questions where applicable.

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

  const chain = RunnableSequence.from([prompt, model]);

  logEntry('DEBUG', 'Calling GPT-4o model');
  const response = await chain.invoke({ interviewOverview });
  logEntry('DEBUG', 'Summary generated successfully');
  return extractTextContent(response.content);
}

export { summarizeInterview };