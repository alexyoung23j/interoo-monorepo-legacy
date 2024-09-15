import { Router, Request, Response as ExpressResponse } from "express";
import { prisma } from "../index";
import { authMiddleware } from "../middleware/auth";
import * as XLSX from 'xlsx';
import { FollowUpQuestion, InterviewParticipant, InterviewSession, Question, Study, Response } from "@shared/generated/client";

const router = Router();


type QuestionWithResponses = Question & {
  Response: Response[];
  FollowUpQuestion: (FollowUpQuestion & {
    Response: Response[];
  })[];
};

type InterviewWithResponses = InterviewSession & {
  responses: (Response & {
    question: Question;
    followUpQuestion: FollowUpQuestion | null;
  })[];
  participant: InterviewParticipant | null;
};

type StudyWithQuestionsAndInterviews = Study & {
  questions: QuestionWithResponses[];
  interviews: InterviewWithResponses[];
};

type QuestionData = (string | {
  question: QuestionWithResponses | FollowUpQuestion;
  response: Response;
})[];

type InterviewSessionData = {
  lastUpdatedTime: Date | null;
  participantName: string;
  participantEmail: string;
  status: string;
  responseCount: number;
  responses: {
    questionId: string;
    followUpQuestionId: string | null;
    question: Question;
    followUpQuestion: FollowUpQuestion | null;
    responseText: string | null;
  }[];
};

type FetchStudyDataReturn = {
  questionMap: Record<string, QuestionData[]>;
  interviewSessionData: InterviewSessionData[];
};

const fetchStudyData = async (studyId: string): Promise<FetchStudyDataReturn> => {
  const study = await prisma.study.findUnique({
    where: { id: studyId },
    include: {
      questions: {
        include: {
          Response: true,
          FollowUpQuestion: {
            include: {
              Response: true
            }
          }
        }
      },
      interviews: {
        include: {
          responses: {
            include: {
              question: true,
              followUpQuestion: true
            }
          },
          participant: true
        }
      }
    }
  }) as StudyWithQuestionsAndInterviews | null;

  if (!study) {
    throw new Error('Study not found');
  }

  const questionMap = new Map<string, QuestionData[]>();
  const interviewSessionData: InterviewSessionData[] = [];

  // Process questions and responses
  study.questions.forEach(question => {
    const questionData: QuestionData[] = [];
    study.interviews.forEach(interview => {
      const interviewData: QuestionData = [interview.id];
      const mainResponse = interview.responses.find(r => r.question.id === question.id && r.followUpQuestion == null);
      
      if (mainResponse) {
        interviewData.push({
          question,
          response: mainResponse
        });

        // Process follow-up questions and responses
        const followUps = question.FollowUpQuestion.map(followUp => {
            const followUpResponse = interview.responses.find(r => r.followUpQuestion?.id === followUp.id);
            if (!followUpResponse) {
                return undefined;
            }
            return {
                question: followUp, 
                response: followUpResponse
            };
        }).filter((item): item is NonNullable<typeof item> => Boolean(item));
        
        interviewData.push(...followUps);
      }

      questionData.push(interviewData);
    });

    questionMap.set(question.id, questionData);
  });

  // Process interview session data
  study.interviews.forEach(interview => {
    const interviewData: InterviewSessionData = {
      lastUpdatedTime: interview.lastUpdatedTime || null,
      participantName: interview.participant?.name || 'Anonymous',
      participantEmail: interview.participant?.email || 'N/A',
      status: interview.status,
      responseCount: interview.responses.length,
      responses: interview.responses.map(response => ({
        questionId: response.question.id,
        followUpQuestionId: response.followUpQuestion?.id || null,
        question: response.question,
        followUpQuestion: response.followUpQuestion,
        responseText: response.fastTranscribedText,
      }))
    };
    interviewSessionData.push(interviewData);
  });

  return {
    questionMap: Object.fromEntries(questionMap),
    interviewSessionData
  };
};
  

const getFullTranscript = (interview: InterviewSessionData): string => {
    let transcript = '';

    // Sort responses by questionOrder, then by followUpQuestionOrder
    const sortedResponses = [...interview.responses].sort((a, b) => {
        if (a.question.questionOrder !== b.question.questionOrder) {
        return a.question.questionOrder - b.question.questionOrder;
        }
        return (a.followUpQuestion?.followUpQuestionOrder ?? 0) - (b.followUpQuestion?.followUpQuestionOrder ?? 0);
    });

    // Group responses by main question
    const groupedResponses = sortedResponses.reduce((acc, response) => {
        const key = response.questionId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(response);
        return acc;
    }, {} as Record<string, typeof sortedResponses>);

    // Construct transcript
    for (const responses of Object.values(groupedResponses)) {
        const mainResponse = responses.find(r => !r.followUpQuestionId);
        if (!mainResponse) continue;

        transcript += `Question: ${mainResponse.question.title}\n`;
        transcript += `Response: ${mainResponse.responseText || ''}\n\n`;

        // Add follow-up questions and responses (already sorted)
        const followUps = responses.filter(r => r.followUpQuestionId);
        for (const followUp of followUps) {
        transcript += `Follow-up: ${followUp.followUpQuestion?.title}\n`;
        transcript += `Response: ${followUp.responseText || ''}\n\n`;
        }

        transcript += '\n'; // Extra line between question groups
    }

    console.log(transcript);

    return transcript.trim();
};

const getVideoLink = (interview: any) => '';
const getFullThreadTranscript = (interviewData: any) => '';
const getQuestionTranscript = (questionResponse: any) => '';
const getFollowUpTranscript = (followUpResponse: any) => '';

const createExcelFile = (studyData: any) => {
  const workbook = XLSX.utils.book_new();

  // Cover page (blank for now)
  const coverSheet = XLSX.utils.aoa_to_sheet([[]]);
  XLSX.utils.book_append_sheet(workbook, coverSheet, 'Cover');

  // Completed Interviews
  const completedInterviews = studyData.interviewSessionData
    .filter((interview: any) => interview[3] === 'COMPLETED')
    .sort((a: any, b: any) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  const completedInterviewsData = completedInterviews.map((interview: any, index: number) => [
    index + 1,
    interview[1],
    interview[2],
    new Date(interview[0]).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    '', // Duration (blank for now)
    getFullTranscript(interview),
    getVideoLink(interview)
  ]);

  const completedInterviewsSheet = XLSX.utils.aoa_to_sheet([
    ['Interview Number', 'Participant Name', 'Participant Email', 'Date Completed', 'Duration', 'Full Transcript', 'Video Link'],
    ...completedInterviewsData
  ]);
  XLSX.utils.book_append_sheet(workbook, completedInterviewsSheet, 'Completed Interviews');

  // Incomplete Interviews
  const incompleteInterviews = studyData.interviewSessionData
    .filter((interview: any) => interview[3] !== 'COMPLETED')
    .sort((a: any, b: any) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  const incompleteInterviewsData = incompleteInterviews.map((interview: any, index: number) => [
    index + 1,
    interview[1],
    interview[2],
    new Date(interview[0]).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    '', // Duration (blank for now)
    getFullTranscript(interview),
    getVideoLink(interview)
  ]);

  const incompleteInterviewsSheet = XLSX.utils.aoa_to_sheet([
    ['Interview Number', 'Participant Name', 'Participant Email', 'Date Updated', 'Duration', 'Full Transcript', 'Video Link'],
    ...incompleteInterviewsData
  ]);
  XLSX.utils.book_append_sheet(workbook, incompleteInterviewsSheet, 'Incomplete Interviews');

  // Question pages
  Object.entries(studyData.questionMap).forEach(([questionId, questionData]: [string, any], questionIndex: number) => {
    const maxFollowUps = Math.max(...questionData.map((interviewData: any) => interviewData.length - 2));
    
    const headers = ['Interview Number', 'Full Thread Transcript', 'Question Transcript'];
    for (let i = 1; i <= maxFollowUps; i++) {
      headers.push(`Follow Up ${i} Transcript`);
    }

    const questionSheetData = questionData.flatMap((interviewData: any, interviewIndex: number) => {
      const row1 = [
        interviewIndex + 1,
        getFullThreadTranscript(interviewData),
        getQuestionTranscript(interviewData[1])
      ];

      for (let i = 2; i < interviewData.length; i++) {
        row1.push(getFollowUpTranscript(interviewData[i]));
      }

      // Pad with empty cells if needed
      while (row1.length < headers.length) {
        row1.push('');
      }

      const row2 = ['', '', getVideoLink(interviewData[0])];
      while (row2.length < headers.length) {
        row2.push('');
      }

      return [row1, row2];
    });

    const questionSheet = XLSX.utils.aoa_to_sheet([headers, ...questionSheetData]);
    XLSX.utils.book_append_sheet(workbook, questionSheet, `Question ${questionIndex + 1}`);
  });

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

const createStudyDataExport = async (req: Request, res: ExpressResponse) => {
  const { studyId } = req.params;

  if (!studyId) {
    return res.status(400).json({ error: 'Missing studyId parameter' });
  }

  try {
    // Fetch study data
    const studyData = await fetchStudyData(studyId);

    // Create Excel file
    const excelBuffer = createExcelFile(studyData);

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="study_data_${studyId}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send the file
    res.send(excelBuffer);

  } catch (error) {
    console.error('Error creating study data export:', error);
    res.status(500).json({ error: 'Failed to create study data export', details: error instanceof Error ? error.message : String(error) });
  }
};

router.get('/:studyId', createStudyDataExport);

export const createStudyDataExportRoute = router;