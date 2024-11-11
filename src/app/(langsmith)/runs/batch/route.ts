import { headers } from "next/headers";
import { IRun } from "@/types/runs";

import { BulkJobOptions, Queue, tryCatch } from "bullmq";

const runsQueue = new Queue("runs_queue", {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env?.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB!),
  },
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  }
});



interface Job {
  name: string;
  data: any;
  opts?: BulkJobOptions;
}

export async function POST(request: Request) {
  try {
    const res = await request.json();

    const postList = res.post || [];
    const patchList = res.patch || [];


    if (postList.length) {
      const posts: Job[] = postList.map((doc: IRun) => {
        const item = {
          name: doc.name,
          data: {
            ...doc,
            type: "post",
            serverCreatedAt: new Date(),
          },
          opts: {
            priority: 10,
          },
        };
        return item;
      });
      const jobs = await runsQueue.addBulk(posts);
    }

    if (patchList.length) {
      const patches: Job[] = patchList.map((doc: IRun) => {
        const item = {
          name: doc.name,
          data: {
            ...doc,
            type: "patch",
            serverCreatedAt: new Date(),
          },
          opts: {
            priority: 20,
          },
        };
        return item;
      });
      const jobs = await runsQueue.addBulk(patches);
    }
  } catch (error) {
  } finally {
    return Response.json(
      {
        message: "Runs batch ingested",
      },
      {
        status: 202,
      }
    );
  }

}
