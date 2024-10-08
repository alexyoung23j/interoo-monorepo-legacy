import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface TabOption {
  title: string;
  icon?: React.ReactNode;
  value: string;
}

interface BasicTabsProps {
  options: TabOption[];
  onValueChange: (value: string) => void;
  defaultValue?: string;
  className?: string;
}

const BasicTabs: React.FC<BasicTabsProps> = ({
  options,
  onValueChange,
  defaultValue,
  className,
}) => {
  return (
    <Tabs
      defaultValue={defaultValue ?? options[0]?.value}
      onValueChange={onValueChange}
      className={cn("w-full", className)}
    >
      <TabsList className="flex w-fit justify-start rounded-sm bg-theme-100 text-sm">
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className="flex items-center gap-2 rounded-sm px-6 text-sm data-[state=active]:bg-theme-off-white data-[state=active]:text-theme-900"
          >
            {option.icon}
            <span>{option.title}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default BasicTabs;
