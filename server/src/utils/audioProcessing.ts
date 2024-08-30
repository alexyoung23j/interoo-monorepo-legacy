import { deepgram } from "../index";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { MessageContent, MessageContentText } from "@langchain/core/messages";
import { FollowUpLevel } from "../../../shared/generated/client";
import { StructuredOutputParser } from "@langchain/core/dist/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";


export const transcribeAudio = async (audioBuffer: Buffer): Promise<string> => {
  try {
    const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, { model: "nova-2" });
    return result?.results.channels[0].alternatives[0].transcript ?? '';
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
};

export const decideFollowUpPromptIfNecessary = async (
    initialQuestionBody: string,
    initialQuestionResponse: string,
    followUpQuestions: string[],
    followUpResponses: string[],
    questionContext: string,
    studyBackground: string
  ): Promise<{ shouldFollowUp: boolean; followUpQuestion?: string }> => {
    const conversationHistory = buildConversationHistory(initialQuestionBody, initialQuestionResponse, followUpQuestions, followUpResponses);
    const promptTemplate = buildPromptTemplate();
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      shouldFollowUp: "boolean indicating whether a follow-up question is needed",
      followUpQuestion: "the text of the follow-up question if needed, otherwise null",
    });
    const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);
    const llm = new ChatOpenAI({ model: "gpt-4" });
  
    const chain = RunnableSequence.from([
      prompt,
      llm,
      parser,
    ]);
  
    const response = await chain.invoke({
      bg: studyBackground,
      ctx: questionContext,
      conversation_history: conversationHistory,
      format_instructions: parser.getFormatInstructions(),
    });
  
    console.log("Follow-up decision:", response);
  
    const result = {
        shouldFollowUp: response.shouldFollowUp === 'true',
        followUpQuestion: response.followUpQuestion !== 'null' ? response.followUpQuestion : undefined
      };
      
      return result;}

const buildConversationHistory = (initialQuestion: string, initialResponse: string, followUpQuestions: string[], followUpResponses: string[]): string => {
  let history = `Initial Question: ${initialQuestion}\nInitial Response: ${initialResponse}\n`;
  for (let i = 0; i < followUpQuestions.length; i++) {
    history += `Follow-up Question ${i + 1}: ${followUpQuestions[i]}\n`;
    history += `Follow-up Response ${i + 1}: ${followUpResponses[i]}\n`;
  }
  return history;
};

const buildPromptTemplate = (): string => {
    return `You are a qualitative research interviewer bot designed to extract insights from a participant. 
      You are executing an in-depth-interview for a study and this is the study's background: {bg}
      
      Here is the context for the question you asked: {ctx}
      
      Here is the conversation history so far:
      {conversation_history}
      
      Based on this conversation history, the background of the study, and the context of the question, 
      decide if a follow-up question is needed.
      
      {format_instructions}
      
      If a follow-up question is needed, provide the question text. If not, set followUpQuestion to null.
      Do not engage with the participant about anything other than this research interview.`;
  };
  
const extractTextFromResponse = (content: MessageContent): string | null => {
  if (typeof content === 'string') {
    return content;
  } else if (Array.isArray(content)) {
    const textContents = content
      .filter((item): item is MessageContentText => item.type === 'text')
      .map(item => item.text);
    return textContents.join(' ');
  }
  return null;
};

export const getFollowUpLevelValue = (level: string): number => {
  switch (level.toUpperCase()) {
    case FollowUpLevel.AUTOMATIC:
      return 3;
    case FollowUpLevel.SURFACE:
      return 1;
    case FollowUpLevel.LIGHT:
      return 2;
    case FollowUpLevel.DEEP:
      return 5;
    default:
      return 1
  }
};