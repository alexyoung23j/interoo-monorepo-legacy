import React from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

interface SplitScreenLayoutProps {
  mainContent: React.ReactNode;
  rightContent: React.ReactNode;
  showRightContent: boolean;
}

const SplitScreenLayout: React.FC<SplitScreenLayoutProps> = ({
  mainContent,
  rightContent,
  showRightContent,
}) => {
  return (
    <div className="bg-theme-off-white flex h-full w-full flex-row">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={60} minSize={30}>
          <div className="scrollbar-thin flex h-full w-full flex-col overflow-y-auto p-9">
            {mainContent}
          </div>
        </Panel>
        {showRightContent && (
          <>
            <PanelResizeHandle className="bg-theme-200 hover:bg-theme-300 w-[1px] cursor-col-resize hover:w-[2px]" />
            <Panel defaultSize={40} minSize={20}>
              <div className="scrollbar-thin flex h-full w-full flex-col overflow-y-auto p-9">
                {rightContent}
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};

export default SplitScreenLayout;
