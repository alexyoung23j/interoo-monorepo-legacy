import { Router, Request, Response as ExpressResponse } from "express";
import { prisma } from "../index";
import { authMiddleware } from "../middleware/auth";
import * as XLSX from 'xlsx';
import { FollowUpQuestion, InterviewParticipant, InterviewSession, Question, Study, Response, InterviewSessionStatus, QuestionType, MultipleChoiceOption } from "@shared/generated/client";

const router = Router();

type QuestionWithResponses = Question & {
  Response: Response[];
  FollowUpQuestion: (FollowUpQuestion & {
    Response: Response[];
  })[];
  multipleChoiceOptions: MultipleChoiceOption[];
};

type InterviewWithResponses = InterviewSession & {
  responses: (Response & {
    question: Question & { multipleChoiceOptions: MultipleChoiceOption[] };
    followUpQuestion: FollowUpQuestion | null;
  })[];
  participant: InterviewParticipant | null;
};

type StudyWithQuestionsAndInterviews = Study & {
  questions: QuestionWithResponses[];
  interviews: InterviewWithResponses[];
};


type ConstructedInterviewSessionData = {
  lastUpdatedTime: Date | null;
  participantName: string;
  participantEmail: string;
  status: string;
  responseCount: number;
  responses: {
    questionId: string;
    followUpQuestionId: string | null;
    question: Question & { multipleChoiceOptions: MultipleChoiceOption[] };
    followUpQuestion: FollowUpQuestion | null;
    responseText: string | null;
    multipleChoiceOptionId: string | null;
  }[];
};

type QuestionResponse = {
    interviewSession: InterviewSession;
    mainQuestionTitle: string;
    mainResponse: Response | null;
    followUpResponses: {
      followUpQuestion: FollowUpQuestion;
      response: Response;
    }[];
  };
  
type ProcessedQuestion = {
    id: string;
    questionOrder: number;
    title: string;
    questionType: QuestionType;
    multipleChoiceOptions: MultipleChoiceOption[];
    responses: QuestionResponse[];
};

type FetchStudyDataReturn = {
    questions: ProcessedQuestion[];
    interviewSessionData: ConstructedInterviewSessionData[];
};


const fetchStudyData = async (studyId: string): Promise<FetchStudyDataReturn> => {
  const study = await prisma.study.findUnique({
    where: { id: studyId },
    include: {
      questions: {
        include: {
          multipleChoiceOptions: true
        }
      },
      interviews: {
        include: {
          responses: {
            include: {
              question: {
                include: {
                  multipleChoiceOptions: true
                }
              },
              followUpQuestion: true,
              multipleChoiceSelection: true
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

  const processedQuestions: ProcessedQuestion[] = study.questions.map(question => ({
    id: question.id,
    questionOrder: question.questionOrder,
    title: question.title,
    questionType: question.questionType,
    multipleChoiceOptions: question.multipleChoiceOptions,
    responses: []
  }));

  study.interviews.forEach(interview => {
    processedQuestions.forEach(processedQuestion => {
      const mainResponse = interview.responses.find(r => 
        r.question.id === processedQuestion.id && r.followUpQuestion == null && (r.fastTranscribedText !== '' || r.multipleChoiceOptionId !== null)
      );

      const followUpResponses = interview.responses
        .filter(r => r.question.id === processedQuestion.id && r.followUpQuestion != null)
        .map(r => ({
          followUpQuestion: r.followUpQuestion!,
          response: r
        }));

      processedQuestion.responses.push({
        interviewSession: interview,
        mainQuestionTitle: processedQuestion.title,
        mainResponse: mainResponse || null,
        followUpResponses
      });
    });
  });

  // Sort questions by questionOrder
  processedQuestions.sort((a, b) => a.questionOrder - b.questionOrder);


   // Process interview session data (unchanged)
   const interviewSessionData: ConstructedInterviewSessionData[] = study.interviews.map(interview => ({
    lastUpdatedTime: interview.lastUpdatedTime || null,
    participantName: interview.participant?.name || 'Anonymous',
    participantEmail: interview.participant?.email || 'N/A',
    status: interview.status,
    responseCount: interview.responses.length,
    responses: interview.responses.map(response => ({
      questionId: response.question.id,
      followUpQuestionId: response.followUpQuestion?.id || null,
      question: {
        ...response.question,
        multipleChoiceOptions: response.question.multipleChoiceOptions
      },
      followUpQuestion: response.followUpQuestion,
      responseText: response.fastTranscribedText,
      multipleChoiceOptionId: response.multipleChoiceOptionId
    }))
  }));

  return {
    questions: processedQuestions,
    interviewSessionData
  };
};

const getFullTranscript = (interview: ConstructedInterviewSessionData): string => {
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

    for (const responses of Object.values(groupedResponses)) {
        const mainResponse = responses.find(r => !r.followUpQuestionId && (r.responseText !== '' || r.multipleChoiceOptionId !== null));
        if (!mainResponse) continue;

        transcript += `Question: "${mainResponse.question.title}"\n`;

        // Check question type and format response accordingly
        switch (mainResponse.question.questionType) {
            case QuestionType.OPEN_ENDED:
                transcript += `Response: "${mainResponse.responseText || ''}"\n\n`;
                break;
            case QuestionType.MULTIPLE_CHOICE:
                transcript += `Multiple Choice Selection: [${mainResponse.question.multipleChoiceOptions.find(o => o.id === mainResponse.multipleChoiceOptionId)?.optionText ?? 'N/A'}]\n\n`;
                break;
            default:
                transcript += `Response: [Response not available for this question type]\n\n`;
        }

        // Add follow-up questions and responses (already sorted)
        const followUps = responses.filter(r => r.followUpQuestionId);
        for (const followUp of followUps) {
            transcript += `Question (Follow Up): "${followUp.followUpQuestion?.title}"\n`;
            
            // Assuming follow-up questions are always open-ended
            transcript += `Response: "${followUp.responseText || ''}"\n\n`;
        }

        transcript += '\n'; // Extra line between question groups
    }

    return transcript.trim();
};

const getVideoLink = (interview: any) => '';


const getQuestionOrThreadTranscript = (processedQuestion: ProcessedQuestion, questionResponse: QuestionResponse, includeFollowUps: boolean): string => {
    let transcript = '';
  
    if (questionResponse.mainResponse) {
      const question = processedQuestion;
      transcript += `Question: "${question.title}"\n`;
  
      switch (question.questionType) {
        case QuestionType.OPEN_ENDED:
          transcript += `Response: "${questionResponse.mainResponse.fastTranscribedText || ''}"\n\n`;
          break;
        case QuestionType.MULTIPLE_CHOICE:
          const selectedOption = question.multipleChoiceOptions.find(o => o.id === questionResponse.mainResponse?.multipleChoiceOptionId);
          transcript += `Multiple Choice Selection: [${selectedOption?.optionText ?? 'N/A'}]\n\n`;
          break;
        default:
          transcript += `Response: [Response not available for this question type]\n\n`;
      }
    }
  
    // Add follow-up questions and responses
    if (includeFollowUps) {
        questionResponse.followUpResponses.forEach(followUp => {
        transcript += `Question (Follow Up): "${followUp.followUpQuestion.title}"\n`;
        transcript += `Response: "${followUp.response.fastTranscribedText || ''}"\n\n`;
        });
    }
  
    return transcript.trim();
  };

  
const getFollowUpTranscript = (followUpResponse: { followUpQuestion: FollowUpQuestion; response: Response }): string => {
    const followUpQuestion = followUpResponse.followUpQuestion;
    const response = followUpResponse.response;

    return `Question (Follow Up): "${followUpQuestion.title}"\nResponse: "${response.fastTranscribedText || ''}"\n\n`;
};

const createExcelFile = (studyData: FetchStudyDataReturn) => {
  const workbook = XLSX.utils.book_new();

  // Cover page (blank for now)
  const coverSheet = XLSX.utils.aoa_to_sheet([[]]);
  XLSX.utils.book_append_sheet(workbook, coverSheet, 'Cover');

  // Completed Interviews
  const completedInterviews = studyData.interviewSessionData
    .filter((interview: any) => interview.status === InterviewSessionStatus.COMPLETED)
    .sort((a: any, b: any) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  const completedInterviewsData = completedInterviews.map((interview: any, index: number) => [
    index + 1,
    interview.participantName,
    interview.participantEmail,
    new Date(interview.lastUpdatedTime).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
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
    .filter((interview: any) => interview.status == InterviewSessionStatus.IN_PROGRESS)
    .sort((a: any, b: any) => new Date(a.lastUpdatedTime).getTime() - new Date(b.lastUpdatedTime).getTime());

  const incompleteInterviewsData = incompleteInterviews.map((interview: any, index: number) => [
    index + 1,
    interview.participantName,
    interview.participantEmail,
    new Date(interview.lastUpdatedTime).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    '', // Duration (blank for now)
    getFullTranscript(interview),
    getVideoLink(interview)
  ]);

  const incompleteInterviewsSheet = XLSX.utils.aoa_to_sheet([
    ['Interview Number', 'Participant Name', 'Participant Email', 'Date Updated', 'Duration', 'Full Transcript', 'Video Link'],
    ...incompleteInterviewsData
  ]);
  XLSX.utils.book_append_sheet(workbook, incompleteInterviewsSheet, 'Incomplete Interviews');

  // Question-specific sheets
  studyData.questions.forEach((question, questionIndex) => {
    const sheetName = `Question ${question.questionOrder + 1}`;
    
    // Find the maximum number of follow-ups for this question
    const maxFollowUps = Math.max(...question.responses.map(r => r.followUpResponses.length));

    // Create header row
    const header = [
      'Interview Number',
      'Date',
      'Full Thread Transcript',
      'Question Transcript'
    ];
    for (let i = 1; i <= maxFollowUps; i++) {
      header.push(`Follow Up ${i} Transcript`);
    }

    const questionData: any[][] = [];

    question.responses.forEach((response, index) => {
      const row1: any[] = [
        index + 1,
        new Date(response.interviewSession.lastUpdatedTime || '').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        getQuestionOrThreadTranscript(question, response, true),
        getQuestionOrThreadTranscript(question, response, false)
      ];

      const row2: any[] = [
        '',
        '',
        '',
        getVideoLink(response)
      ];

      response.followUpResponses.forEach((followUp, followUpIndex) => {
        row1.push(getFollowUpTranscript(followUp));
        row2.push(getVideoLink(followUp));
      });

      // Fill in empty cells for follow-ups if needed
      while (row1.length < header.length) {
        row1.push('');
        row2.push('');
      }

      questionData.push(row1, row2, []); // Empty row for spacing
    });

    const questionSheet = XLSX.utils.aoa_to_sheet([header, ...questionData]);
    XLSX.utils.book_append_sheet(workbook, questionSheet, sheetName);
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