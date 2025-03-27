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
  lte,
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

export type RunsFilterParams = {
  sessionName?: string;
  startId?: number;
  isGetNewest?: boolean;
  limit?: number;
  startDate?: string;
  endDate?: string;
  inputsFilter?: string;
  outputsFilter?: string;
  statusFilter?: "error" | "success" | "all";
  sessionNameFilter?: string;
};

export async function getRunsBySessionNameAction({
  sessionName,
  startId,
  isGetNewest = false,
  limit = 30,
  startDate,
  inputsFilter,
  outputsFilter,
  statusFilter,
  sessionNameFilter
}: RunsFilterParams) {
  const { api_key, user_id, ...rest } = getTableColumns(runsTable);

  const filters: SQL[] = [];
  
  // 日期过滤
  if (startDate) {
    // 如果用户选择了时间点，查询早于或等于这个时间的数据
    // 使用 timestamptz 类型来正确处理带有时区信息的时间戳
    filters.push(lte(runsTable.start_time, sql`${startDate}::timestamptz`));
    // 同时限制范围不要太大，默认查询选择时间点前一周的数据
    filters.push(gt(runsTable.start_time, sql`(${startDate}::timestamptz) - INTERVAL '1 week'`));
  } else {
    // 默认查询最近一周的数据
    filters.push(gt(runsTable.start_time, sql`NOW() - INTERVAL '1 week'`));
  }
  
  // Session 名称过滤
  if (sessionName) {
    filters.push(eq(runsTable.session_name, sessionName));
  }
  
  // 模糊匹配 session_name
  if (sessionNameFilter) {
    filters.push(sql`${runsTable.session_name} ILIKE ${`%${sessionNameFilter}%`}`);
  }
  
  // 状态过滤
  if (statusFilter === "error") {
    filters.push(sql`${runsTable.error} IS NOT NULL`);
  } else if (statusFilter === "success") {
    filters.push(sql`${runsTable.error} IS NULL`);
  }
  
  // 输入输出过滤 (PostgreSQL JSONB 类型搜索)
  if (inputsFilter) {
    filters.push(sql`${runsTable.inputs}::text ILIKE ${`%${inputsFilter}%`}`);
  }
  
  if (outputsFilter) {
    filters.push(sql`${runsTable.outputs}::text ILIKE ${`%${outputsFilter}%`}`);
  }
  
  // 分页控制
  if (startId) {
    if (isGetNewest) {
      filters.push(gt(runsTable.id, startId));
    } else {
      filters.push(lt(runsTable.id, startId));
    }
  }
  
  // 只显示父级运行
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