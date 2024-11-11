import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { pg } from "@/lib/pg";
import { runsTable } from "@/lib/pg/schema";
import { sql, max } from "drizzle-orm";
import dayjs from "dayjs";
import { ExternalLink } from "lucide-react";


const ProjectsPage = async () => {
  const sessionNames = (
    await pg
      .select({
        session_name: runsTable.session_name,
        count: sql<number>`cast(count(${runsTable.session_name}) as int)`,
        lastTimeDate: max(runsTable.created_at),
      })
      .from(runsTable)
      .groupBy(runsTable.session_name)
  ).map((item) => ({
    ...item,
    lastTime: item.lastTimeDate
      ? dayjs(item.lastTimeDate).format("YYYY-MM-DD HH:mm:ss")
      : null,
  }));

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>所有项目</CardTitle>
        <CardDescription>其下所有项目列表</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {sessionNames.map((sessionName) => (
            <div
              className="border rounded shadow-sm p-3 flex flex-col gap-1 group hover:shadow-md transition-all"
              key={sessionName.session_name}
            >
              <Link
                href={`/projects/${sessionName?.session_name}`}
                className="flex items-center gap-1 cursor-pointer"
              >
                <span>{sessionName?.session_name} </span>
                <ExternalLink size={16} className=" group-hover:opacity-100 opacity-0 transition-all" />
              </Link>
              <div>
                <p className="text-muted-foreground text-sm">
                  Total: {sessionName?.count}
                </p>
                <p className="text-muted-foreground text-sm">
                  Last: {sessionName?.lastTime}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter />
    </Card>
  );
};

export default ProjectsPage;
