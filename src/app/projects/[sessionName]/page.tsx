"use client";

import _ from "lodash";
import { useRef, useState, useCallback, useMemo } from "react";
import { useAsyncEffect, useRafInterval, useSet, useMap, useScroll } from "ahooks";
import {
  CircleCheck,
  CircleX,
  RefreshCcw
} from "lucide-react";

import { useParams } from "next/navigation";
import { getRunsBySessionNameAction, RunType } from "@/actions/runs";

// 导入头部组件
import { ProjectHeader, type FilterState } from "./ProjectHeader";

// UI 组件
import { Button } from "@/components/ui/button";

import dayjs from "dayjs";
import { format } from "timeago.js";
import {
  jsonViewDialogRef,
  JsonViewDialogWrapper,
} from "@/components/custom/JsonViewDialog";
import { RunDetailSheet } from "@/app/projects/[sessionName]/RunDetailSheet";

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
  const [error, setError] = useState<string | null>(null);
  const [hasMoreData, setHasMoreData] = useState(true);
  const tableContainerScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerScrollPositon = useScroll(tableContainerScrollRef);

  const [runs, setRuns] = useState<RunType[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);

  // 过滤条件状态
  const [filterState, setFilterState] = useState<FilterState>({
    selectedDate: undefined,
    inputsFilter: "",
    outputsFilter: "",
    statusFilter: "all",
    sessionNameFilter: "",
    refreshInterval: 3000 // 默认刷新间隔
  });

  const [runDetailTraceId, setRunDetailTraceId] = useState<string>();
  const [detailOpen, setDetailOpen] = useState(false);

  const getRuns = useCallback(
    async (lastId?: number, isGetNewest = false) => {
      // 如果已经在获取数据中且不是初始加载（runs.length > 0），则不重复获取
      if (isFetching && runs.length > 0) return;
      setIsFetching(true);
      setError(null);
      try {
        const { selectedDate, inputsFilter, outputsFilter, statusFilter, sessionNameFilter } = filterState;
        
        // 准备过滤参数
        const filterParams = {
          sessionName: params.sessionName as string,
          startId: lastId,
          isGetNewest,
          limit: 30,
          // 日期过滤 - 现在只使用单个时间点
          // 添加时区偏移信息，确保时间正确
          startDate: selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD HH:mm:ss Z') : undefined,
          // 其他过滤条件
          inputsFilter: inputsFilter || undefined,
          outputsFilter: outputsFilter || undefined,
          statusFilter: statusFilter === 'all' ? undefined : statusFilter,
          sessionNameFilter: sessionNameFilter || undefined
        };
        
        const res = await getRunsBySessionNameAction(filterParams);
        const list = res.data.list;
        
        // 如果获取的数据为空且不是获取最新数据，说明没有更多数据了
        if (list.length === 0 && !isGetNewest) {
          setHasMoreData(false);
          return;
        }
        
        // 如果是过滤后的新查询或者初始加载，直接替换数据
        if (runs.length === 0 || (isGetNewest === false && lastId === undefined)) {
          const newRuns = _.sortBy(list, (run) => -run.id);
          setRuns(newRuns);
        } else {
          // 否则合并数据
          setRuns((prev) => {
            const runMap = new Map();
            prev.forEach((run) => {
              runMap.set(run.id, run);
            });
            list.forEach((run) => {
              runMap.set(run.id, run);
            });
            const newRuns = _.sortBy(Array.from(runMap.values()), (run) => -run.id);
            return newRuns;
          });
        }
        setRunsTotal(res.meta.totalRowCount);
      } catch (err) {
        console.error("获取数据失败", err);
        setError(err instanceof Error ? err.message : "获取数据失败，请重试");
      } finally {
        setIsFetching(false);
      }
    },
    [params.sessionName, isFetching, runs.length, filterState]
  );

  // 上一次过滤条件的引用
  const prevFilterStateRef = useRef<FilterState | null>(null);

  // 刷新数据
  const refreshData = useCallback(async () => {
    setHasMoreData(true); // 重置加载状态
    
    // 检查过滤条件是否有变化
    const hasFilters = !!filterState.selectedDate || 
                     !!filterState.inputsFilter || 
                     !!filterState.outputsFilter || 
                     filterState.statusFilter !== "all" || 
                     !!filterState.sessionNameFilter;
    
    // 检查过滤条件是否发生变化
    const filterChanged = !prevFilterStateRef.current || 
                         prevFilterStateRef.current.selectedDate !== filterState.selectedDate ||
                         prevFilterStateRef.current.inputsFilter !== filterState.inputsFilter ||
                         prevFilterStateRef.current.outputsFilter !== filterState.outputsFilter ||
                         prevFilterStateRef.current.statusFilter !== filterState.statusFilter ||
                         prevFilterStateRef.current.sessionNameFilter !== filterState.sessionNameFilter;
    
    // 更新过滤条件引用
    prevFilterStateRef.current = {...filterState};
    
    // 如果有过滤条件且过滤条件发生了变化，清空当前数据并从头开始获取
    if (hasFilters && filterChanged) {
      setRuns([]);
      await getRuns(undefined, false);
    } else {
      // 没有过滤条件或过滤条件没有变化，获取最新数据
      const firstId = runs.length > 0 ? runs[0].id : undefined;
      await getRuns(firstId, true);
    }
  }, [getRuns, runs, filterState]);
  
  // 处理过滤条件变化
  const handleFilterChange = useCallback((newState: Partial<FilterState>) => {
    setFilterState(prev => ({ ...prev, ...newState }));
    
    // 只有当刷新间隔变化时才自动触发刷新
    // 其他过滤条件变化需要用户点击搜索按钮才会触发
    if ('refreshInterval' in newState && newState.refreshInterval !== undefined) {
      // 刷新间隔变化不需要清空数据
    }
  }, []);
  
  // 准备搜索（当点击搜索按钮时调用）
  const prepareSearch = useCallback(() => {
    // 清空当前数据
    setRuns([]);
    // 重置加载状态
    setHasMoreData(true);
    // 重置错误状态
    setError(null);
    // 触发数据获取
    getRuns();
  }, [getRuns]);

  // 滚动加载
  const loadMore = useCallback(async () => {
    if (isFetching || !hasMoreData) return;
    if (runs.length === 0) {
      return;
    }
    const lastId = runs[runs.length - 1].id;
    await getRuns(lastId);
  }, [getRuns, runs, isFetching, hasMoreData]);

  // 初始加载和滚动监听
  useAsyncEffect(async () => {
    if (runs.length === 0) {
      await getRuns();
      return;
    }

    if (!tableContainerScrollPositon?.top || !hasMoreData) return;
    const tableContainer = tableContainerScrollRef.current;
    if (!tableContainer) return;
    const scrollClientHeight = tableContainer.clientHeight;
    const scrollHeight = tableContainer.scrollHeight;

    const distanceFromBottom =
      scrollHeight - tableContainerScrollPositon.top - scrollClientHeight;

    if (distanceFromBottom < 150) {
      await loadMore();
    }
  }, [params.sessionName, tableContainerScrollPositon, hasMoreData]);

  // 计算是否有过滤条件
  const hasFilters = useMemo(() => {
    return !!filterState.selectedDate || 
           !!filterState.inputsFilter || 
           !!filterState.outputsFilter || 
           filterState.statusFilter !== "all" || 
           !!filterState.sessionNameFilter;
  }, [filterState]);

  const hasTimeFilter = useMemo(() => {
    return !!filterState.selectedDate;
  }, [filterState.selectedDate]);

  // 定时自动刷新
  useRafInterval(() => {
    // 只有当没有时间过滤条件时才进行自动刷新
    // 其他过滤条件（状态、输入输出等）不影响自动刷新
    if (filterState.refreshInterval > 0 && !hasTimeFilter) {
      refreshData();
    }
  }, filterState.refreshInterval || 999999); // 如果设置为0，使用一个很大的值来模拟"关闭"

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
      <ProjectHeader 
        sessionName={params.sessionName as string}
        totalCount={runsTotal}
        filterState={filterState}
        onFilterChange={handleFilterChange}
        onRefresh={prepareSearch}
        isFetching={isFetching}
        hasFilters={hasFilters}
        hasTimeFilter={hasTimeFilter}
      />
      <div className="flex-1 overflow-auto h-full border-t border-gray-100">
        {isPending ? (
          <div className="flex justify-center items-center h-full">
            <div className="flex flex-col items-center gap-3">
              <RefreshCcw size={24} className="animate-spin text-indigo-500" />
              <span className="text-sm text-gray-500">加载数据中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full">
            <div className="flex flex-col items-center gap-3">
              <CircleX size={24} className="text-red-500" />
              <span className="text-sm text-gray-500">{error}</span>
              <button 
                onClick={() => getRuns()} 
                className="mt-2 px-3 py-1.5 text-sm rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        ) : (
          <div ref={tableContainerScrollRef} className="w-full h-full overflow-auto bg-white">
            <table className="w-full border-collapse text-gray-700">
              <thead className="sticky top-0 z-10">
                <tr className="border-b h-12 bg-gray-50">
                  <th className="text-left px-4 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 font-medium text-gray-600">Inputs</th>
                  <th className="text-left px-4 font-medium text-gray-600">Outputs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map((row) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-gray-50/50 transition-all duration-150 ease-in-out"
                  >
                    <td className="w-[320px] min-w-[200px] max-w-[350px] py-3 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          
                          <div 
                            onClick={() => handleClickRowName(row.trace_id)}
                            className="relative group flex-1 min-w-0"
                          >
                            <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-medium text-gray-800 hover:text-indigo-600 cursor-pointer transition-colors">
                              <span className="overflow-hidden text-ellipsis">{row.name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-shrink-0">
                            {row.error ? (
                              <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                                <CircleX color="#f43f5e" size={16} />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center">
                                <CircleCheck color="#10b981" size={16} />
                              </div>
                            )}
                          </div>
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                            {row.run_type}
                          </span>
                          
                        </div>
                      </div>
                    </td>
                    <td className="w-36 min-w-36 py-3 px-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-800">
                          {dayjs(row.start_time).format("MM-DD")}
                          <span className="text-gray-500 ml-2 font-normal">{dayjs(row.start_time).format("HH:mm")}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {format(row.start_time!)}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-96 py-3 px-4">
                      <div
                        className="w-full truncate hover:text-indigo-600 cursor-pointer text-sm transition-colors"
                        onClick={() =>
                          jsonViewDialogRef.current?.openDialog(
                            row.inputs || {},
                            "Inputs",
                            row.name!
                          )
                        }
                      >
                        <span className="text-gray-400 mr-1.5">{"{ "}</span>
                        {getSingleStringProperty(row?.inputs || {})}
                        <span className="text-gray-400 ml-1.5">{" }"}</span>
                      </div>
                    </td>
                    <td className="max-w-96 py-3 px-4">
                      <div
                        className="w-full truncate hover:text-indigo-600 cursor-pointer text-sm transition-colors"
                        onClick={() =>
                          jsonViewDialogRef.current?.openDialog(
                            row.outputs || {},
                            "Outputs",
                            row.name!
                          )
                        }
                      >
                        <span className="text-gray-400 mr-1.5">{"{ "}</span>
                        {getSingleStringProperty(row?.outputs || {})}
                        <span className="text-gray-400 ml-1.5">{" }"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {isFetching && runs.length > 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="bg-white h-12 border-t border-gray-100 text-center py-3 text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCcw size={14} className="animate-spin text-indigo-500" />
                          <span className="text-sm">加载更多...</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {!hasMoreData && runs.length > 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="bg-white h-12 border-t border-gray-100 text-center py-3 text-gray-500">
                        <span className="text-sm">没有更多数据了</span>
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
