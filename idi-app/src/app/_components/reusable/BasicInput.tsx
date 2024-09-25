import React from "react";
import { Input } from "@/components/ui/input";

interface BasicInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string | number;
  onSetValue?: (value: string) => void;
}

const BasicInput: React.FC<BasicInputProps> = ({
  value,
  onSetValue,
  className,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSetValue) {
      onSetValue(e.target.value);
    }
  };

  return (
    <Input
      value={value ?? ""}
      onChange={handleChange}
      className={`rounded-[3px] border-theme-100 bg-theme-off-white focus-visible:border-theme-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-theme-300 ${className ?? ""}`}
      {...props}
    />
  );
};

export default BasicInput;
