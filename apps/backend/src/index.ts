import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { db } from "./db";
import { rooms, roomParticipants, titles, pages } from "./db/schema";
import { eq, and } from "drizzle-orm";

// WebSocketの接続を管理
type RoomConnection = {
  ws: any;
  roomId: string;
  playerName: string;
};

const connections = new Map<string, RoomConnection[]>();

// ルームの参加者をブロードキャスト
async function broadcastParticipants(roomId: string) {
  const participants = await db.query.roomParticipants.findMany({
    where: eq(roomParticipants.roomId, roomId),
    orderBy: (participants, { asc }) => [asc(participants.joinedAt)],
  });

  const roomConnections = connections.get(roomId) || [];
  const message = JSON.stringify({
    type: "participants_update",
    participants,
  });

  roomConnections.forEach((conn) => {
    try {
      conn.ws.send(message);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  });
}

// ルームの状態をブロードキャスト
async function broadcastRoomState(roomId: string) {
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });

  const participants = await db.query.roomParticipants.findMany({
    where: eq(roomParticipants.roomId, roomId),
    orderBy: (participants, { asc }) => [asc(participants.joinedAt)],
  });

  const roomTitles = await db.query.titles.findMany({
    where: eq(titles.roomId, roomId),
    with: {
      participant: true,
    },
  });

  const roomConnections = connections.get(roomId) || [];
  const message = JSON.stringify({
    type: "room_state_update",
    room,
    participants,
    titles: roomTitles,
  });

  roomConnections.forEach((conn) => {
    try {
      conn.ws.send(message);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  });
}

// タイトルをランダムに割り振る
function shuffleTitles(participantIds: number[], titleIds: number[]) {
  const shuffled = [...titleIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
        status: "waiting" as const,
        currentRound: 0,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
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
  .get(
    "/rooms/:id",
    async ({ params }) => {
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, params.id),
      });

      if (!room) {
        return {
          success: false,
          error: "Room not found",
        };
      }

      const participants = await db.query.roomParticipants.findMany({
        where: eq(roomParticipants.roomId, params.id),
        orderBy: (participants, { asc }) => [asc(participants.joinedAt)],
      });

      return {
        success: true,
        room,
        participants,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/rooms/:id/join",
    async ({ params, body }) => {
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, params.id),
      });

      if (!room) {
        return {
          success: false,
          error: "Room not found",
        };
      }

      // 既存の参加者を確認（同じ名前で再入場可能）
      const existingParticipant = await db.query.roomParticipants.findFirst({
        where: and(
          eq(roomParticipants.roomId, params.id),
          eq(roomParticipants.playerName, body.playerName)
        ),
      });

      if (existingParticipant) {
        return {
          success: true,
          participant: existingParticipant,
          isRejoining: true,
        };
      }

      // 最初の参加者かどうかを確認
      const participantCount = await db.query.roomParticipants.findMany({
        where: eq(roomParticipants.roomId, params.id),
      });

      const isOwner = participantCount.length === 0;

      const newParticipant = {
        roomId: params.id,
        playerName: body.playerName,
        isOwner,
        joinedAt: new Date(),
      };

      const [participant] = await db
        .insert(roomParticipants)
        .values(newParticipant)
        .returning();

      // 新しい参加者をWebSocketで通知
      await broadcastParticipants(params.id);

      return {
        success: true,
        participant,
        isRejoining: false,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        playerName: t.String({ minLength: 1, maxLength: 20 }),
      }),
    }
  )
  .post(
    "/rooms/:id/start",
    async ({ params }) => {
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, params.id),
      });

      if (!room) {
        return {
          success: false,
          error: "Room not found",
        };
      }

      if (room.status !== "waiting") {
        return {
          success: false,
          error: "Game already started",
        };
      }

      // ステータスを更新
      await db
        .update(rooms)
        .set({
          status: "title_input",
          startedAt: new Date(),
        })
        .where(eq(rooms.id, params.id));

      // WebSocketで通知
      await broadcastRoomState(params.id);

      return {
        success: true,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .post(
    "/rooms/:id/titles",
    async ({ params, body }) => {
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, params.id),
      });

      if (!room) {
        return {
          success: false,
          error: "Room not found",
        };
      }

      if (room.status !== "title_input") {
        return {
          success: false,
          error: "Not in title input phase",
        };
      }

      // 参加者を確認
      const participant = await db.query.roomParticipants.findFirst({
        where: and(
          eq(roomParticipants.roomId, params.id),
          eq(roomParticipants.id, body.participantId)
        ),
      });

      if (!participant) {
        return {
          success: false,
          error: "Participant not found",
        };
      }

      // 既にタイトルを提出しているか確認
      const existingTitle = await db.query.titles.findFirst({
        where: and(
          eq(titles.roomId, params.id),
          eq(titles.participantId, body.participantId)
        ),
      });

      if (existingTitle) {
        return {
          success: false,
          error: "Title already submitted",
        };
      }

      // タイトルを保存
      await db.insert(titles).values({
        roomId: params.id,
        participantId: body.participantId,
        title: body.title,
        createdAt: new Date(),
      });

      // 全員がタイトルを提出したか確認
      const allParticipants = await db.query.roomParticipants.findMany({
        where: eq(roomParticipants.roomId, params.id),
      });

      const allTitles = await db.query.titles.findMany({
        where: eq(titles.roomId, params.id),
      });

      if (allTitles.length === allParticipants.length) {
        // ゲーム開始（ラウンド1）
        await db
          .update(rooms)
          .set({
            status: "in_progress",
            currentRound: 1,
          })
          .where(eq(rooms.id, params.id));
      }

      // WebSocketで通知
      await broadcastRoomState(params.id);

      return {
        success: true,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        participantId: t.Number(),
        title: t.String({ minLength: 1, maxLength: 100 }),
      }),
    }
  )
  .post(
    "/rooms/:id/pages",
    async ({ params, body }) => {
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, params.id),
      });

      if (!room) {
        return {
          success: false,
          error: "Room not found",
        };
      }

      if (room.status !== "in_progress") {
        return {
          success: false,
          error: "Game not in progress",
        };
      }

      // タイトルを確認
      const title = await db.query.titles.findFirst({
        where: eq(titles.id, body.titleId),
      });

      if (!title || title.roomId !== params.id) {
        return {
          success: false,
          error: "Title not found",
        };
      }

      // 既にこのラウンドでページを提出しているか確認
      const existingPage = await db.query.pages.findFirst({
        where: and(
          eq(pages.titleId, body.titleId),
          eq(pages.round, room.currentRound),
          eq(pages.participantId, body.participantId)
        ),
      });

      if (existingPage) {
        return {
          success: false,
          error: "Page already submitted for this round",
        };
      }

      // ページを保存
      await db.insert(pages).values({
        titleId: body.titleId,
        round: room.currentRound,
        participantId: body.participantId,
        content: body.content,
        submittedAt: new Date(),
      });

      // 全員が現在のラウンドでページを提出したか確認
      const allParticipants = await db.query.roomParticipants.findMany({
        where: eq(roomParticipants.roomId, params.id),
      });

      const allTitles = await db.query.titles.findMany({
        where: eq(titles.roomId, params.id),
      });

      const currentRoundPages = await db.query.pages.findMany({
        where: and(
          eq(pages.round, room.currentRound),
        ),
      });

      // タイトルごとに現在のラウンドでページが提出されているか確認
      const titlesWithPages = new Set(currentRoundPages.map(p => p.titleId));
      const allTitlesHavePages = allTitles.every(t => titlesWithPages.has(t.id));

      if (allTitlesHavePages) {
        // 次のラウンドへ、または完了
        if (room.currentRound >= room.pages) {
          // ゲーム完了
          await db
            .update(rooms)
            .set({
              status: "completed",
              completedAt: new Date(),
            })
            .where(eq(rooms.id, params.id));
        } else {
          // 次のラウンドへ
          await db
            .update(rooms)
            .set({
              currentRound: room.currentRound + 1,
            })
            .where(eq(rooms.id, params.id));
        }
      }

      // WebSocketで通知
      await broadcastRoomState(params.id);

      return {
        success: true,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        participantId: t.Number(),
        titleId: t.Number(),
        content: t.String({ minLength: 1 }),
      }),
    }
  )
  .get(
    "/rooms/:id/game-state",
    async ({ params }) => {
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, params.id),
      });

      if (!room) {
        return {
          success: false,
          error: "Room not found",
        };
      }

      const participants = await db.query.roomParticipants.findMany({
        where: eq(roomParticipants.roomId, params.id),
        orderBy: (participants, { asc }) => [asc(participants.joinedAt)],
      });

      const roomTitles = await db.query.titles.findMany({
        where: eq(titles.roomId, params.id),
      });

      const roomPages = await db.query.pages.findMany({
        where: (pages, { inArray }) =>
          inArray(pages.titleId, roomTitles.map(t => t.id)),
        orderBy: (pages, { asc }) => [asc(pages.round)],
      });

      // 各参加者の現在の担当タイトルを計算
      const assignments: Record<number, number | null> = {};
      
      if (room.status === "in_progress" || room.status === "completed") {
        // タイトルをシャッフルして割り当て
        const participantIds = participants.map(p => p.id);
        const titleIds = roomTitles.map(t => t.id);
        
        // 現在のラウンドに基づいてローテーション
        participantIds.forEach((participantId, index) => {
          const titleIndex = (index + room.currentRound - 1) % titleIds.length;
          assignments[participantId] = titleIds[titleIndex];
        });
      }

      return {
        success: true,
        room,
        participants,
        titles: roomTitles,
        pages: roomPages,
        assignments,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  .ws("/ws/rooms/:id", {
    params: t.Object({
      id: t.String(),
    }),
    query: t.Object({
      playerName: t.String(),
    }),
    open(ws) {
      const { id } = ws.data.params;
      const { playerName } = ws.data.query;

      console.log(`WebSocket opened: ${playerName} joined room ${id}`);

      // 接続を保存
      if (!connections.has(id)) {
        connections.set(id, []);
      }
      connections.get(id)!.push({
        ws,
        roomId: id,
        playerName,
      });

      // 現在の参加者リストを送信
      broadcastParticipants(id);
    },
    message(ws, message) {
      // クライアントからのメッセージ処理（将来の拡張用）
      console.log("Received message:", message);
    },
    close(ws) {
      const { id } = ws.data.params;
      const { playerName } = ws.data.query;

      console.log(`WebSocket closed: ${playerName} left room ${id}`);

      // 接続を削除
      const roomConnections = connections.get(id);
      if (roomConnections) {
        const filtered = roomConnections.filter(
          (conn) => conn.ws !== ws
        );
        if (filtered.length > 0) {
          connections.set(id, filtered);
        } else {
          connections.delete(id);
        }
      }
    },
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
