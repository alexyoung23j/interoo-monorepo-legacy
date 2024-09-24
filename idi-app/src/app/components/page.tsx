import React from "react";
import LoginButton from "@/app/_components/auth/LoginButton";
import { GoogleLogo } from "@/app/_components/svg/GoogleLogo";
import SimpleLayout from "../_components/layouts/SimpleLayout";

const ComponentsPage: React.FC = () => {
  return (
    <SimpleLayout showLogo={true}>
      <div className="flex flex-col items-center justify-center gap-4"></div>
    </SimpleLayout>
  );
};

export default ComponentsPage;
