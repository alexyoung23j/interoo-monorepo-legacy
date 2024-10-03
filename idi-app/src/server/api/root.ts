import { postRouter } from "@/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { interviewsRouter } from "./routers/interviews";
import { studiesRouter } from "./routers/studies";
import { responsesRouter } from "./routers/responses";
import { orgsRouter } from "./routers/orgs";
import { questionsRouter } from "./routers/questions";
import { demographicsRouter } from "./routers/demographics";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  interviews: interviewsRouter,
  studies: studiesRouter,
  responses: responsesRouter,
  orgs: orgsRouter,
  questions: questionsRouter,
  demographics: demographicsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
