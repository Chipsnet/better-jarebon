import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { db } from "./db";
import { rooms } from "./db/schema";

const app = new Elysia()
  .use(cors())
  .get("/", () => "Hello Elysia")
  .post(
    "/rooms",
    async ({ body }) => {
      const roomId = crypto.randomUUID();
      
      const newRoom = {
        id: roomId,
        pages: body.pages,
        charactersPerPage: body.charactersPerPage,
        timeLimit: body.timeLimit,
        timeLimitSeconds: body.timeLimitSeconds ?? null,
        createdAt: new Date(),
      };

      await db.insert(rooms).values(newRoom);

      return {
        success: true,
        roomId,
      };
    },
    {
      body: t.Object({
        pages: t.Number({ minimum: 1, maximum: 20 }),
        charactersPerPage: t.Number({ minimum: 50, maximum: 500 }),
        timeLimit: t.Union([
          t.Literal("disabled"),
          t.Literal("display"),
          t.Literal("enabled"),
        ]),
        timeLimitSeconds: t.Optional(t.Number({ minimum: 10, maximum: 600 })),
      }),
    }
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
