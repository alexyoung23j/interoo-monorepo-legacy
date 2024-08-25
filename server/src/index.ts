import express, { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../shared/generated/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";

// Get __dirname equivalent in ES modules
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();
const port = 8080;
const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Supabase auth middleware
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    console.log("got invalid");
    return res.status(401).json({ error: "Invalid token" });
  }

  (req as any).user = data.user;
  next();
};

// Middleware to parse JSON bodies
app.use(express.json());

// Handle preflight requests
app.options("*", cors());

// Basic route
app.get("/", async (req: Request, res: Response) => {
  const posts = await prisma.post.findFirst();
  res.send(`Hello World! First user: ${JSON.stringify(posts)}`);
});

// Debug route
app.get("/debug", (req, res) => {
  res.json({ message: "Server is running" });
});

// Protected route example
app.get("/protected", authMiddleware, async (req: Request, res: Response) => {
  res.json({ message: "This is a protected route", user: (req as any).user });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Gracefully shut down the Prisma Client
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
