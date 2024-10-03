import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface GeneralPopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  align?: "start" | "center" | "end";
}

const GeneralPopover: React.FC<GeneralPopoverProps> = ({
  trigger,
  content,
  align = "end",
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild className="cursor-pointer">
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        {content}
      </PopoverContent>
    </Popover>
  );
};

export default GeneralPopover;
