"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  OnChangeFn,
  Row,
} from "@tanstack/react-table";
import { LayoutDashboard, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { getRunsBySessionNameAction, RunType } from "@/actions/runs";
import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";

import { columns } from "./columns";
import { DataTable } from "./data-table";

import dayjs from "dayjs";

export default function Page() {
  const params = useParams();
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const fetchSize = 50;
  const { data, fetchNextPage, isFetching, isLoading } = useInfiniteQuery<
    Awaited<ReturnType<typeof getRunsBySessionNameAction>>
  >({
    queryKey: ["runs"],
    queryFn: async ({ pageParam = 0 }) => {
      const start = (pageParam as number) * fetchSize;
      const fetchedData = await getRunsBySessionNameAction(
        params.sessionName as string,
        start,
        fetchSize
      );
      return fetchedData;
    },
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => groups.length,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  // console.log(data);

  return (
    <div className=" h-full flex flex-col">
      <div className="p-6 pt-2">
        <div className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="" />
          <span>Runs</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {}}
            disabled={isLoading}
          >
            <RefreshCcw
              className={`${isLoading ? "animate-spin" : ""} w-4 h-4`}
            />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Recent runs from your project.
        </div>
      </div>
      <div className="flex-1 overflow-auto h-full border-t" onScroll={() => {}}>
        <DataTable columns={columns} data={data?.pages?.[0]?.data?.list || []} />
      </div>
    </div>
  );
}
