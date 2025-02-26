import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PopoverOption {
  text: string;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  color?: string;
  className?: string;
  isDivider?: boolean;
}

interface BasicPopoverProps {
  trigger: React.ReactNode;
  options: PopoverOption[];
}

const BasicPopover: React.FC<BasicPopoverProps> = ({ trigger, options }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionClick = (option: PopoverOption, e: React.MouseEvent) => {
    setIsOpen(false);
    option.onClick?.(e);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild className="cursor-pointer">
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-auto px-2 py-2" align="end">
        <div className="flex flex-col outline-none">
          {options.map((option, index) => (
            <React.Fragment key={index}>
              {option.isDivider ? (
                <hr className="my-1 border-theme-200 px-2" />
              ) : (
                <button
                  onClick={(e) => handleOptionClick(option, e)}
                  className={cn(
                    "flex flex-row items-center justify-between gap-4 rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-theme-50",
                    option.color ?? "text-theme-900",
                    option.className,
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
