import { Router, Request, Response } from "express";
import { decideFollowUpPromptIfNecessary } from "../../utils/audioProcessing";

const router = Router();

const testFollowUp = async (req: Request, res: Response) => {
  try {
    const { questionBody, followUpQuestions, followUpResponses, transcribedText, questionContext, studyBackground } = req.body;
    const result = await decideFollowUpPromptIfNecessary(
      questionBody,
      transcribedText,
      followUpQuestions,
      followUpResponses,
      questionContext,
      studyBackground
    );
    res.json({ result });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.post("/", testFollowUp);

export const testFollowUpRoute = router;