import { Router, Request, Response as ExpressResponse } from "express";
import { prisma } from "../index";
import { authMiddleware } from "../middleware/auth";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { Quote, Theme, Response, Question, FollowUpQuestion } from "@shared/generated/client";

const router = Router();

const fetchThemeData = async (themeId: string) => {
  const theme = await prisma.theme.findUnique({
    where: { id: themeId },
    include: {
      QuotesOnTheme: {
        include: {
          quote: {
            include: {
              response: {
                include: {
                  question: true,
                  followUpQuestion: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!theme) {
    throw new Error("Theme not found");
  }

  return theme;
};

const createWordDocument = (theme: Theme & {
  QuotesOnTheme: {
    quote: Quote & {
      response: Response & {
        question: Question | null;
        followUpQuestion: FollowUpQuestion | null;
      };
    };
  }[];
}): Document => {
  const sections = [];

  // Add theme title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Theme: ${theme.name}`,
          bold: true,
          size: 32,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({ text: '' }) // Add spacing
  );

  // Add description if it exists
  if (theme.description) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Theme Description: ",
            bold: true,
          }),
          new TextRun({
            text: theme.description,
          }),
        ],
      }),
      new Paragraph({ text: '' }) // Add spacing
    );
  }

  // Add quotes
  theme.QuotesOnTheme.forEach((quoteOnTheme) => {
    const { quote } = quoteOnTheme;
    const question = quote.response.followUpQuestion ?? quote.response.question;
    
    if (!question) return;

    // Add question text
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Q: ",
            bold: true,
          }),
          new TextRun({
            text: question.title,
            bold: true,
          }),
        ],
      }),
      new Paragraph({ text: '' }) // Add spacing
    );

    // Add answer/quote
    const isStartOfPassage = quote.wordStartIndex < 1;
    const quoteText = `${isStartOfPassage ? '"' : '"...'}${quote.plainText}"`;

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "A: ",
            bold: true,
          }),
          new TextRun({
            text: quoteText,
          }),
        ],
      }),
      new Paragraph({ text: '' }), // Add spacing between quotes
      new Paragraph({ text: '' }), // Add extra spacing between Q&A pairs
    );
  });

  return new Document({
    sections: [{ children: sections }],
  });
};

const createThemeQuotesExport = async (req: Request, res: ExpressResponse) => {
  const { themeId } = req.params;

  if (!themeId) {
    return res.status(400).json({ error: "Missing themeId parameter" });
  }

  try {
    // Fetch theme data
    const theme = await fetchThemeData(themeId);

    // Create Word document
    const doc = createWordDocument(theme);

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="theme_quotes_${theme.name.toLowerCase().replace(/\s+/g, '_')}.docx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    // Generate and send the file
    const buffer = await Packer.toBuffer(doc);
    res.send(buffer);
  } catch (error) {
    console.error("Error creating theme quotes export:", error);
    res.status(500).json({
      error: "Failed to create theme quotes export",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

router.get("/:themeId", authMiddleware, createThemeQuotesExport);

export const createThemeQuotesExportRoute = router; 