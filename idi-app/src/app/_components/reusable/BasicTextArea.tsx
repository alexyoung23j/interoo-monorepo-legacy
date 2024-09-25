import React from "react";
import { Textarea } from "@/components/ui/textarea";

interface BasicTextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value?: string;
  onSetValue?: (value: string) => void;
}

const BasicTextArea: React.FC<BasicTextAreaProps> = ({
  value,
  onSetValue,
  className,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onSetValue) {
      onSetValue(e.target.value);
    }
  };

  return (
    <Textarea
      value={value ?? ""}
      onChange={handleChange}
      className={`rounded-[3px] border-theme-100 bg-theme-off-white shadow-standard focus:border-theme-300 focus:outline-none focus:ring-1 focus:ring-theme-200 [&:focus]:border-theme-300 [&:focus]:ring-1 [&:focus]:ring-theme-200 ${className ?? ""}`}
      {...props}
    />
  );
};

export default BasicTextArea;
