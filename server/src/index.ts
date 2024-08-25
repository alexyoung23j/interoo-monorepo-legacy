import express, { Request, Response } from 'express';
import { PrismaClient } from '../../shared/generated/client';

const app = express();
const port = 3000;
const prisma = new PrismaClient();

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route
app.get('/', async (req: Request, res: Response) => {
  const posts = await prisma.post.findFirst();
  res.send(`Hello World! First user: ${JSON.stringify(posts)}`);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});