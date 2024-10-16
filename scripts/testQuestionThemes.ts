// import { PrismaClient, Prisma } from "@shared/generated/client";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import dotenv from 'dotenv';
import path from 'path';
import { generateThemeAnalysis, ThemeAnalysisResult } from '../cloud-functions/questionThemeAnalysisForBatch/src/index';
import fs from 'fs/promises';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in the environment variables');
}

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  openAIApiKey: OPENAI_API_KEY,
});

async function generateText(prompt: string, maxTokens: number = 100): Promise<string> {
  try {
    const chatPrompt = ChatPromptTemplate.fromMessages([
      ["human", prompt]
    ]);

    const chain = RunnableSequence.from([
      chatPrompt,
      model,
    ]);

    const response = await chain.invoke({});
    
    if (typeof response === 'object' && response !== null && 'content' in response) {
      if (typeof response.content === 'string') {
        return response.content.trim();
      } else if (Array.isArray(response.content)) {
        return response.content
          .map(item => typeof item === 'string' ? item : JSON.stringify(item))
          .join(' ')
          .trim();
      }
    }
    
    // If we can't extract content, stringify the entire response
    return JSON.stringify(response).trim();
  } catch (error) {
    console.error('Error generating text:', error);
    return "";
  }
}

function generateTranscriptionBody(sentences: string[]): any {
  const sentenceObjects: Array<{
    text: string;
    start_word_index: number;
    end_word_index: number;
    start_time: number;
    end_time: number;
    is_paragraph_end: boolean;
  }> = [];

  let totalWordIndex = 0;
  let currentTime = 0.0;

  sentences.forEach((text, sIndex) => {
    const sentenceWords = text.split(' ');
    const startWordIndex = totalWordIndex;
    const endWordIndex = totalWordIndex + sentenceWords.length - 1;

    const sentenceStartTime = currentTime;
    const sentenceEndTime = currentTime + sentenceWords.length * 0.5;

    sentenceObjects.push({
      text: text,
      start_word_index: startWordIndex,
      end_word_index: endWordIndex,
      start_time: parseFloat(sentenceStartTime.toFixed(2)),
      end_time: parseFloat(sentenceEndTime.toFixed(2)),
      is_paragraph_end: false,
    });

    totalWordIndex += sentenceWords.length;
    currentTime = sentenceEndTime;
  });

  return {
    transcript: {
      sentences: sentenceObjects,
    },
  };
}

async function main() {
  const QUESTIONS_PER_STUDY = 1;
  const FOLLOW_UPS_PER_QUESTION = 2;
  const THEMES_PER_STUDY = 3;
  const INTERVIEW_SESSIONS = 3;

  const studyTitle = await generateText("Generate a realistic title for a qualitative research study that a market research firm might conduct for a consumer goods brand:");
  const studyBackground = await generateText(`Provide a brief background for the study "${studyTitle}". This should explain the purpose and goals of the study:`);

  // Generate questions and themes in a single LLM call
  const promptContent = `
  1. Generate ${QUESTIONS_PER_STUDY} unique and diverse interview questions for the qualitative research study titled "${studyTitle}". Each question should be followed by a brief context explaining its purpose in the study.
  
  2. Generate ${THEMES_PER_STUDY} existing themes for the study. Each theme should be a short, key insight from the responses of the qualitative research study, ideally less than 5 words. Follow each theme with a single-sentence description that summarizes the insight in a few more words.
  
  Format the output as a JSON object with two properties: 'questions' (an array of question objects) and 'themes' (an array of theme objects), for example:
  {{
    "questions": [
      {{
        "text": "What is your favorite brand of coffee?",
        "context": "This question is to understand the coffee preferences of the respondents."
      }},
      {{
        "text": "How often do you buy coffee?",
        "context": "This question is to understand the frequency of coffee purchases among the respondents."
      }}
    ],
    "themes": [
      {{
        "name": "Brand Loyalty Drives Purchases",
        "description": "Consumers tend to stick with familiar coffee brands, indicating strong brand loyalty in the market."
      }},
      {{
        "name": "Price Sensitivity Varies",
        "description": "Different consumer segments show varying levels of price sensitivity when purchasing coffee."
      }}
    ]
  }}
  `;

  const generatedContent = await generateText(promptContent);
  console.log("Raw response:", generatedContent);

  // Remove markdown formatting if present
  const jsonString = generatedContent.replace(/```json\n|\n```|```/g, '').trim();
  console.log("Cleaned JSON string:", jsonString);

  let parsedContent;
  try {
    parsedContent = JSON.parse(jsonString);
    console.log("Parsed content:", parsedContent);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    console.error("Raw response:", generatedContent);
    throw error;
  }

  const questions = parsedContent.questions;
  const existingThemes = parsedContent.themes.map((theme: { name: any; description: any; }, index: any) => ({
    id: `theme_${index}`,
    name: theme.name,
    description: theme.description,
  }));

  const interviewSessions = [];

  // Generate interview sessions
  for (let s = 0; s < INTERVIEW_SESSIONS; s++) {
    const session = [];
    for (const question of questions) {
      const questionChain = [question.text];
      const responseChain = [];

      // Main question response
      const mainResponse = await createResponse(questionChain[0]);
      responseChain.push(mainResponse);

      // Follow-up questions and responses
      for (let f = 0; f < FOLLOW_UPS_PER_QUESTION; f++) {
        const followUpPrompt = `Given the following question and response chain:
          Questions: ${questionChain.join(" | ")}
          Responses: ${responseChain.map(r => r.sentences.join(' ')).join(" | ")}
          Create a follow-up question that builds on the previous responses and digs deeper into the topic:`;
        
        const followUpText = await generateText(followUpPrompt);
        console.log(`Generated follow-up question: ${followUpText}`);

        questionChain.push(followUpText);
        const followUpResponse = await createResponse(followUpText);
        responseChain.push(followUpResponse);
      }

      session.push({ questionChain, responseChain });
    }
    interviewSessions.push(session);
  }

  // Write generated data to file
  const generatedData = {
    studyTitle,
    studyBackground,
    questions,
    existingThemes,
    interviewSessions,
  };
  await fs.writeFile(
    path.join(__dirname, `generated_data.json`),
    JSON.stringify(generatedData, null, 2)
  );

  console.log('Generated data written to file.');

  // Generate theme analysis for each question
  const analysisResults = [];
  for (let q = 0; q < questions.length; q++) {
    const allResponses = interviewSessions.flatMap(session => session[q].responseChain);
    const responseIds = allResponses.map((_, index) => `response_${q}_${index}`);
    const responsesSentences = allResponses.map(r => r.sentences);
    const sentenceMetadata = allResponses.map(r => r.transcriptionBody.transcript.sentences);

    const analysisResult: ThemeAnalysisResult = await generateThemeAnalysis(
      questions[q].text,
      questions[q].context,
      studyBackground,
      responsesSentences,
      existingThemes,
      responseIds,
      sentenceMetadata,
      OPENAI_API_KEY 
    );

    analysisResults.push(analysisResult);
  }

  // Write analysis results to file
  await fs.writeFile(
    path.join(__dirname, `analysis_results.json`),
    JSON.stringify(analysisResults, null, 2)
  );

  console.log('Analysis results written to file.');
}

async function createResponse(questionText: string) {
  const responseText = await generateText(`Provide a realistic interview response to the question: "${questionText}" if this was a response to question in a qualitative research interview. Do not include any periods in your response except when ending a sentence. Respond in a casual tone and feel free to include small grammatical mistakes sparsely throughout; we are trying to simulate what a real person would say.`);
  const sentences = responseText.split('. ').map(sentence => sentence.trim() + '.').filter(sentence => sentence.length > 0);

  return { sentences, transcriptionBody: generateTranscriptionBody(sentences) };
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
