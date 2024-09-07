import React from "react";
import LoginButton from "@/app/_components/auth/LoginButton";
import { GoogleLogo } from "@/app/_components/svg/GoogleLogo";
import SimpleLayout from "../_components/layouts/SimpleLayout";

const ErrorPage: React.FC = () => {
  return (
    <SimpleLayout showLogo={true}>
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-theme-600 mb-4 text-2xl">Something went wrong!</h1>
      </div>
    </SimpleLayout>
  );
};

export default ErrorPage;
