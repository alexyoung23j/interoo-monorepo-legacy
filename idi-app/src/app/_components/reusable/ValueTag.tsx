import React from "react";
import BasicTag from "./BasicTag";

interface ValueTagProps {
  value: string;
  className?: string;
}

const ValueTag: React.FC<ValueTagProps> = ({ value, className }) => {
  return (
    <BasicTag
      color="bg-theme-50"
      borderColor="border-theme-200"
      fixedWidth={false}
      className={`flex flex-row items-center justify-center rounded-sm ${className ?? ""}`}
    >
      {value}
    </BasicTag>
  );
};

export default ValueTag;
