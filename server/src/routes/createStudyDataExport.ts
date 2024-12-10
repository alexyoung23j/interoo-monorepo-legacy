import { Router, Request, Response as ExpressResponse } from "express";
import { prisma } from "../index";
import { authMiddleware } from "../middleware/auth";
import { Workbook, Worksheet, Column, FillGradientPath, FillGradientAngle } from "exceljs";

import {
  FollowUpQuestion,
  InterviewSession,
  Question,
  Study,
  Response,
  InterviewSessionStatus,
  QuestionType,
  MultipleChoiceOption,
  InterviewParticipant,
  DemographicResponse,
} from "@shared/generated/client";

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
  participant: (InterviewParticipant & {
    demographicResponse: DemographicResponse | null;
  }) | null;
};

type StudyWithQuestionsAndInterviews = Study & {
  questions: QuestionWithResponses[];
  interviews: InterviewWithResponses[];
};

type ConstructedInterviewSessionData = {
  lastUpdatedTime: Date | null;
  participantName: string;
  participantEmail: string;
  participantPhoneNumber: string;
  status: string;
  responseCount: number;
  studyId: string;
  id: string;
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
  orgId: string;
};

const fetchStudyData = async (
  studyId: string,
): Promise<FetchStudyDataReturn> => {
  const study = (await prisma.study.findUnique({
    where: { id: studyId },
    include: {
      questions: {
        include: {
          multipleChoiceOptions: true,
        },
      },
      interviews: {
        include: {
          responses: {
            include: {
              question: {
                include: {
                  multipleChoiceOptions: true,
                },
              },
              followUpQuestion: true,
              multipleChoiceSelection: true,
            },
          },
          participant: {
            include: {
              demographicResponse: true,
            },
          },
        },
        where: {
          testMode: false,
        },
      },
    },
  })) as StudyWithQuestionsAndInterviews | null;

  if (!study) {
    throw new Error("Study not found");
  }

  const processedQuestions: ProcessedQuestion[] = study.questions.map(
    (question) => ({
      id: question.id,
      questionOrder: question.questionOrder,
      title: question.title,
      questionType: question.questionType,
      multipleChoiceOptions: question.multipleChoiceOptions,
      responses: [],
    }),
  );

  study.interviews.forEach((interview) => {
    processedQuestions.forEach((processedQuestion) => {
      const mainResponse = interview.responses.find(
        (r) =>
          r.question.id === processedQuestion.id &&
          r.followUpQuestion == null &&
          (r.fastTranscribedText !== "" || r.multipleChoiceOptionId !== null),
      );

      const followUpResponses = interview.responses
        .filter(
          (r) =>
            r.question.id === processedQuestion.id &&
            r.followUpQuestion != null,
        )
        .map((r) => ({
          followUpQuestion: r.followUpQuestion!,
          response: r,
        }));

      processedQuestion.responses.push({
        interviewSession: interview,
        mainQuestionTitle: processedQuestion.title,
        mainResponse: mainResponse || null,
        followUpResponses,
      });
    });
  });

  // Sort questions by questionOrder
  processedQuestions.sort((a, b) => a.questionOrder - b.questionOrder);

  // Process interview session data
  const interviewSessionData: ConstructedInterviewSessionData[] =
    study.interviews.map((interview) => ({
      lastUpdatedTime: interview.lastUpdatedTime ?? null,
      participantName: interview.participant?.demographicResponse?.name ?? "Anonymous",
      participantEmail: interview.participant?.demographicResponse?.email ?? "N/A",
      participantPhoneNumber: interview.participant?.demographicResponse?.phoneNumber ?? "N/A",
      status: interview.status,
      responseCount: interview.responses.length,
      studyId: interview.studyId,
      id: interview.id,
      responses: interview.responses.map((response) => ({
        questionId: response.question.id,
        followUpQuestionId: response.followUpQuestion?.id ?? null,
        question: {
          ...response.question,
          multipleChoiceOptions: response.question.multipleChoiceOptions,
        },
        followUpQuestion: response.followUpQuestion,
        responseText: response.fastTranscribedText,
        multipleChoiceOptionId: response.multipleChoiceOptionId,
      })),
    }));

  return {
    questions: processedQuestions,
    interviewSessionData,
    orgId: study.organizationId,
  };
};

const getFullTranscript = (
  interview: ConstructedInterviewSessionData,
): string => {
  let transcript = "";

  // Sort responses by questionOrder, then by followUpQuestionOrder
  const sortedResponses = [...interview.responses].sort((a, b) => {
    if (a.question.questionOrder !== b.question.questionOrder) {
      return a.question.questionOrder - b.question.questionOrder;
    }
    return (
      (a.followUpQuestion?.followUpQuestionOrder ?? 0) -
      (b.followUpQuestion?.followUpQuestionOrder ?? 0)
    );
  });

  // Group responses by main question
  const groupedResponses = sortedResponses.reduce(
    (acc, response) => {
      const key = response.questionId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(response);
      return acc;
    },
    {} as Record<string, typeof sortedResponses>,
  );

  for (const responses of Object.values(groupedResponses)) {
    const mainResponse = responses.find(
      (r) =>
        !r.followUpQuestionId &&
        (r.responseText !== "" || r.multipleChoiceOptionId !== null),
    );
    if (!mainResponse) continue;

    transcript += `Question: "${mainResponse.question.title}"\n\n`;

    // Check question type and format response accordingly
    switch (mainResponse.question.questionType) {
      case QuestionType.OPEN_ENDED:
        transcript += `Response: "${mainResponse.responseText || ""}"\n\n\n`;
        break;
      case QuestionType.MULTIPLE_CHOICE:
        transcript += `Multiple Choice Selection: [${mainResponse.question.multipleChoiceOptions.find((o) => o.id === mainResponse.multipleChoiceOptionId)?.optionText ?? "N/A"}]\n\n\n`;
        break;
      default:
        transcript += `Response: [Response not available for this question type]\n\n`;
    }

    // Add follow-up questions and responses (already sorted)
    const followUps = responses.filter((r) => r.followUpQuestionId);
    for (const followUp of followUps) {
      transcript += `Question (Follow Up): "${followUp.followUpQuestion?.title}"\n\n`;

      // Assuming follow-up questions are always open-ended
      transcript += `Response: "${followUp.responseText || ""}"\n\n\n`;
    }

    transcript += "\n"; // Extra line between question groups
  }

  return transcript.trim();
};

const getInterviewVideoLink = (
  interview: ConstructedInterviewSessionData,
  orgId: string,
  origin: string,
) => {
  return `${origin}/org/${orgId}/study/${interview.studyId}/interviews?interviewSessionId=${interview.id}&modalOpen=true`;
};

const getQuestionVideoLink = (
  question: ProcessedQuestion,
  response: QuestionResponse,
  orgId: string,
  origin: string,
) => {
  if (question.questionType != QuestionType.OPEN_ENDED) {
    return "";
  }
  return `${origin}/org/${orgId}/study/${response.interviewSession.studyId}/results?questionId=${question.id}&interviewSessionId=${response.interviewSession.id}&responseId=${response.mainResponse?.id}&modalOpen=true`;
};

const getFollowUpQuestionVideoLink = (
  question: ProcessedQuestion,
  questionResponse: QuestionResponse,
  response: Response,
  orgId: string,
  origin: string,
) => {
  return `${origin}/org/${orgId}/study/${questionResponse.interviewSession.studyId}/results?questionId=${question.id}&interviewSessionId=${questionResponse.interviewSession.id}&responseId=${response?.id}&modalOpen=true`;
};

const getQuestionOrThreadTranscript = (
  processedQuestion: ProcessedQuestion,
  questionResponse: QuestionResponse,
  includeFollowUps: boolean,
): string => {
  let transcript = "";

  if (questionResponse.mainResponse) {
    const question = processedQuestion;
    transcript += `Question: "${question.title}"\n\n`;

    switch (question.questionType) {
      case QuestionType.OPEN_ENDED:
        transcript += `Response: "${questionResponse.mainResponse.fastTranscribedText || ""}"\n\n\n`;
        break;
      case QuestionType.MULTIPLE_CHOICE:
        const selectedOption = question.multipleChoiceOptions.find(
          (o) => o.id === questionResponse.mainResponse?.multipleChoiceOptionId,
        );
        transcript += `Multiple Choice Selection: [${selectedOption?.optionText ?? "N/A"}]\n\n\n`;
        break;
      default:
        transcript += `Response: [Response not available for this question type]\n\n\n`;
    }
  }

  // Add follow-up questions and responses
  if (includeFollowUps) {
    questionResponse.followUpResponses.forEach((followUp) => {
      transcript += `Question (Follow Up): "${followUp.followUpQuestion.title}"\n\n`;
      transcript += `Response: "${followUp.response.fastTranscribedText || ""}"\n\n\n`;
    });
  }

  return transcript.trim();
};

const getFollowUpTranscript = (followUpResponse: {
  followUpQuestion: FollowUpQuestion;
  response: Response;
}): string => {
  const followUpQuestion = followUpResponse.followUpQuestion;
  const response = followUpResponse.response;

  return `Question (Follow Up): "${followUpQuestion.title}"\n\nResponse: "${response.fastTranscribedText || ""}"\n\n\n`;
};

interface InterviewData {
  interviewNumber: number;
  participantName: string;
  participantEmail: string;
  dateCompleted: Date;
  duration: string;
  fullTranscript: string;
  videoLink: string;
}

interface QuestionResponseData {
  interviewNumber: number;
  date: Date;
  fullThreadTranscript: string;
  questionTranscript: string;
  questionVideoLink: string;
  responseOnly: string;
  followUps: {
    transcript: string;
    videoLink: string;
  }[];
}

interface QuestionData {
  questionNumber: number;
  questionTitle: string;
  responses: QuestionResponseData[];
}

interface ExcelData {
  coverPage: any[]; // You can define a more specific type if needed
  completedInterviews: InterviewData[];
  incompleteInterviews: InterviewData[];
  questions: QuestionData[];
}

const getResponseOnly = (
  question: ProcessedQuestion,
  questionResponse: QuestionResponse
): string => {
  if (!questionResponse.mainResponse) return "";

  switch (question.questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      const selectedOption = question.multipleChoiceOptions.find(
        (o) => o.id === questionResponse.mainResponse?.multipleChoiceOptionId
      );
      return selectedOption?.optionText ?? "N/A";
    case QuestionType.OPEN_ENDED:
      return questionResponse.mainResponse.fastTranscribedText || "";
    default:
      return "";
  }
};

// Modify the createExcelData function signature
const createExcelData = (
  studyData: FetchStudyDataReturn,
  orgId: string,
  origin: string,
): ExcelData => {
  const excelData: ExcelData = {
    coverPage: [],
    completedInterviews: [],
    incompleteInterviews: [],
    questions: [],
  };

  // Completed Interviews
  const completedInterviews = studyData.interviewSessionData
    .filter(
      (interview) => interview.status === InterviewSessionStatus.COMPLETED,
    )
    .sort(
      (a, b) =>
        new Date(a.lastUpdatedTime || "").getTime() -
        new Date(b.lastUpdatedTime || "").getTime(),
    );

  excelData.completedInterviews = completedInterviews.map(
    (interview, index) => ({
      interviewNumber: index + 1,
      participantName: interview.participantName,
      participantEmail: interview.participantEmail,
      dateCompleted: new Date(interview.lastUpdatedTime || ""),
      duration: "", // Duration (blank for now)
      fullTranscript: getFullTranscript(interview),
      videoLink: getInterviewVideoLink(interview, orgId, origin),
    }),
  );

  // Incomplete Interviews
  const incompleteInterviews = studyData.interviewSessionData
    .filter(
      (interview) => interview.status === InterviewSessionStatus.IN_PROGRESS,
    )
    .sort(
      (a, b) =>
        new Date(a.lastUpdatedTime || "").getTime() -
        new Date(b.lastUpdatedTime || "").getTime(),
    );

  excelData.incompleteInterviews = incompleteInterviews.map(
    (interview, index) => ({
      interviewNumber: index + 1,
      participantName: interview.participantName,
      participantEmail: interview.participantEmail,
      dateCompleted: new Date(interview.lastUpdatedTime || ""),
      duration: "", // Duration (blank for now)
      fullTranscript: getFullTranscript(interview),
      videoLink: getInterviewVideoLink(interview, orgId, origin),
    }),
  );

  // Question-specific data
  excelData.questions = studyData.questions.map((question) => {
    const questionData: QuestionData = {
      questionNumber: question.questionOrder + 1,
      questionTitle: question.title,
      responses: [],
    };

    question.responses
      .filter(
        (response) =>
          response.interviewSession.status === InterviewSessionStatus.COMPLETED,
      )
      .forEach((response, index) => {
        questionData.responses.push({
          interviewNumber: index + 1,
          date: new Date(response.interviewSession.lastUpdatedTime || ""),
          fullThreadTranscript: getQuestionOrThreadTranscript(
            question,
            response,
            true,
          ),
          questionTranscript: getQuestionOrThreadTranscript(
            question,
            response,
            false,
          ),
          questionVideoLink: getQuestionVideoLink(
            question,
            response,
            orgId,
            origin,
          ),
          responseOnly: getResponseOnly(question, response),
          followUps: response.followUpResponses.map((followUp) => ({
            transcript: getFollowUpTranscript(followUp),
            videoLink: getFollowUpQuestionVideoLink(
              question,
              response,
              followUp.response,
              orgId,
              origin,
            ),
          })),
        });
      });

    return questionData;
  });

  return excelData;
};

const formatExcelWorkbook = (excelData: ExcelData) => {
    const workbook = new Workbook();
  
    const formatSheet = (sheet: Worksheet, columns: Partial<Column>[], data: any[], description: string, isQuestionSheet: boolean = false) => {
      // Add blank column to the left and other columns, plus an extra blank column at the end
      sheet.columns = [
        { header: '', key: 'blank_left', width: 5 },
        ...columns.map(col => ({ ...col, width: Math.min(col.width || 0, 50), header: '' })),
        { header: '', key: 'blank_right', width: 10 }
      ];
  
      // Add description
      sheet.addRow([]); // Blank row
      sheet.addRow(['', description, '', '', '', '', '', '', '', ]);
      sheet.addRow([]);
      sheet.addRow([]);
  
      // Style description cell
      const descriptionCell = sheet.getCell('B3');
      sheet.mergeCells('B3:G3'); // Merge 6 cells (B3 to G3)
      descriptionCell.alignment = { wrapText: true, vertical: 'justify', horizontal: "center" };
      descriptionCell.font = { bold: true, size: 14, color: { argb: 'FFFDFCFD' }  }; // Increased font size
  
      // Apply linear gradient to description cell
      const fill: FillGradientAngle = {
        type: 'gradient',
        gradient: 'angle',
        degree: 0,
        stops: [
          {position: 0, color: {argb: 'FF426473'}},
          {position: 1, color: {argb: 'FFB2C1C7'}},
        ]
      };
      descriptionCell.fill = fill;
  
      // Add column headers
      const headerRow = sheet.addRow(['', ...columns.map(col => col.header), '']);
      headerRow.height = 40; // 3x the default height (20)
      headerRow.font = { bold: true, color: { argb: 'FFFDFCFD' } }; // White text (theme-off-white)
      headerRow.eachCell((cell, colNumber) => {
        if (colNumber > 1 && colNumber <= columns.length + 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF426473' } // theme-600 background
          };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
          cell.alignment = { vertical: 'bottom', horizontal: 'center' };
        }
      });
  
      // Add data
      let groupIndex = 0;
      data.forEach((row, rowIndex) => {
        const newRow = sheet.addRow(['', ...Object.values(row), '']);
        newRow.height = 20; // Set a fixed height for data rows
  
        if (isQuestionSheet) {
          if (rowIndex % 3 !== 2) { // Not an empty row
            const fillColor = groupIndex % 2 === 0 ? 'FFF5F7F7' : 'FFD5DDE1'; // theme-50 and theme-100
            newRow.eachCell((cell, colNumber) => {
              if (colNumber > 1 && colNumber <= columns.length + 1) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: fillColor }
                };
                if (rowIndex % 3 === 0) { // First row of a group
                  cell.border = { top: { style: 'thin' } };
                  if (colNumber === 2) { // Interview number column
                    cell.border.right = { style: 'thin' };
                  }
                } else if (rowIndex % 3 === 1) { // Second row of a group
                  cell.border = { bottom: { style: 'thin' } };
                  if (colNumber === 2) { // Interview number column
                    cell.border.right = { style: 'thin' };
                  }
                }
              }
            });
          } else {
            groupIndex++; // Increment group index for empty rows
          }
        } else {
          const fillColor = rowIndex % 2 === 0 ? 'FFF5F7F7' : 'FFD5DDE1'; // theme-50 and theme-100
          newRow.eachCell((cell, colNumber) => {
            if (colNumber > 1 && colNumber <= columns.length + 1) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: fillColor }
              };
              cell.border = { 
                top: { style: 'thin' }, 
                bottom: { style: 'thin' }
              };
              if (colNumber === 2) { // Interview number column
                cell.border.right = { style: 'thin' };
              }
            }
          });
        }
      });
  
      // Apply styles to all cells
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (colNumber > 1 && colNumber <= columns.length + 1) { // Skip the first and last (blank) columns
            if (cell.value && typeof cell.value === 'string' && cell.value.startsWith('http')) {
              cell.value = { text: cell.value, hyperlink: cell.value };
              cell.font = { color: { argb: '0000FF' }, underline: true };
            }
            cell.alignment = { vertical: 'top' };
          }
        });
      });
    };
  
    // Completed Interviews
    const completedInterviewsSheet = workbook.addWorksheet('Completed Interviews');
    formatSheet(
      completedInterviewsSheet,
      [
        { header: 'INTERVIEW NUMBER', key: 'interviewNumber', width: 20 },
        { header: 'PARTICIPANT NAME', key: 'participantName', width: 20 },
        { header: 'PARTICIPANT EMAIL', key: 'participantEmail', width: 20 },
        { header: 'DATE COMPLETED', key: 'dateCompleted', width: 20 },
        { header: 'DURATION', key: 'duration', width: 15 },
        { header: 'FULL INTERVIEW TRANSCRIPT', key: 'fullTranscript', width: 50 },
        { header: 'RECORDING LINK', key: 'videoLink', width: 50 }
      ],
      excelData.completedInterviews,
      'This sheet contains data for all completed interviews. See the "Incomplete Interviews" sheet for interviews that are still in progress.'
    );
  
    // Incomplete Interviews
    const incompleteInterviewsSheet = workbook.addWorksheet('Incomplete Interviews');
    formatSheet(
      incompleteInterviewsSheet,
      [
        { header: 'INTERVIEW NUMBER', key: 'interviewNumber', width: 20 },
        { header: 'PARTICIPANT NAME', key: 'participantName', width: 20 },
        { header: 'PARTICIPANT EMAIL', key: 'participantEmail', width: 20 },
        { header: 'DATE UPDATED', key: 'dateCompleted', width: 20 },
        { header: 'DURATION', key: 'duration', width: 15 },
        { header: 'FULL INTERVIEW TRANSCRIPT', key: 'fullTranscript', width: 50 },
        { header: 'RECORDING LINK', key: 'videoLink', width: 50 }
      ],
      excelData.incompleteInterviews,
      'This sheet contains data for all incomplete interviews.'
    );
  
    // Question-specific sheets
    excelData.questions.forEach((questionData: QuestionData) => {
      const sheetName = `Question ${questionData.questionNumber}`;
      const questionSheet = workbook.addWorksheet(sheetName);
      
      const columns: Partial<Column>[] = [
        { header: 'INTERVIEW NUMBER', key: 'interviewNumber', width: 20 },
        { header: 'DATE COMPLETED', key: 'date', width: 20 },
        { header: 'FULL THREAD TRANSCRIPT', key: 'fullThreadTranscript', width: 50 },
        { header: 'QUESTION TRANSCRIPT', key: 'questionTranscript', width: 50 },
        { header: 'RESPONSE ONLY', key: 'responseOnly', width: 50 },
      ];
  
      // Add follow-up columns dynamically
      const maxFollowUps = Math.max(...questionData.responses.map(r => r.followUps.length));
      for (let i = 1; i <= maxFollowUps; i++) {
        columns.push(
          { header: `FOLLOW UP ${i} TRANSCRIPT`, key: `followUp${i}Transcript`, width: 50 },
        );
      }
  
      const data = questionData.responses.flatMap((response, index) => {
        const transcriptRow: { [key: string]: any } = {
          interviewNumber: response.interviewNumber,
          date: response.date,
          fullThreadTranscript: response.fullThreadTranscript,
          questionTranscript: response.questionTranscript,
          responseOnly: response.responseOnly,
        };
        
        response.followUps.forEach((followUp, index) => {
          transcriptRow[`followUp${index + 1}Transcript`] = followUp.transcript;
        });
  
        const videoLinkRow: { [key: string]: any } = {
          interviewNumber: '',
          date: '',
          fullThreadTranscript: '',
          questionTranscript: response.questionVideoLink,
        };
  
        response.followUps.forEach((followUp, index) => {
          videoLinkRow[`followUp${index + 1}Transcript`] = followUp.videoLink;
        });
  
        return [transcriptRow, videoLinkRow, {}]; // Empty row for spacing
      });
  
      formatSheet(
        questionSheet,
        columns,
        data,
        `Responses and follow ups for Question ${questionData.questionNumber}: "${questionData.questionTitle}". `,
        true // isQuestionSheet
      );
    });
  
    return workbook;
  };


const createStudyDataExport = async (req: Request, res: ExpressResponse) => {
  const { studyId } = req.params;
  const origin = req.get("origin") || req.get("referer") || "Unknown";

  if (!studyId) {
    return res.status(400).json({ error: "Missing studyId parameter" });
  }

  try {
    // Fetch study data
    const studyData = await fetchStudyData(studyId);
    // Create Excel data
    const excelData = createExcelData(studyData, studyData.orgId, origin);

    // Format Excel workbook
    const workbook = formatExcelWorkbook(excelData);

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="study_data_${studyId}.xlsx"`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    // Send the file
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error creating study data export:", error);
    res
      .status(500)
      .json({
        error: "Failed to create study data export",
        details: error instanceof Error ? error.message : String(error),
      });
  }
};

router.get("/:studyId", createStudyDataExport);

export const createStudyDataExportRoute = router;