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
      className={`${className} rounded-sm border border-theme-200 bg-theme-off-white p-4 ${shouldHover ? "transition-colors duration-200 hover:bg-theme-50" : ""} ${onClick ? "cursor-pointer" : ""} `}
    >
      {children}
    </div>
  );
};

export default BasicCard;
