// import { PrismaClient, Prisma } from "@shared/generated/client";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// const prisma = new PrismaClient();

const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.7,
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
  const words: Array<{
    word: string;
    start_time: number;
    end_time: number;
    is_sentence_end: boolean;
  }> = [];
  const sentenceObjects: Array<{
    text: string;
    start_word_index: number;
    end_word_index: number;
    start_time: number;
    end_time: number;
    is_paragraph_end: boolean;
  }> = [];

  let wordIndex = 0;
  let currentTime = 0.0;

  sentences.forEach((text, sIndex) => {
    const sentenceWords = text.split(' ');
    const startWordIndex = wordIndex;
    const endWordIndex = wordIndex + sentenceWords.length - 1;

    const sentenceStartTime = currentTime;
    const sentenceEndTime = currentTime + sentenceWords.length * 0.5;

    sentenceWords.forEach((word) => {
      words.push({
        word: word.replace(/[^a-zA-Z]/g, ""),
        start_time: parseFloat(currentTime.toFixed(2)),
        end_time: parseFloat((currentTime + 0.5).toFixed(2)),
        is_sentence_end: false,
      });
      currentTime += 0.5;
    });

    words[endWordIndex].is_sentence_end = true;

    sentenceObjects.push({
      text: text,
      start_word_index: startWordIndex,
      end_word_index: endWordIndex,
      start_time: parseFloat(sentenceStartTime.toFixed(2)),
      end_time: parseFloat(sentenceEndTime.toFixed(2)),
      is_paragraph_end: false,
    });
  });

  const result = {
    transcript: {
      words: words,
      sentences: sentenceObjects,
    },
  };
  console.log('Generated transcription body:', JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const NUM_STUDIES = 1;
  const QUESTIONS_PER_STUDY = 5;
  const FOLLOW_UPS_PER_QUESTION = 2;
  const THEMES_PER_STUDY = 3;

  for (let i = 0; i < NUM_STUDIES; i++) {
    const studyTitle = await generateText("Generate a realistic title for a qualitative research study that a market research firm might conduct for a consumer goods brand:");

    // const organization = await prisma.organization.create({
    //   data: {
    //     name: `Organization ${i + 1}`,
    //     primaryColor: "#587785",
    //     secondaryColor: "#64748B",
    //     logoUrl: `https://via.placeholder.com/150?text=Org+${i + 1}`,
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //   },
    // });

    // const study = await prisma.study.create({
    //   data: {
    //     organizationId: organization.id,
    //     title: studyTitle,
    //     targetLength: 30,
    //     welcomeDescription: "Welcome to the study!",
    //     termsAndConditions: "Please agree to the terms.",
    //     studyBackground: "Study background information.",
    //     maxResponses: 100,
    //     ttsProvider: "GOOGLE",
    //     status: "PUBLISHED",
    //     shortID: Array(8).fill(0).map(() => Math.random().toString(36)[2].toUpperCase()).join(''),
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     reportingLanguage: "ENGLISH",
    //     languages: ["ENGLISH"],
    //     demographicQuestionConfiguration: {
    //       create: {
    //         name: true,
    //         email: true,
    //         phoneNumber: false,
    //         createdAt: new Date(),
    //         updatedAt: new Date(),
    //       },
    //     },
    //   },
    // });

    // Create initial themes for the study
    for (let t = 0; t < THEMES_PER_STUDY; t++) {
      const themeName = await generateText(`Generate a realistic theme name related to the study "${studyTitle}". The theme should be a short, key insight from the responses of the qualitative research study, ideally less than 5 words:`);
      const themeDescription = await generateText(`Provide a brief, realistic description for the theme "${themeName}" in the context of the study "${studyTitle}". The description should explain the theme's significance and how it relates to the study's objectives:`);
      console.log(`Generated theme: ${themeName}\nDescription: ${themeDescription}`);

    //   await prisma.theme.create({
    //     data: {
    //       name: themeName,
    //       description: themeDescription,
    //       studyId: study.id,
    //       tagColor: `#${Math.floor(Math.random()*16777215).toString(16)}`, // Random color
    //     },
    //   });
    }

    // const interviewSession = await prisma.interviewSession.create({
    //   data: {
    //     studyId: study.id,
    //     startTime: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
    //     lastUpdatedTime: new Date(),
    //     status: "COMPLETED",
    //     testMode: false,
    //     elapsedTime: Math.floor(Math.random() * 3300) + 300,
    //     summary: "Interview summary.",
    //     pauseIntervals: [],
    //   },
    // });

    for (let q = 0; q < QUESTIONS_PER_STUDY; q++) {
      const questionText = await generateText(`Create a realistic interview question for the qualitative research study titled "${studyTitle}":`);
      const questionContext = await generateText(`Provide context for the question: "${questionText}". Context should be a couple of sentences long and describe the purpose of the question in the study/what information the interviewer is looking for.`);
      console.log(`Generated question: ${questionText}\nContext: ${questionContext}`);

    //   const question = await prisma.question.create({
    //     data: {
    //       title: questionText,
    //       context: questionContext,
    //       shouldFollowUp: true,
    //       followUpLevel: "AUTOMATIC",
    //       body: "Please provide a detailed response.",
    //       studyId: study.id,
    //       questionType: "OPEN_ENDED",
    //       questionOrder: q + 1,
    //       hasStimulus: false,
    //       allowMultipleSelections: false,
    //       createdAt: new Date(),
    //       updatedAt: new Date(),
    //     },
    //   });

      // Create response for the main question
      await createResponse("question.id", questionText, "interviewSession.id");

      // Create follow-up questions and their responses
      for (let f = 0; f < FOLLOW_UPS_PER_QUESTION; f++) {
        const followUpText = await generateText(`Create a follow-up question for the main question: "${questionText}":`);
        console.log(`Generated follow-up question: ${followUpText}`);

        // const followUpQuestion = await prisma.followUpQuestion.create({
        //   data: {
        //     title: followUpText,
        //     body: "Please elaborate further.",
        //     followUpQuestionOrder: f + 1,
        //     questionType: "OPEN_ENDED",
        //     parentQuestionId: question.id,
        //     interviewSessionId: interviewSession.id,
        //     createdAt: new Date(),
        //     updatedAt: new Date(),
        //   },
        // });

        // Create response for the follow-up question
        await createResponse("followUpQuestion.id", followUpText, "interviewSession.id");
      }
    }
  }

  console.log('Dynamic realistic test data creation complete.');
}

async function createResponse(questionId: string, questionText: string, interviewSessionId: string) {
  const responseText = await generateText(`Provide a realistic interview response to the question: "${questionText}" if this was a response to question in a qualitative research interview. Do not include any periods in your response except when ending a sentence. Respond in a casual tone and feel free to include small grammatical mistakes sparsely throughout; we are trying to simulate what a real person would say.`);
  const sentences = responseText.split('. ').map(sentence => sentence.trim() + '.').filter(sentence => sentence.length > 0);

  const transcriptionBody = generateTranscriptionBody(sentences);
  console.log('Generated transcription body:', JSON.stringify(transcriptionBody, null, 2));

  // await prisma.response.create({
  //   data: {
  //     interviewSessionId: interviewSessionId,
  //     questionId: questionId,
  //     fastTranscribedText: responseText,
  //     transcriptionBody: transcriptionBody,
  //     junkResponse: false,
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //   },
  // });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // await prisma.$disconnect();
  });