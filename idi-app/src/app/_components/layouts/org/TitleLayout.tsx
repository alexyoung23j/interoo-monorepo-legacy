import React, { ReactNode } from "react";

interface TitleLayoutProps {
  title: string;
  rightElement?: ReactNode;
  children: ReactNode;
  className?: string;
}

const TitleLayout: React.FC<TitleLayoutProps> = ({
  title,
  rightElement,
  children,
  className,
}) => {
  return (
    <div className="flex h-full flex-col items-center pt-10">
      <div className="flex w-[80%] flex-col items-start gap-4">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-2xl font-semibold text-theme-900">{title}</h1>
          {rightElement && <div>{rightElement}</div>}
        </div>
        <div className="h-[1px] w-full bg-theme-200" />
      </div>
      <div className={`mt-6 w-[80%] flex-grow py-4 ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default TitleLayout;
