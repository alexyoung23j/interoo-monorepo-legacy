import { deepgram } from "../index";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { MessageContent, MessageContentText } from "@langchain/core/messages";
import { FollowUpLevel } from "../../../shared/generated/client";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ConversationState, TranscribeAndGenerateNextQuestionRequest } from "../../../shared/types";

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
    requestData: TranscribeAndGenerateNextQuestionRequest,
    transcribedText: string
  ): Promise<{ shouldFollowUp: boolean; followUpQuestion?: string }> => {
    const startTime = Date.now();

    const conversationHistory = buildConversationHistory(requestData.thread, transcribedText);
    const promptTemplate = buildPromptTemplate();
    const parser = StructuredOutputParser.fromNamesAndDescriptions({
      shouldFollowUp: "boolean indicating whether a follow-up question is needed, true or false",
      followUpQuestion: "the text of the follow-up question if needed, otherwise null",
    });
    const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);
    const llm = new ChatOpenAI({ model: "gpt-4o" }).bind({
      response_format: {
        type: "json_object",
      },
    });
  
    const chain = RunnableSequence.from([
      prompt,
      llm,
      parser,
    ]);
  
    const chainStartTime = Date.now();
    const response = await chain.invoke({
      bg: requestData.studyBackground,
      ctx: requestData.currentBaseQuestionContext,
      conversation_history: conversationHistory,
      format_instructions: parser.getFormatInstructions(),
    });
    const chainEndTime = Date.now();
    console.log(`Chain execution time: ${chainEndTime - chainStartTime}ms`);
    
    let parsedResponse;
    const parseStartTime = Date.now();
    try {
      parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      return { shouldFollowUp: false };
    }
    const parseEndTime = Date.now();
    console.log(`Parsing time: ${parseEndTime - parseStartTime}ms`);

    const result = {
      shouldFollowUp: parsedResponse.shouldFollowUp === true || parsedResponse.shouldFollowUp === 'true',
      followUpQuestion: parsedResponse.followUpQuestion !== null ? parsedResponse.followUpQuestion : undefined
    };

    const endTime = Date.now();
    console.log(`Total execution time: ${endTime - startTime}ms`);

    return result;
}

const buildConversationHistory = (thread: ConversationState, transcribedText: string): string => {
  let history = '';
  for (const item of thread) {
    if (item.responseText) {
      history += `Response: ${item.responseText}\n`;
    } else {
      history += `Question: ${item.questionText}\n`;
    }
  }
  // Add the latest transcribed response
  if (thread.length > 0) {
    history += `Response: ${transcribedText}\n`;
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
      Do not engage with the participant about anything other than this research interview.
      
      You must ALWAYS format in valid JSON as described above. Output this and NOTHING ELSE. `;
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