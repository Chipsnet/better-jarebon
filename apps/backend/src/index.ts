import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { db } from "./db";
import { rooms, roomParticipants } from "./db/schema";
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
