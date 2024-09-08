import React from "react";

interface BasicTagProps {
  color?: string;
  borderColor?: string;
  fixedWidth?: boolean;
  children: React.ReactNode;
}

const BasicTag: React.FC<BasicTagProps> = ({
  color = "bg-theme-100",
  borderColor = "border-theme-400",
  fixedWidth = true,
  children,
}) => {
  return (
    <div
      className={`text-theme-900 inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium ${color} border ${borderColor} ${
        fixedWidth ? "min-w-20" : ""
      }`}
    >
      {children}
    </div>
  );
};

export default BasicTag;
