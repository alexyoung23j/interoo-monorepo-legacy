import React from "react";

interface SimpleLayoutProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

const SimpleLayout: React.FC<SimpleLayoutProps> = ({
  children,
  showLogo = true,
}) => {
  return (
    <div className="bg-theme-50 h-screen w-screen p-4">
      <div className="bg-theme-off-white border-theme-200 relative flex h-full w-full flex-col items-center justify-center rounded-sm border">
        {showLogo && <div className="absolute left-6 top-6">Logo</div>}
        {children}
      </div>
    </div>
  );
};

export default SimpleLayout;
