import { v4 as uuidv4 } from "uuid";
import { QueueEvents, Worker, Queue } from "bullmq";
import _ from "lodash";
import { type IRunInsert, runsTable, apiKeysTable } from "@/lib/pg/schema";
import { pg } from "@/lib/pg";
import dayjs from "dayjs";
import { eq, or } from "drizzle-orm";

const defaultApiKey = process.env.DEFAULT_API_KEY;

if (!defaultApiKey) {
  throw new Error("未设置默认 API Key");
}

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
    }
  },
  {
    connection: bullMQConnection,
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 1000
    }
  }
);

runSaveWorker.on("completed", async (job) => {
  await job.remove();
});

runSaveWorker.on("failed", async (job, err) => {
  console.error(`任务 ${job?.id || "未知ID"} 处理异常: ${err.message}`);
  if ((job?.attemptsMade || 0) >= 5) {
    console.error(`任务 ${job?.id || "未知ID"} 重试次数已达上限,准备删除任务数据`);
    await job?.remove();
  }
});

const queueEvents = new QueueEvents('runs_queue', {
  connection: bullMQConnection
});

queueEvents.on('waiting', ({ jobId }) => {
  console.log(`任务 ${jobId} 正在等待处理`);
});

queueEvents.on('active', ({ jobId, prev }) => {
  console.log(`任务 ${jobId} 开始处理`);
});

queueEvents.on('stalled', ({ jobId }) => {
  console.error(`任务 ${jobId} 已停滞，可能需要检查`);
});

setInterval(async () => {
  try {
    // 清理30分钟前的已完成任务
    const completed = await runsQueue.clean(1000 * 60 * 5, 1000, "completed");
    console.log(`清理${completed.length}个 5分钟前完成的任务`);
    // 清理24小时前的失败任务
    const failed = await runsQueue.clean(1000 * 60 * 60 * 24, 1000, "failed");
    console.log(`清理${failed.length}个 24小时前的失败任务`);
    // 获取队列状态
    const jobCounts = await runsQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed'
    );
    console.log('队列状态:', jobCounts);
  } catch (error) {
    console.error('清理队列时发生错误:', error);
  }
}, 60 * 1000);
