"use client";

import _ from "lodash";
import { useRef, useState, useCallback, useMemo } from "react";
import { useAsyncEffect, useRafInterval, useSet, useMap, useScroll } from "ahooks";
import {
  CircleCheck,
  CircleX,
  LayoutDashboard,
  RefreshCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useParams } from "next/navigation";
import { getRunsBySessionNameAction, RunType } from "@/actions/runs";
// 移除 TableVirtuoso 导入

import dayjs from "dayjs";
import { format } from "timeago.js";
import dynamic from "next/dynamic";
import {
  jsonViewDialogRef,
  JsonViewDialogWrapper,
} from "@/components/custom/JsonViewDialog";
import { RunDetailSheet } from "@/app/projects/[sessionName]/RunDetailSheet";
import { Console } from "node:console";

const ReactJsonView = dynamic(() => import("react-json-view"), { ssr: false });

function getSingleStringProperty(obj?: Record<string, any>) {
  if (!obj) {
    return "";
  }
  const keys = Object.keys(obj);
  // 检查对象是否只有一个键
  if (keys.length !== 1) {
    return JSON.stringify(obj);
  }
  const key = keys[0];
  const value = obj[key];
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

export default function Page() {
  const params = useParams();
  const [isFetching, setIsFetching] = useState(true);
  const tableContainerScrollRef = useRef<HTMLElement>(null);
  const tableContainerScrollPositon = useScroll(tableContainerScrollRef);

  const [runs, setRuns] = useState<RunType[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);

  const [runDetailTraceId, setRunDetailTraceId] = useState<string>();
  const [detailOpen, setDetailOpen] = useState(false);

  const getRuns = useCallback(
    async (lastId?: number, isGetNewest = false) => {
      setIsFetching(true);
      console.info("开始拉取列表数据")
      try {
        const res = await getRunsBySessionNameAction(
          params.sessionName as string,
          lastId,
          isGetNewest,
          30
        );
        const list = res.data.list;
        setRuns((prev) => {
          const runMap = new Map();
          prev.forEach((run) => {
            runMap.set(run.id, run);
          });
          list.forEach((run) => {
            runMap.set(run.id, run);
          });
          const newRuns = _.sortBy(Array.from(runMap.values()), (run) => -run.id);
          console.info("拉取列表数据", newRuns);
          return newRuns;
        });
        setRunsTotal(res.meta.totalRowCount);
      } finally {
        console.info("结束拉取列表数据")
        setIsFetching(false);
      }
    },
    [params.sessionName]
  );

  // 滚动加载
  const loadMore = async () => {
    if (isFetching) return;
    if (runs.length === 0) {
      return;
    }
    const lastId = runs[runs.length - 1].id;
    await getRuns(lastId);
  };

  useAsyncEffect(async () => {
    if (runs.length === 0) {
      await getRuns();
      return;
    }

    if (!tableContainerScrollPositon?.top) return;
    const tableContainer = tableContainerScrollRef.current;
    if (!tableContainer) return;
    const scrollClientHeight = tableContainer.clientHeight;
    const scrollHeight = tableContainer.scrollHeight;

    const distanceFromBottom =
      scrollHeight - tableContainerScrollPositon.top - scrollClientHeight;

    if (distanceFromBottom < 150) {
      await loadMore();
    }
  }, [params.sessionName, tableContainerScrollPositon]);

  const isPending = useMemo(
    () => runs.length === 0 && isFetching,
    [runs, isFetching]
  );

  const handleClickRowName = (traceId: string | null) => {
    if (!traceId) return;
    setRunDetailTraceId(traceId);
    setDetailOpen(true);
  };

  return (
    <div className=" h-full flex flex-col">
      <div className="p-2 pl-4">
        <div className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="" />
          <span>Runs</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Recent runs from your project.
        </div>
      </div>
      <div className="flex-1 overflow-auto h-full border-t">
        {isPending ? (
          <div className="flex justify-center items-center h-full">
            <RefreshCcw size={24} className="animate-spin" />
          </div>
        ) : (
          <div ref={tableContainerScrollRef} className="w-full h-full overflow-auto">
            <table className="w-full [&_tr]:border-b text-gray-600">
              <thead>
                <tr className="border-b h-10 bg-gray-50">
                  <th></th>
                  <th className="text-left">Name</th>
                  <th className="text-left">Inputs</th>
                  <th className="text-left">Outputs</th>
                  <th className="text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((row) => (
                  <tr key={row.id}>
                    <td className="w-14 min-w-14">
                      <div className="flex justify-center items-center">
                        {row.error ? (
                          <CircleX color="#ff0000" size={24} />
                        ) : (
                          <CircleCheck color="#199400" size={24} />
                        )}
                      </div>
                    </td>
                    <td className="w-[300px] min-w-[160px] max-w-[320px]">
                      <div
                        className="truncate hover:underline cursor-pointer"
                        onClick={() => handleClickRowName(row.trace_id)}
                      >
                        {row.name}
                      </div>
                      <div className="text-muted-foreground text-sm pt-0.5">
                        <Badge variant="outline" className="font-normal">
                          {row.run_type}
                        </Badge>
                      </div>
                    </td>
                    <td className="max-w-96">
                      <div
                        className="w-full truncate hover:underline cursor-pointer text-sm"
                        onClick={() =>
                          jsonViewDialogRef.current?.openDialog(
                            row.inputs || {},
                            "Inputs",
                            row.name!
                          )
                        }
                      >
                        {getSingleStringProperty(row?.inputs || {})}
                      </div>
                    </td>
                    <td className="max-w-96">
                      <div
                        className="w-full truncate hover:underline cursor-pointer text-sm"
                        onClick={() =>
                          jsonViewDialogRef.current?.openDialog(
                            row.outputs || {},
                            "Outputs",
                            row.name!
                          )
                        }
                      >
                        {getSingleStringProperty(row?.outputs || {})}
                      </div>
                    </td>
                    <td className="w-36 min-w-40">
                      <div className="text-right pr-3">
                        <div className="text-sm">
                          {dayjs(row.start_time).format("YYYY-MM-DD HH:mm:ss")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(row.start_time!)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {isFetching && (
                  <tr>
                    <td colSpan={5}>
                      <div className="bg-white h-8 border-t text-center">
                        Fetching ...
                      </div>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}
      </div>
      <JsonViewDialogWrapper />
      <RunDetailSheet
        open={detailOpen}
        traceId={runDetailTraceId}
        onOpenChange={(show) => setDetailOpen(show)}
      />
    </div>
  );
}
