import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  pages: integer("pages").notNull(),
  charactersPerPage: integer("characters_per_page").notNull(),
  timeLimit: text("time_limit").notNull(), // "disabled" | "display" | "enabled"
  timeLimitSeconds: integer("time_limit_seconds"),
  status: text("status").notNull().default("waiting"), // "waiting" | "title_input" | "in_progress" | "completed"
  currentRound: integer("current_round").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const roomParticipants = sqliteTable("room_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  playerName: text("player_name").notNull(),
  isOwner: integer("is_owner", { mode: "boolean" }).notNull().default(false),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull(),
});

// タイトル
export const titles = sqliteTable("titles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").notNull().references(() => roomParticipants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ページ
export const pages = sqliteTable("pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titleId: integer("title_id").notNull().references(() => titles.id, { onDelete: "cascade" }),
  round: integer("round").notNull(), // 1から始まるラウンド番号
  participantId: integer("participant_id").notNull().references(() => roomParticipants.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).notNull(),
});

// リレーション定義
export const roomsRelations = relations(rooms, ({ many }) => ({
  participants: many(roomParticipants),
  titles: many(titles),
}));

export const roomParticipantsRelations = relations(roomParticipants, ({ one, many }) => ({
  room: one(rooms, {
    fields: [roomParticipants.roomId],
    references: [rooms.id],
  }),
  titles: many(titles),
  pages: many(pages),
}));

export const titlesRelations = relations(titles, ({ one, many }) => ({
  room: one(rooms, {
    fields: [titles.roomId],
    references: [rooms.id],
  }),
  participant: one(roomParticipants, {
    fields: [titles.participantId],
    references: [roomParticipants.id],
  }),
  pages: many(pages),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  title: one(titles, {
    fields: [pages.titleId],
    references: [titles.id],
  }),
  participant: one(roomParticipants, {
    fields: [pages.participantId],
    references: [roomParticipants.id],
  }),
}));

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type RoomParticipant = typeof roomParticipants.$inferSelect;
export type NewRoomParticipant = typeof roomParticipants.$inferInsert;
export type Title = typeof titles.$inferSelect;
export type NewTitle = typeof titles.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;