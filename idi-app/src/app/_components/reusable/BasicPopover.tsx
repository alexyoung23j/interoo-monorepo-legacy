import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PopoverOption {
  text: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  color?: string;
  isDivider?: boolean;
}

interface BasicPopoverProps {
  trigger: React.ReactNode;
  options: PopoverOption[];
}

const BasicPopover: React.FC<BasicPopoverProps> = ({ trigger, options }) => {
  return (
    <Popover>
      <PopoverTrigger asChild className="cursor-pointer">
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-auto px-2 py-2">
        <div className="flex flex-col">
          {options.map((option, index) => (
            <React.Fragment key={index}>
              {option.isDivider ? (
                <hr className="my-1 border-theme-200 px-2" />
              ) : (
                <button
                  onClick={option.onClick}
                  className={cn(
                    "flex flex-row items-center justify-between gap-4 rounded-sm px-2 py-2 text-sm transition-colors hover:bg-theme-50",
                    option.color ?? "text-theme-900",
                  )}
                >
                  <span>{option.text}</span>
                  {option.icon && <span className="ml-2">{option.icon}</span>}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BasicPopover;
