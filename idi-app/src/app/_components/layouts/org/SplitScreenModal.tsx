import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { DotsSixVertical, DotsThreeVertical } from "@phosphor-icons/react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface SplitScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  topContent: React.ReactNode;
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
}

const SplitScreenModal: React.FC<SplitScreenModalProps> = ({
  isOpen,
  onClose,
  topContent,
  leftContent,
  rightContent,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[96vh] max-w-[98vw] flex-col gap-8 overflow-hidden !rounded-sm bg-theme-off-white px-16 py-10">
        <VisuallyHidden.Root>
          <DialogTitle>Split Screen</DialogTitle>
        </VisuallyHidden.Root>
        <div className="flex w-full flex-col">{topContent}</div>
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={55} minSize={30} className="overflow-hidden">
              <div className="h-full overflow-y-auto pl-1 pr-2 scrollbar-thin">
                {leftContent}
              </div>
            </Panel>
            <PanelResizeHandle className="group relative flex w-6 cursor-col-resize items-center justify-center outline-none">
              <div className="absolute h-full w-[1px] bg-theme-off-white transition-colors group-hover:bg-theme-100/80"></div>
              <DotsSixVertical
                size={20}
                weight="bold"
                className="relative z-10 text-theme-400 transition-colors group-hover:text-theme-600"
              />
            </PanelResizeHandle>
            <Panel defaultSize={45} minSize={30} className="overflow-hidden">
              <div className="h-full overflow-y-auto pl-2 pr-1 scrollbar-thin">
                {rightContent}
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SplitScreenModal;
