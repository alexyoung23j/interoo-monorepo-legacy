import { deepgram } from "../index";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { MessageContent, MessageContentText } from "@langchain/core/messages";
import { BoostedKeyword, FollowUpLevel } from "@shared/generated/client";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { ConversationState, TranscribeAndGenerateNextQuestionRequest } from "../../../shared/types";
import { createRequestLogger } from "./logger";


function parseYamlLikeResponse(response: string): { shouldFollowUp?: boolean | string, followUpQuestion?: string, isOnlyCorrectingOrAskingQuestionBack?: boolean } {
  const lines = response.split('\n').map(line => line.trim());
  const result: { [key: string]: any } = {};

  for (const line of lines) {
    const [key, value] = line.split(':').map(part => part.trim());
    if (key && value) {
      if (key === 'shouldFollowUp' || key === 'isOnlyCorrectingOrAskingQuestionBack') {
        result[key] = value.toLowerCase() === 'true';
      } else if (key === 'followUpQuestion') {
        result[key] = value === 'null' ? null : value.replace(/^["']|["']$/g, '');
      }
    }
  }

  return result;
}

export const transcribeAudio = async (audioBuffer: Buffer, requestLogger: ReturnType<typeof createRequestLogger>, boosted_keywords: BoostedKeyword[]): Promise<string> => {
  try {
    requestLogger.info('Starting audio transcription');
    
    // Map boosted_keywords to a string array
    const keywords = boosted_keywords.map(kw => kw.keyword);
    
    const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, { 
      model: "nova-2", 
      profanity_filter: true, 
      keywords: keywords,
      smart_format: true,
    });

    
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
  wouldBeNextFollowUpNumber: number,
): Promise<{ shouldFollowUp: boolean; followUpQuestion?: string, isJunkResponse: boolean }> => {
  const startTime = Date.now();
  requestLogger.info('Starting follow-up decision process');

  const shouldAlwaysFollowUp = wouldBeNextFollowUpNumber <= minFollowUps;

  const conversationHistory = buildConversationHistory(requestData.thread, transcribedText);
  
  const prompt = shouldAlwaysFollowUp
    ? buildAlwaysFollowUpPrompt()
    : buildDecideFollowUpPrompt();

  const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

  const chain = RunnableSequence.from([prompt, llm]);

  const chainStartTime = Date.now();
  const response = await chain.invoke({
    study_goals: requestData.studyBackground,
    question_context: requestData.currentBaseQuestionContext,
    conversation_history: conversationHistory,
    boosted_keywords: requestData.boostedKeywords.map(kw => 
      `${kw.keyword}${kw.definition ? `: ${kw.definition}` : ''}`
    ).join('\n'),
    latest_response: transcribedText, // Add this line
  });
  const chainEndTime = Date.now();
  requestLogger.debug('Chain execution completed', { executionTime: chainEndTime - chainStartTime });

  let result;
  try {
    const parsedResponse = parseYamlLikeResponse(response.content as string);
    result = shouldAlwaysFollowUp
      ? { shouldFollowUp: true, followUpQuestion: parsedResponse.followUpQuestion, isJunkResponse: parsedResponse.isOnlyCorrectingOrAskingQuestionBack === true }
      : {
          shouldFollowUp: parsedResponse.shouldFollowUp === true || parsedResponse.shouldFollowUp === 'true',
          followUpQuestion: parsedResponse.followUpQuestion !== null ? parsedResponse.followUpQuestion : undefined,
          isJunkResponse: parsedResponse.isOnlyCorrectingOrAskingQuestionBack === true
        };
  } catch (error) {
    console.error('Error parsing LLM response:', error);
    result = { shouldFollowUp: false, isJunkResponse: false };
  }

  const endTime = Date.now();
  requestLogger.info('Follow-up decision process completed', { totalExecutionTime: endTime - startTime });

  return result;
}

const buildConversationHistory = (thread: ConversationState, transcribedText: string): string => {
  let history = '';
  for (const item of thread) {
    if (item.threadItem.type === 'response') {
      history += `Participant: "${item.threadItem.responseText}"\n`;
    } else if (item.threadItem.type === 'question') {
      history += `Interviewer: "${item.threadItem.questionText}"\n`;
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

    Be friendly, but don't overdo it, or be cringey.
    Do not repeat profanity back to the particpant whatsoever.
    
    Your response should be in YAML format with the following structure:
    shouldFollowUp: <boolean>
    followUpQuestion: <string or null>
    isOnlyCorrectingOrAskingQuestionBack: <boolean>
    
    Set isOnlyCorrectingOrAskingQuestionBack to true if the participant's latest response is only correcting a detail in the question 
    or asking a question back to you. Otherwise, set it to false. If you set isOnlyCorrectingOrAskingQuestionBack to true, you should always
    be returning a followUpQuestion and setting shouldFollowUp to true. 

    Examples:
    - "I think you meant to ask about my job, not my hobbies." (isOnlyCorrectingOrAskingQuestionBack: true)
    - "Can you repeat the question?" (isOnlyCorrectingOrAskingQuestionBack: true)
    - "I'm not sure I understand. What do you mean by 'work-life balance'?" (isOnlyCorrectingOrAskingQuestionBack: true)
    - "My work-life balance is pretty good. I usually finish work by 5 PM and have evenings free." (isOnlyCorrectingOrAskingQuestionBack: false)
    - "I don't really have a work-life balance, it's all work for me." (isOnlyCorrectingOrAskingQuestionBack: false)

    The participant's latest response (also reflected in the conversation history) by itself is:
    "{latest_response}"

    If a follow-up question is needed, provide the question text. If not, set followUpQuestion to null.
    Do not engage with the participant about anything other than this research interview. Ignore things
    that are clearly off topic, but if they are even slightly related to the research, you should try to 
    incorporate them into your response. Use your best judgement- do what a great qualitative researcher would do.

    Steer the participant back onto the topic if they start to veer off of it.

    Keep your follow ups to 1-2 sentences. DO NOT BE VERBOSE EVER!
    
    You must ALWAYS format in valid YAML as described above. Output this and NOTHING ELSE. Remember to set a value for all three fields, every time.
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

    Be friendly, but don't overdo it, or be cringey.
    Do not repeat profanity back to the particpant whatsoever.
    
    Your response should be in YAML format with the following structure:
    followUpQuestion: <string>
    isOnlyCorrectingOrAskingQuestionBack: <boolean>
    
    Set isOnlyCorrectingOrAskingQuestionBack to true if the participant's latest response is only correcting a detail in the question 
    or asking a question back to you. Otherwise, set it to false. If you set isOnlyCorrectingOrAskingQuestionBack to true, you should always
    be returning a followUpQuestion and setting shouldFollowUp to true. 

    Examples:
    - "Did you mean to ask about my current job or my previous one?" (isOnlyCorrectingOrAskingQuestionBack: true)
    - "Sorry, I didn't catch that. Could you rephrase?" (isOnlyCorrectingOrAskingQuestionBack: true)
    - "What exactly do you mean by 'company culture'?" (isOnlyCorrectingOrAskingQuestionBack: true)
    - "The company culture here is very collaborative. We have regular team-building activities." (isOnlyCorrectingOrAskingQuestionBack: false)
    - "I don't really pay attention to the company culture, I just focus on my work." (isOnlyCorrectingOrAskingQuestionBack: false)

    The participant's latest response (also reflected in the conversation history) is:
    "{latest_response}"

    Do not engage with the participant about anything other than this research interview. Ignore things
    that are clearly off topic, but if they are even slightly related to the research, you should try to 
    incorporate them into your response. Use your best judgement- do what a great qualitative researcher would do.

    Steer the participant back onto the topic if they start to veer off of it.

    Keep your follow ups to 1-2 sentences. DO NOT BE VERBOSE EVER!
    
    You must ALWAYS format in valid YAML as described above. Output this and NOTHING ELSE. Remember to set a value for all three fields, every time.
  `);
};


export const getFollowUpLevelRange = (level: string): [number, number] => {
  switch (level.toUpperCase()) {
    case FollowUpLevel.AUTOMATIC:
      return [2, 4];
    case FollowUpLevel.SURFACE:
      return [1, 2];
    case FollowUpLevel.LIGHT:
      return [2, 3];
    case FollowUpLevel.DEEP:
      return [3, 5];
    default:
      return [2, 5];
  }
};