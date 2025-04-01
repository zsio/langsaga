"use client";

import React, { useState, useMemo } from "react";

import _ from "lodash";
import { useAsyncEffect } from "ahooks";

import Editor from '@monaco-editor/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { getRunsByRootId, RunType } from "@/actions/runs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


export interface RunDetailSheetProps {
  traceId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Run extends RunType {
  children?: Run[];
}

const buildFullTree = (list: Run[]): Run[] => {
  const nodeMap = new Map<string, Run>();
  list.forEach((item) => {
    nodeMap.set(item.run_id, { ...item, children: [] });
  });
  const roots: Run[] = [];
  list.forEach((item) => {
    if (item.parent_run_id) {
      const parentNode = nodeMap.get(item.parent_run_id);
      if (parentNode) {
        parentNode.children!.push(nodeMap.get(item.run_id)!);
      }
    } else {
      roots.push(nodeMap.get(item.run_id)!);
    }
  });
  return roots;
};

const TreeItem = (props: { node: Run; level?: number; handleItemClick?: (runId: Run) => void; activeId?: number },) => {
  const { node, level = 0, handleItemClick, activeId } = props;
  const active = activeId === node.id;
  return (
    <div className="flex flex-col cursor-pointer">
      <div style={{ paddingLeft: level * 20 }} className={cn(" py-2", active && "bg-sky-100")} onClick={() => handleItemClick?.(node)}>
        <div className="pl-1 border-l-2">
          <div className={cn("whitespace-nowrap overflow-hidden text-ellipsis")}>{node.name}</div>
          <div className="text-sm flex gap-1 ">
            <Badge variant="outline" className="text-muted-foreground font-normal	p-1 py-0">{node.run_type}</Badge>
          </div>
        </div>
      </div>
      {node.children?.map((child) => (
        <TreeItem key={child.id} node={child} level={level + 1} handleItemClick={handleItemClick} activeId={activeId} />
      ))}
    </div>
  );
};

export const RunDetailSheet = React.memo(function RunDetailSheet(
  props: RunDetailSheetProps
) {
  const { open, onOpenChange, traceId } = props;
  const [treeData, setTreeData] = useState<Run[]>([]);
  const [activeRun, setActiveRun] = useState<Run | null>(null);

  useAsyncEffect(async () => {
    setTreeData([]);
    setActiveRun(null);
    if (!open) return;
    if (!traceId) return;

    const { data } = await getRunsByRootId(traceId);
    if (!data?.list?.length) return;

    const processedTreeData = buildFullTree(data.list);
    setTreeData(processedTreeData);
  }, [traceId, open]);


  const handleItemClick = (item: Run) => {
    console.log("handleItemClick", item);
    setActiveRun(item);
  };

  const showRunDetail = useMemo(() => {
    return activeRun || treeData[0];
  }, [activeRun, treeData]);



  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[1200px] px-0 text-accent-foreground flex flex-col pb-1">
        <SheetHeader className="pl-2">
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            <span>
            Make changes to your profile re done.
            </span>
          </SheetDescription>
        </SheetHeader>
        <div className="grow pt-4">
          <ResizablePanelGroup direction="horizontal" className="border-t px-2">
            <ResizablePanel defaultSize={20} minSize={10} maxSize={80}>
              {treeData.map((node) => (
                <TreeItem key={node.id} node={node} handleItemClick={handleItemClick} activeId={showRunDetail?.id} />
              ))}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75}>
              <div
                className="accordion-treeview-root h-full overflow-y-auto p-2"
              >
                <Tabs defaultValue="input" className="h-full  flex flex-col">
                  <div>
                    <TabsList>
                      <TabsTrigger value="input">Inputs</TabsTrigger>
                      <TabsTrigger value="output">Outputs</TabsTrigger>
                      <TabsTrigger value="error">error</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="input" className="grow">
                    <div className="flex flex-col border rounded h-full">
                      <div className="font-bold p-2 flex justify-between">
                        <div>{showRunDetail?.name}</div>
                      </div>
                      <div className="p-2 border-t border-b h-[calc(100%_-_10px)]">
                        <Editor
                          height="100%"
                          defaultLanguage="json"
                          value={JSON.stringify(showRunDetail?.inputs || {}, null, 2)}
                          options={
                            {
                              wordWrap: "on",
                              readOnly: true,
                              minimap: { enabled: false },
                            }
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="output" className="grow">
                    <div className="flex flex-col border rounded h-full">
                      <div className="font-bold p-2 flex justify-between">
                        <div>{showRunDetail?.name}</div>
                      </div>
                      <div className="p-2 border-t border-b h-[calc(100%_-_60px)]">
                        <Editor
                          height="100%"
                          defaultLanguage="json"
                          value={JSON.stringify(showRunDetail?.outputs || {}, null, 2)}
                          options={
                            {
                              wordWrap: "on",
                              readOnly: true,
                              minimap: { enabled: false },
                            }
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="error" className="grow">
                    <div className="flex flex-col border rounded h-full">
                      <div className="font-bold p-2 flex justify-between">
                        <div>{showRunDetail?.name}</div>
                      </div>
                      <div className="p-2 border-t border-b h-[calc(100%_-_60px)]">
                        <Editor
                          height="100%"
                          defaultLanguage="json"
                          value={showRunDetail?.error || ""}
                          options={
                            {
                              wordWrap: "on",
                              readOnly: true,
                              minimap: { enabled: false },
                            }
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>







              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
});
