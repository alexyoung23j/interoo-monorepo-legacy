"use client";
import OauthButton from "@/app/_components/auth/OauthButton";
import React from "react";

const LoginPage = () => {
  return (
    <div>
      <OauthButton provider="google" />
    </div>
  );
};

export default LoginPage;
