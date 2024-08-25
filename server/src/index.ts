import express, { Request, Response } from "express";
import { PrismaClient } from "../../shared/generated/client";
import dotenv from "dotenv";
import path from "path";

// Get __dirname equivalent in ES modules
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();
const port = 3000;
const prisma = new PrismaClient();

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route
app.get("/", async (req: Request, res: Response) => {
  const posts = await prisma.post.findFirst();
  res.send(`Hello World! First user: ${JSON.stringify(posts)}`);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Gracefully shut down the Prisma Client
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});