'use server'

import { eq, or, sql, asc, desc, getTableColumns, max } from "drizzle-orm";
import { type IRunInsert, runsTable, apiKeysTable, IRunSelect } from "@/lib/pg/schema";
import { db } from "@/lib/pg";

export type RunType = Omit<IRunSelect, "api_key" | "user_id">;

export async function getRunsBySessionNameAction(session_name: string, start=0, limit=50) {
  const { api_key, user_id, ...rest } = getTableColumns(runsTable);



  const list =  await db.select({
    ...rest
  }).from(runsTable).where(
    eq(runsTable.session_name, session_name)
  ).orderBy(desc(runsTable.created_at)).limit(50) as RunType[];

  const count = await db.$count(runsTable, eq(runsTable.session_name, session_name));

  return {
    data: list,
    meta: {
      totalRowCount: count
    }
  };
}