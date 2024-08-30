import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

const protectedHandler = (req: Request, res: Response) => {
  res.json({ message: "This is a protected route", user: (req as any).user });
};

router.get("/", authMiddleware, protectedHandler);

export const protectedRoute = router;