"use client";

import {
  LayoutDashboard,
  RefreshCcw,
  Search,
  Calendar as CalendarIcon,
  Filter,
  Clock,
  X,
  CheckCircle,
  XCircle,
  ListFilter,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

export type FilterState = {
  selectedDate?: Date;
  inputsFilter: string;
  outputsFilter: string;
  statusFilter: "all" | "error" | "success";
  sessionNameFilter: string;
  refreshInterval: number;
};

type ProjectHeaderProps = {
  sessionName?: string;
  totalCount: number;
  filterState: FilterState;
  onFilterChange: (newState: Partial<FilterState>) => void;
  onRefresh: () => void;
  isFetching: boolean;
  hasFilters?: boolean;
  hasTimeFilter?: boolean;
};

export function ProjectHeader({
  sessionName,
  totalCount,
  filterState,
  onFilterChange,
  onRefresh,
  isFetching,
  hasFilters,
  hasTimeFilter
}: ProjectHeaderProps) {
  const {
    selectedDate,
    inputsFilter,
    outputsFilter,
    statusFilter,
    sessionNameFilter,
    refreshInterval
  } = filterState;

  // 清除所有过滤器
  const clearAllFilters = () => {
    onFilterChange({
      selectedDate: undefined,
      inputsFilter: "",
      outputsFilter: "",
      statusFilter: "all",
      sessionNameFilter: ""
    });
    onRefresh();
  };

  // 检查是否有任何过滤条件
  const hasAnyFilter = !!selectedDate ||
    !!inputsFilter || !!outputsFilter ||
    statusFilter !== "all" || !!sessionNameFilter;

  return (
    <div className="bg-white shadow-sm border-b border-gray-100">
      <div className="px-6 py-4 flex flex-wrap items-center gap-4">
        {/* 项目信息区 */}
        <div className="flex items-center gap-2 mr-4">
          <LayoutDashboard className="text-indigo-500 h-5 w-5" />
          <div>
            <h1 className="text-lg font-medium text-gray-800 leading-tight">
              {sessionName}
            </h1>
            <p className="text-xs text-gray-500">
              {totalCount} 条记录
            </p>
          </div>
        </div>

        {/* 日期时间选择器 */}
        <div className="flex-shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-1.5 px-3"
                size="sm"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-gray-500" />
                <span className="font-normal text-sm">
                  {selectedDate ? (
                    <span className="whitespace-nowrap">
                      {dayjs(selectedDate).format("YYYY-MM-DD HH:mm:ss")}
                    </span>
                  ) : (
                    <span className="text-gray-600">最近七天</span>
                  )}
                </span>
                {selectedDate && (
                  <X
                    className="h-3.5 w-3.5 ml-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onFilterChange({ selectedDate: undefined });
                      onRefresh();
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-gray-200" align="start">
              <div className="p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    // 如果选择了日期，设置时间为当前时间
                    if (date) {
                      const now = new Date();
                      date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
                    }
                    // 只更新状态，不触发刷新
                    onFilterChange({ selectedDate: date || undefined });
                  }}
                  initialFocus
                  className="rounded-md"
                />
                {selectedDate && (
                  <div className="mt-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">时</label>
                        <Select
                          value={selectedDate.getHours().toString()}
                          onValueChange={(v) => {
                            const newDate = new Date(selectedDate);
                            newDate.setHours(parseInt(v));
                            // 只更新状态，不触发刷新
                            onFilterChange({ selectedDate: newDate });
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">分</label>
                        <Select
                          value={selectedDate.getMinutes().toString()}
                          onValueChange={(v) => {
                            const newDate = new Date(selectedDate);
                            newDate.setMinutes(parseInt(v));
                            // 只更新状态，不触发刷新
                            onFilterChange({ selectedDate: newDate });
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">秒</label>
                        <Select
                          value={selectedDate.getSeconds().toString()}
                          onValueChange={(v) => {
                            const newDate = new Date(selectedDate);
                            newDate.setSeconds(parseInt(v));
                            // 只更新状态，不触发刷新
                            onFilterChange({ selectedDate: newDate });
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 输入过滤器 */}
        <div className="flex-1 min-w-[180px] max-w-[220px]">
          <div className="flex items-center h-9 px-3 gap-1.5 text-gray-700 border border-gray-200 rounded-md shadow-sm bg-white">
            <Search className="h-3.5 w-3.5 text-gray-400 flex-none" />
            <Input
              placeholder="输入过滤..."
              value={inputsFilter}
              onChange={(e) => onFilterChange({ inputsFilter: e.target.value })}
              className="border-0 shadow-none h-full p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && onRefresh()}
            />
            {inputsFilter && (
              <X
                className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-pointer flex-none"
                onClick={() => {
                  onFilterChange({ inputsFilter: "" });
                  onRefresh();
                }}
              />
            )}
          </div>
        </div>

        {/* 输出过滤器 */}
        <div className="flex-1 min-w-[180px] max-w-[220px]">
          <div className="flex items-center h-9 px-3 gap-1.5 text-gray-700 border border-gray-200 rounded-md shadow-sm bg-white">
            <Search className="h-3.5 w-3.5 text-gray-400 flex-none" />
            <Input
              placeholder="输出过滤..."
              value={outputsFilter}
              onChange={(e) => onFilterChange({ outputsFilter: e.target.value })}
              className="border-0 shadow-none h-full p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && onRefresh()}
            />
            {outputsFilter && (
              <X
                className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-pointer flex-none"
                onClick={() => {
                  onFilterChange({ outputsFilter: "" });
                  onRefresh();
                }}
              />
            )}
          </div>
        </div>

        {/* 状态过滤器 (使用 ToggleGroup) */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1.5 h-9 px-2 border border-gray-200 rounded-md shadow-sm bg-white">
            <ListFilter className="h-3.5 w-3.5 text-gray-500" />
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(value) => {
                if (value) {
                  onFilterChange({ statusFilter: value as "all" | "error" | "success" });
                }
              }}
              className="border-0 bg-transparent"
            >
              <ToggleGroupItem
                value="all"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded",
                  statusFilter === "all" ? "bg-gray-100" : "bg-transparent"
                )}
              >
                全部
              </ToggleGroupItem>
              <ToggleGroupItem
                value="success"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded flex items-center gap-1",
                  statusFilter === "success" ? "bg-gray-100" : "bg-transparent"
                )}
              >
                <CheckCircle className="h-3 w-3" />
                成功
              </ToggleGroupItem>
              <ToggleGroupItem
                value="error"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded flex items-center gap-1",
                  statusFilter === "error" ? "bg-gray-100" : "bg-transparent"
                )}
              >
                <XCircle className="h-3 w-3" />
                错误
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Session 过滤器 - 仅当不在特定会话页面时显示 */}
        {!sessionName && (
          <div className="flex-1 min-w-[180px] max-w-[220px]">
            <div className="flex items-center h-9 px-3 gap-1.5 text-gray-700 border border-gray-200 rounded-md shadow-sm bg-white">
              <span className="text-xs font-medium text-gray-500">Session:</span>
              <Input
                placeholder="会话名称..."
                value={sessionNameFilter}
                onChange={(e) => onFilterChange({ sessionNameFilter: e.target.value })}
                className="border-0 shadow-none h-full p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
                onKeyDown={(e) => e.key === 'Enter' && onRefresh()}
              />
              {sessionNameFilter && (
                <X
                  className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-pointer flex-none"
                  onClick={() => {
                    onFilterChange({ sessionNameFilter: "" });
                    onRefresh();
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* 搜索按钮 */}
        <Button
          onClick={onRefresh}
          className="text-white shadow-sm"
          size="sm"
        >
          <Search size={14} className="mr-1.5" />
          搜索
        </Button>

        {/* 清除过滤器按钮 */}
        {hasAnyFilter && (
          <Button
            variant="ghost"
            onClick={clearAllFilters}
            className="hover:text-gray-700 px-2"
            size="sm"
          >
            清除过滤
          </Button>
        )}

        {
          !hasTimeFilter && (
            <div className="flex items-center gap-2 ml-auto">
              <Select
                value={refreshInterval.toString()}
                onValueChange={(v: string) => onFilterChange({ refreshInterval: Number(v) })}
              >
                <SelectTrigger className="h-9 w-[100px] border-gray-200 bg-white shadow-sm text-sm">
                  <Clock className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                  <SelectValue placeholder="刷新间隔" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3000">3 秒</SelectItem>
                  <SelectItem value="10000">10 秒</SelectItem>
                  <SelectItem value="30000">30 秒</SelectItem>
                  <SelectItem value="60000">1 分钟</SelectItem>
                  <SelectItem value="300000">5 分钟</SelectItem>
                  <SelectItem value="0">OFF</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={onRefresh}
                disabled={isFetching}
                className="h-9 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm"
                variant="outline"
                size="sm"
              >
                <RefreshCcw size={14} className={isFetching ? "animate-spin mr-1.5" : "mr-1.5"} />
                刷新
              </Button>


            </div>
          )
        }

      </div>
    </div>
  );
}
