import React from "react";

interface BasicCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  shouldHover?: boolean;
  className?: string;
}

const BasicCard: React.FC<BasicCardProps> = ({
  children,
  onClick,
  shouldHover = false,
  className = "",
}) => {
  return (
    <div
      onClick={onClick}
      className={`border-theme-200 bg-theme-off-white shadow-standard rounded-sm border p-4 ${shouldHover ? "hover:bg-theme-50 transition-colors duration-200" : ""} ${onClick ? "cursor-pointer" : ""} ${className} `}
    >
      {children}
    </div>
  );
};

export default BasicCard;
