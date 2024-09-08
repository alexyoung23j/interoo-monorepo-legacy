import React, { ReactNode } from "react";

interface TitleLayoutProps {
  title: string;
  rightElement?: ReactNode;
  children: ReactNode;
}

const TitleLayout: React.FC<TitleLayoutProps> = ({
  title,
  rightElement,
  children,
}) => {
  return (
    <div className="bg-theme-off-white flex h-full flex-col items-center pt-10">
      <div className="flex w-[80%] flex-col items-start gap-4">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-theme-900 text-2xl font-semibold">{title}</h1>
          {rightElement && <div>{rightElement}</div>}
        </div>
        <div className="bg-theme-200 h-[1px] w-full" />
      </div>
      <div className="mt-6 w-[80%] flex-grow py-4">{children}</div>
    </div>
  );
};

export default TitleLayout;
