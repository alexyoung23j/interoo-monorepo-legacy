import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface BasicSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const BasicSelect: React.FC<BasicSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  className = "",
  disabled = false,
}) => {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={`flex h-10 w-full items-center justify-between whitespace-nowrap rounded-[4px] border border-theme-100 bg-theme-off-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-theme-400 focus:border-theme-300 focus:outline-none focus:ring-1 focus:ring-theme-300 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 ${className}`}
      >
        <SelectValue placeholder={placeholder} className="text-theme-600" />
      </SelectTrigger>
      <SelectContent className="bg-theme-off-white">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="flex cursor-pointer py-2 text-theme-900 focus:bg-theme-100 focus:text-theme-900"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default BasicSelect;
