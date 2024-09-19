import React from "react";
import Image from "next/image";

interface SimpleLayoutProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

const SimpleLayout: React.FC<SimpleLayoutProps> = ({
  children,
  showLogo = true,
}) => {
  return (
    <div className="h-screen w-screen bg-theme-50 p-4">
      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-sm border border-theme-200 bg-theme-off-white">
        {showLogo && (
          <div className="absolute left-4 top-4">
            <Image
              src="/logo_v1.png"
              alt=""
              width={100}
              height={100}
              className="mt-2 max-h-[20px] max-w-[100px] object-contain md:mt-4"
              unoptimized
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default SimpleLayout;
