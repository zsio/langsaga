'use server'

import { and, eq, or, sql, asc, desc, getTableColumns, max, isNull } from "drizzle-orm";
import { type SQL } from "drizzle-orm";
import { type IRunInsert, runsTable, apiKeysTable, IRunSelect } from "@/lib/pg/schema";
import { db } from "@/lib/pg";

export type RunType = Omit<IRunSelect, "api_key" | "user_id">;

export async function getRunsBySessionNameAction(session_name: string, start=0, limit=50) {
  const { api_key, user_id, ...rest } = getTableColumns(runsTable);

  const filters: SQL[] = [];
  if (session_name) filters.push(eq(runsTable.session_name, session_name));
  filters.push(isNull(runsTable.parent_run_id));

  const list =  await db.select({
    ...rest
  }).from(runsTable).where(
    and(...filters)
  ).orderBy(desc(runsTable.start_time)).limit(50) as RunType[];

  const count = await db.$count(runsTable, and(...filters));

  return {
    data: {
      list,
    },
    meta: {
      totalRowCount: count
    }
  };
}