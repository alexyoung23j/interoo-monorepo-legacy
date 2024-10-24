import React from "react";

interface BasicTagProps {
  color?: string;
  borderColor?: string;
  fixedWidth?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}

const BasicTag: React.FC<BasicTagProps> = ({
  color = "bg-theme-100",
  borderColor = "border-theme-400",
  fixedWidth = true,
  children,
  className,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  return (
    <div
      className={`${className} inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium text-theme-900 ${color} border ${borderColor} ${
        fixedWidth ? "min-w-20" : ""
      } `}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default BasicTag;
