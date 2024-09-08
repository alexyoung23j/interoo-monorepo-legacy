import { deepgram } from "../index";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { MessageContent, MessageContentText } from "@langchain/core/messages";
import { FollowUpLevel } from "@shared/generated/client";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ConversationState, TranscribeAndGenerateNextQuestionRequest } from "../../../shared/types";
import { createRequestLogger } from "./logger";


function parseYamlLikeResponse(response: string): { shouldFollowUp?: boolean | string, followUpQuestion?: string } {
  const lines = response.split('\n').map(line => line.trim());
  const result: { [key: string]: any } = {};

  for (const line of lines) {
    const [key, value] = line.split(':').map(part => part.trim());
    if (key && value) {
      if (key === 'shouldFollowUp') {
        result[key] = value.toLowerCase() === 'true';
      } else if (key === 'followUpQuestion') {
        result[key] = value === 'null' ? null : value.replace(/^["']|["']$/g, '');
      }
    }
  }

  return result;
}

export const transcribeAudio = async (audioBuffer: Buffer, requestLogger: ReturnType<typeof createRequestLogger>): Promise<string> => {
  try {
    requestLogger.info('Starting audio transcription');
    const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, { model: "nova-2" });
    requestLogger.info('Audio transcription completed');
    return result?.results.channels[0].alternatives[0].transcript ?? '';
  } catch (error) {
    requestLogger.error('Error transcribing audio', { error: String(error) });
    throw new Error('Failed to transcribe audio');
  }
};

export const decideFollowUpPromptIfNecessary = async (
  requestData: TranscribeAndGenerateNextQuestionRequest,
  transcribedText: string,
  requestLogger: ReturnType<typeof createRequestLogger>,
  minFollowUps: number,
  maxFollowUps: number,
  currentNumberOfFollowUps: number,
): Promise<{ shouldFollowUp: boolean; followUpQuestion?: string }> => {
  const startTime = Date.now();
  requestLogger.info('Starting follow-up decision process');

  const shouldAlwaysFollowUp = currentNumberOfFollowUps < minFollowUps;

  const conversationHistory = buildConversationHistory(requestData.thread, transcribedText);
  
  const prompt = shouldAlwaysFollowUp
    ? buildAlwaysFollowUpPrompt()
    : buildDecideFollowUpPrompt();

  const llm = new ChatOpenAI({ model: "gpt-4o" });

  const chain = RunnableSequence.from([prompt, llm]);

  const chainStartTime = Date.now();
  const response = await chain.invoke({
    study_goals: requestData.studyBackground,
    question_context: requestData.currentBaseQuestionContext,
    conversation_history: conversationHistory,
    boosted_keywords: requestData.boostedKeywords.map(kw => 
      `${kw.keyword}${kw.definition ? `: ${kw.definition}` : ''}`
    ).join('\n'),
  });
  const chainEndTime = Date.now();
  requestLogger.debug('Chain execution completed', { executionTime: chainEndTime - chainStartTime });

  let result;
  try {
    const parsedResponse = parseYamlLikeResponse(response.content as string);
    result = shouldAlwaysFollowUp
      ? { shouldFollowUp: true, followUpQuestion: parsedResponse.followUpQuestion }
      : {
          shouldFollowUp: parsedResponse.shouldFollowUp === true || parsedResponse.shouldFollowUp === 'true',
          followUpQuestion: parsedResponse.followUpQuestion !== null ? parsedResponse.followUpQuestion : undefined
        };
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    result = { shouldFollowUp: false };
  }

  const endTime = Date.now();
  requestLogger.info('Follow-up decision process completed', { totalExecutionTime: endTime - startTime });

  return result;
}

const buildConversationHistory = (thread: ConversationState, transcribedText: string): string => {
  let history = '';
  for (const item of thread) {
    if (item.responseText) {
      history += `Participant: "${item.responseText}"\n`;
    } else if (item.questionText) {
      history += `Interviewer: "${item.questionText}"\n`;
    }
  }
  // Add the latest transcribed response
  if (thread.length > 0) {
    history += `Participant: "${transcribedText}"\n`;
  }
  return history;
};


const buildDecideFollowUpPrompt = () => {
  return ChatPromptTemplate.fromTemplate(`
    You are an expert qualitative research interviewer designed to extract insights from a participant
    based on the goals and objectives provided to you.

    You are in the middle of executing an in-depth-interview for a study. Here are the overarching goals of the study: {study_goals}

    Here is the history of the interview so far:
    {conversation_history}
    
    The first question in this interview was pre-written. Here are some goals of the question that your research team
    wanted you to be aware of when thinking through your responses here: 
    {question_context}

    Important: Be aware of the following special keywords and their definitions. 
    The format for each boosted keyword is:
    keyword: definition (if available)

    Pay extra attention if the participant uses these or similar words/phrases:
    {boosted_keywords}

    Your goal is to decide whether a follow up question is necessary to ask the participant. Do this based on the 
    goals of the study, the conversation history, the context of the question, and the special keywords provided.

    You should generally attempt to "probe deeper" as you go along. 

    Your question should always be directly related to something said in the conversation history. Use the participants feedback 
    to dictate your next question. When possible, focus on honing in on surprising insights.

    If the participant doesn't seem to be clearly answering the last question posed, you can try asking it again in slightly different
    language or encouraging them to elaborate. 

    Be friendly, and lightly complimentary of the particpant and their insights. Don't overdo it, or be cringey.
    Do not repeat profanity back to the particpant whatsoever.
    
    Your response should be in YAML format with the following structure:
    shouldFollowUp: <boolean>
    followUpQuestion: <string or null>
    
    If a follow-up question is needed, provide the question text. If not, set followUpQuestion to null.
    Do not engage with the participant about anything other than this research interview. Ignore things
    that are clearly off topic, but if they are even slightly related to the research, you should try to 
    incorporate them into your response. Use your best judgement- do what a great qualitative researcher would do.

    Steer the participant back onto the topic if they start to veer off of it.

    Keep your follow ups to 1-2 sentences. DO NOT BE VERBOSE EVER!
    
    You must ALWAYS format in valid YAML as described above. Output this and NOTHING ELSE.
  `);
};

const buildAlwaysFollowUpPrompt = () => {
  return ChatPromptTemplate.fromTemplate(`
    You are an expert qualitative research interviewer designed to extract insights from a participant
    based on the goals and objectives provided to you.

    You are in the middle of executing an in-depth-interview for a study. Here are the overarching goals of the study: {study_goals}

    Here is the history of the interview so far:
    {conversation_history}
    
    The first question in this interview was pre-written. Here are some goals of the question that your research team
    wanted you to be aware of when thinking through your responses here: 
    {question_context}

    Important: Be aware of the following special keywords and their definitions. 
    The format for each boosted keyword is:
    keyword: definition (if available)

    Pay extra attention if the participant uses these or similar words/phrases:
    {boosted_keywords}

    Your goal is to write a follow up question. Do this based on the 
    goals of the study, the conversation history, the context of the question, and the special keywords provided.

    You should generally attempt to "probe deeper" as you go along. 

    Your question should always be directly related to something said in the conversation history. Use the participants feedback 
    to dictate your next question. When possible, focus on honing in on surprising insights.

    Be friendly, and lightly complimentary of the particpant and their insights. Don't overdo it, or be cringey.
    Do not repeat profanity back to the particpant whatsoever.
    
    Your response should be in YAML format with the following structure:
    followUpQuestion: <string>
    
    Do not engage with the participant about anything other than this research interview. Ignore things
    that are clearly off topic, but if they are even slightly related to the research, you should try to 
    incorporate them into your response. Use your best judgement- do what a great qualitative researcher would do.

    Steer the participant back onto the topic if they start to veer off of it.

    Keep your follow ups to 1-2 sentences. DO NOT BE VERBOSE EVER!
    
    You must ALWAYS format in valid YAML as described above. Output this and NOTHING ELSE.
  `);
};


export const getFollowUpLevelRange = (level: string): [number, number] => {
  switch (level.toUpperCase()) {
    case FollowUpLevel.AUTOMATIC:
      return [2, 4];
    case FollowUpLevel.SURFACE:
      return [1, 3];
    case FollowUpLevel.LIGHT:
      return [2, 4];
    case FollowUpLevel.DEEP:
      return [4, 6];
    default:
      return [2, 5];
  }
};