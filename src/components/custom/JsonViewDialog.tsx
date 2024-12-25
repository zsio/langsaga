import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { memo } from "react";

const ReactJsonView = dynamic(() => import("react-json-view"), { ssr: false });

const JsonViewDialog = memo(
  forwardRef((props, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewData, setViewData] = useState<Record<string, any>>({});
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const openDialog = useCallback((data: Record<string, any>, title: string, description: string) => {
      setViewData(data);
      setTitle(title);
      setDescription(description);
      setIsOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
      setIsOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({
      openDialog,
    }));

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[70vw]">
          <DialogHeader>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] h-[50vh] overflow-y-auto">
            <ReactJsonView
              src={viewData || {}}
              collapsed={2}
              iconStyle="circle"
              enableClipboard={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  })
);

JsonViewDialog.displayName = "JsonViewDialog";

export const jsonViewDialogRef = React.createRef<{ openDialog: (data: Record<string, any>, title: string, description: string) => void }>();

export const JsonViewDialogWrapper = () => <JsonViewDialog ref={jsonViewDialogRef} />;

