import { v4 as uuidv4 } from "uuid";
import { QueueEvents, Worker, Queue } from "bullmq";
import _ from "lodash";
import { type IRunInsert, runsTable, apiKeysTable } from "@/lib/pg/schema";
// import * as schema from '@/lib/pg/schema';
import { pg } from "@/lib/pg";
import dayjs from "dayjs";
import { eq, or } from "drizzle-orm";

const defaultApiKey = "cf4ac184-44c8-438e-93d8-9b61f147eb55";

interface IRunTask
  extends Omit<
    IRunInsert,
    "start_time" | "end_time" | "type" | "user_id" | "run_id" | "id"
  > {
  id: string;
  end_time: string;
  start_time: string;
  type: "post" | "patch";
  serverCreatedAt?: string;
}

const runsQueue = new Queue("runs_queue", {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env?.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB!),
  },
  defaultJobOptions: {
    attempts: 10,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

async function getUserIDByApiKey(apiKey: string) {
  const user = await pg.query.apiKeysTable.findFirst({
    where: eq(apiKeysTable.key, apiKey),
  });
  return user?.user_id;
}

const bullMQConnection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env?.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB!),
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runSaveWorker = new Worker<IRunTask>(
  "runs_queue",
  async (job) => {
    const { data } = job;
    data.api_key = data?.api_key || defaultApiKey;

    if (data.type === "post") {
      const userID = await getUserIDByApiKey(data.api_key);
      if (!userID) {
        throw new Error("API Key 无效，未找到对应的用户。");
      }

      const insetData: IRunInsert = {
        ...data,
        id: 0,
        run_id: data.id,
        user_id: userID,
        start_time: data.start_time ? dayjs(data.start_time).toDate() : null,
        end_time: data.end_time ? dayjs(data.end_time).toDate() : null,
        created_at: dayjs().toDate(),
      };
      delete insetData.id;

      const insertRun = await pg
        .insert(runsTable)
        .values(insetData)
        .returning();
      console.log("[post] - [插入成功] - ", insertRun?.[0]?.run_id);
    }

    if (data.type === "patch") {
      const originalData = await pg.query.runsTable.findFirst({
        where: eq(runsTable.run_id, data.id),
      });

      if (!originalData) {
        throw new Error("未找到对应的运行记录。");
      }

      const updateData: IRunInsert = {
        ...originalData,
        updated_at: dayjs().toDate(),
        start_time: data.start_time
          ? dayjs(data.start_time).toDate()
          : originalData.start_time,
        end_time: data.end_time
          ? dayjs(data.end_time).toDate()
          : originalData.end_time,
        error: data.error ? data.error : originalData.error,
        serialized: _.merge({}, originalData.serialized, data.serialized),
        tags: _.uniq([...(originalData?.tags || []), ...(data?.tags || [])]),
        events: _.uniqBy(
          [...(originalData?.events || []), ...(data?.events || [])],
          "name"
        ),
        run_type: data.run_type || originalData.run_type,
        inputs: data.inputs || originalData.inputs,
        outputs: data.outputs || originalData.outputs,
        parent_run_id: data.parent_run_id || originalData.parent_run_id,
        dotted_order: data.dotted_order || originalData.dotted_order,
        session_name: data?.session_name || originalData.session_name,
        trace_id: data.trace_id || originalData.trace_id,
      };
      delete updateData.id;

      const updateRun = await pg
        .update(runsTable)
        .set(updateData)
        .where(eq(runsTable.run_id, data.id))
        .returning();

      console.log("[patch] - [更新成功] - ", updateRun?.[0]?.run_id);
    }
  },
  {
    connection: bullMQConnection,
    concurrency: 1,
  }
);

runSaveWorker.on("completed", async (job) => {
  await job.remove();
  console.log(`Job ${job.id} has completed`);
});

runSaveWorker.on("failed", async (job, err) => {
  console.error(`任务 ${job?.id || "未知ID"} 处理异常: ${err.message}`);
  if ((job?.attemptsMade || 0) >= 5) {
    console.error(`任务 ${job?.id || "未知ID"} 重试次数已达上限`);
    await job?.remove();
  }
});

// runSaveWorker.on("drained", async () => {
//   await runsQueue.clean(1000 * 60 * 60 * 1, 100, "completed");
//   await runsQueue.clean(1000 * 60 * 60 * 24 * 31, 1000, "failed");
// });

setInterval(async () => {
  console.log(`[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] - Running...`);
  await runsQueue.clean(1000 * 60 * 60 * 1, 100, "completed");
  await runsQueue.clean(1000 * 60 * 60 * 24 * 31, 1000, "failed");
}, 5000);
