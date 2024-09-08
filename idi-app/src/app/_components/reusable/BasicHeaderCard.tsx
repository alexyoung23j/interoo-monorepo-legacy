import React from "react";
import BasicCard from "./BasicCard";

interface HeaderItem {
  title: string;
  subtitle: string;
}

interface BasicHeaderCardProps {
  items: HeaderItem[];
  className?: string;
}

const BasicHeaderCard: React.FC<BasicHeaderCardProps> = ({
  items,
  className = "",
}) => {
  return (
    <BasicCard
      className={`flex flex-row items-center justify-between ${className} px-6 py-6 md:px-12`}
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 text-center">
          <h2 className="text-theme-900 text-lg font-semibold">{item.title}</h2>
          <p className="text-theme-500 text-sm font-medium">{item.subtitle}</p>
        </div>
      ))}
    </BasicCard>
  );
};

export default BasicHeaderCard;
