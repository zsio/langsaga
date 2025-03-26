"use server";

import {
  and,
  eq,
  or,
  sql,
  asc,
  desc,
  getTableColumns,
  max,
  isNull,
  gt,
  lt,
} from "drizzle-orm";
import { type SQL } from "drizzle-orm";
import {
  type IRunInsert,
  runsTable,
  apiKeysTable,
  IRunSelect,
} from "@/lib/pg/schema";
import { db } from "@/lib/pg";

export type RunType = Omit<IRunSelect, "api_key" | "user_id">;

export async function getRunsBySessionNameAction(
  session_name: string,
  startId?: number,
  isGetNewest = false,
  limit = 30
) {
  const { api_key, user_id, ...rest } = getTableColumns(runsTable);

  const filters: SQL[] = [];
  filters.push(gt(runsTable.start_time, sql`NOW() - INTERVAL '1 week'`));
  if (session_name) filters.push(eq(runsTable.session_name, session_name));
  if (startId) {
    if (isGetNewest) {
      filters.push(gt(runsTable.id, startId));
    } else {
      filters.push(lt(runsTable.id, startId));
    }
  }
  filters.push(isNull(runsTable.parent_run_id));

  const list = (await db
    .select({
      ...rest,
    })
    .from(runsTable)
    .where(and(...filters))
    .orderBy(desc(runsTable.start_time))
    .limit(isGetNewest ? 100 : limit)) as RunType[];

  const count = await db.$count(runsTable, and(...filters));

  return {
    data: {
      list,
    },
    meta: {
      totalRowCount: count,
    },
  };
}


export async function getRunsByRootId(traceId: string) {
  const { api_key, user_id, ...rest } = getTableColumns(runsTable);

  const list = (await db
    .select({
      ...rest,
    })
    .from(runsTable)
    .where(eq(runsTable.trace_id, traceId))
    .orderBy(asc(runsTable.start_time))) as RunType[];
  return {
    data: {
      list,
    },
  };
}