import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  pages: integer("pages").notNull(),
  charactersPerPage: integer("characters_per_page").notNull(),
  timeLimit: text("time_limit").notNull(), // "disabled" | "display" | "enabled"
  timeLimitSeconds: integer("time_limit_seconds"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;