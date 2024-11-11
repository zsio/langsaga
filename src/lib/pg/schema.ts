import {
  serial,
  integer,
  pgTable,
  varchar,
  jsonb,
  timestamp,
  AnyPgColumn,
  uuid
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import dayjs from "dayjs";

export const usersTable = pgTable("users", {
  id: serial().primaryKey(),
  username: varchar(),
  nickname: varchar(),
  password: varchar(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp(),
  deleted_at: timestamp(),
});

export const usersTableRelations = relations(usersTable, ({ many }) => ({
	api_keys: many(apiKeysTable),
  runs: many(runsTable),
}));

export const apiKeysTable = pgTable("api_keys", {
  id: serial().primaryKey(),
  key: uuid().defaultRandom().notNull().unique(),
  user_id: integer().notNull().references(()=>usersTable.id),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp(),
  deleted_at: timestamp(),
});

const apiKeyRelations = relations(apiKeysTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [apiKeysTable.user_id],
    references: [usersTable.id],
  }),
  runs: many(runsTable),
}));

export const runsTable = pgTable("runs", {
  id: serial().primaryKey(),
  run_id: varchar().notNull(),
  name: varchar(),
  run_type: varchar().notNull(),
  start_time: timestamp(),
  end_time: timestamp(),
  extra: jsonb().$type<Record<string, any>>(),
  serialized: jsonb().$type<Record<string, any>>(),
  events: jsonb().$type<
    {
      name: string;
      time: string;
    }[]
  >(),
  tags: jsonb().$type<string[]>(),
  error: varchar(),
  reference_example_id: varchar(),
  parent_run_id: varchar(),
  trace_id: varchar(),
  dotted_order: varchar(),
  inputs: jsonb(),
  outputs: jsonb(),
  session_name: varchar(),
  // 服务端
  api_key: uuid().references(()=>apiKeysTable.key).notNull(),
  user_id: integer().notNull().references(()=>usersTable.id),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp(),
});

export const runsTableRelations = relations(runsTable, ({ one, many }) => ({
  parent: one(runsTable, {
    fields: [runsTable.parent_run_id],
    references: [runsTable.run_id],
  }),
  user: one(usersTable, {
    fields: [runsTable.user_id],
    references: [usersTable.id],
  }),
  apiKey: one(apiKeysTable, {
    fields: [runsTable.api_key],
    references: [apiKeysTable.key],
  }),
}));

export type IRunInsert = typeof runsTable.$inferInsert;
export type IRunSelect = typeof runsTable.$inferSelect;
