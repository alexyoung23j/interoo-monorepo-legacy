import { Router, Request, Response as ExpressResponse } from "express";
import { prisma } from "../index";
import { authMiddleware } from "../middleware/auth";
import { Document, ExternalHyperlink, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } from "docx";
import { DemographicResponse, FollowUpQuestion, InterviewParticipant, InterviewSession, MultipleChoiceOption, Question, QuestionType, Response, Study } from "@shared/generated/client";
import { FullTranscriptBlob } from "@shared/types";

const router = Router();

interface QuestionResponsePair {
    question: Question | FollowUpQuestion;
    response: Response & { multipleChoiceSelection: MultipleChoiceOption | null };
  }
  
  const fetchInterviewData = async (interviewId: string): Promise<{questionResponsePairs: QuestionResponsePair[], interview: InterviewSession & { participant: InterviewParticipant & { demographicResponse: DemographicResponse | null } | null, study: Study }}> => {
    const interview = await prisma.interviewSession.findUnique({
      where: { id: interviewId },
      include: {
        responses: {
          include: {
            question: true,
            followUpQuestion: true,
            multipleChoiceSelection: true,
          },
          orderBy: [
            { question: { questionOrder: 'asc' } },
            { followUpQuestion: { followUpQuestionOrder: 'asc' } },
          ],
        },
        study: {
          include: {
            questions: {
              orderBy: { questionOrder: 'asc' },
            },
          },
        },
        participant: {
            include: {
                demographicResponse: true,
            }
        },
      },
    });
  
    if (!interview) {
      throw new Error("Interview not found");
    }
  
    const questionResponsePairs: QuestionResponsePair[] = [];
  
    for (const question of interview.study.questions) {
        if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
            const response = interview.responses.find(r => r.questionId === question.id && !r.followUpQuestionId && r.multipleChoiceSelection != null);
            if (response) {
                questionResponsePairs.push({
                    question,
                    response,
                });
            }
            continue;
        }

        const mainResponse = interview.responses.find(r => r.questionId === question.id && !r.followUpQuestionId && r.fastTranscribedText !== "");
        if (mainResponse) {
            questionResponsePairs.push({
            question,
            response: mainResponse,
            });
        }
    
        const followUpResponses = interview.responses.filter(r => r.questionId === question.id && r.followUpQuestionId && r.fastTranscribedText !== "");
        for (const followUpResponse of followUpResponses) {
            if (followUpResponse.followUpQuestion) {
            questionResponsePairs.push({
                question: followUpResponse.followUpQuestion,
                response: followUpResponse,
            });
            }
        }
    }
  
    return {questionResponsePairs, interview};
  };

  const createWordDocument = (data: QuestionResponsePair[], interview: InterviewSession & { participant: InterviewParticipant & { demographicResponse: DemographicResponse | null } | null, study: Study }, origin: string): Document => {
    const sections = [];

    // Header section
    sections.push(
      new Paragraph({
        text: interview.study.title,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({ text: '' }),
      new Paragraph({
        text: `Performed: ${interview.lastUpdatedTime?.toLocaleDateString() ?? 'Date Unknown'}`,
      })
    );

    // Add participant information if available
    if (interview.participant?.demographicResponse) {
      const { name, email, phoneNumber } = interview.participant.demographicResponse;
      if (name) sections.push(new Paragraph({ text: `Participant: ${name}` }));
      if (email) sections.push(new Paragraph({ text: `Email: ${email}` }));
      if (phoneNumber) sections.push(new Paragraph({ text: `Phone: ${phoneNumber}` }));
    } else {
        sections.push(new Paragraph({ text: 'Anonymous Participant' }));
    }

    sections.push(new Paragraph({ text: '' })); // Add empty paragraph for spacing
    sections.push(new Paragraph({ text: '' })); // Add empty paragraph for spacing


    // Questions and Responses
    data.forEach((pair, index) => {
      // Add question
      const questionPrefix = 'followUpQuestionOrder' in pair.question ? 'Follow Up: ' : `Question ${pair.question.questionOrder + 1}: `;
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${questionPrefix}${pair.question.title}`, bold: true }),
          ],
        })
      );

      // Add line break
      sections.push(new Paragraph({ text: '' }));

      // Add video link
      const baseQuestionId = 'followUpQuestionOrder' in pair.question ? pair.question.parentQuestionId : pair.question.id;

      const videoLink = getQuestionVideoLink( baseQuestionId, pair.response, interview.study.id, interview.id, interview.study.organizationId, origin);

      if (videoLink && pair.question.questionType === QuestionType.OPEN_ENDED) {
        sections.push(
          new Paragraph({
            children: [
              new ExternalHyperlink({
                children: [
                  new TextRun({ text: "(see response recording)", style: "Hyperlink" }),
                ],
                link: videoLink,
              })
            ],
          }),
          new Paragraph({ text: '' }),
        );
      }

      // Format and add response text
      if (pair.response.transcriptionBody) {
        const transcriptBlob = pair.response.transcriptionBody as FullTranscriptBlob;
        let currentParagraph: Paragraph | null = null;

        transcriptBlob.transcript.sentences.forEach((sentence, sentenceIndex) => {
          if (!currentParagraph) {
            currentParagraph = new Paragraph({});
          }

          currentParagraph.addChildElement(new TextRun({ text: sentence.text + " " }));

          if (sentence.is_paragraph_end || sentenceIndex === transcriptBlob.transcript.sentences.length - 1) {
            sections.push(currentParagraph);
            sections.push(new Paragraph({ text: '' })); // Add a line break after the paragraph
            currentParagraph = null;
          }
        });
      } else {
        if (pair.question.questionType === QuestionType.MULTIPLE_CHOICE) {
            sections.push(new Paragraph({ text: pair.response.multipleChoiceSelection?.optionText || "No response recorded." }));
        } else {
            // Fallback to fastTranscribedText if transcriptionBody is not available
            sections.push(new Paragraph({ text: pair.response.fastTranscribedText || "No response recorded." }));
        }
      }

      // Add spacing between questions
      sections.push(new Paragraph({ text: '' }));
      sections.push(new Paragraph({ text: '' }));
    });

    return new Document({
      sections: [{ children: sections }],
    });
  };
  
  // Helper function to get the video link for a question
  const getQuestionVideoLink = (
    questionId: string,
    response: Response,
    studyId: string,
    interviewSessionId: string,
    orgId: string,
    origin: string,
  ) => {
    return `${origin}/org/${orgId}/study/${studyId}/results?questionId=${questionId}&interviewSessionId=${interviewSessionId}&responseId=${response.id}&modalOpen=true`;
  };

const createInterviewTranscriptExport = async (req: Request, res: ExpressResponse) => {
  const { interviewId } = req.params;
  const origin = req.get("origin") ?? req.get("referer") ?? "Unknown";

  if (!interviewId) {
    return res.status(400).json({ error: "Missing interviewId parameter" });
  }

  try {
    // Fetch interview data
    const {questionResponsePairs, interview} = await fetchInterviewData(interviewId);
    console.log("questionResponsePairs", questionResponsePairs);

    // Create Word document
    const doc = createWordDocument(questionResponsePairs, interview, origin);

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="interview_transcript_${interviewId}.docx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    // Generate and send the file
    const buffer = await Packer.toBuffer(doc);
    res.send(buffer);
  } catch (error) {
    console.error("Error creating interview transcript export:", error);
    res.status(500).json({
      error: "Failed to create interview transcript export",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

router.get("/:interviewId", authMiddleware, createInterviewTranscriptExport);

export const createInterviewTranscriptExportRoute = router;
