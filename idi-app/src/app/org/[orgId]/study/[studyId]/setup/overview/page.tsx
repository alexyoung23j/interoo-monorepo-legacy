"use client";

import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicSelect from "@/app/_components/reusable/BasicSelect";
import BasicTextArea from "@/app/_components/reusable/BasicTextArea";
import React, { useState } from "react";

export default function SetupOverviewPage() {
  const [selectedValue, setSelectedValue] = useState("");

  const options = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  return (
    <div className="flex h-full grow flex-col gap-8 bg-theme-off-white p-9">
      <h1 className="mb-4 text-xl font-bold text-theme-800">Themes</h1>
      <div className="text-theme-600">Coming soon!</div>
      <BasicInput
        value="Test"
        onSetValue={() => {
          //
        }}
      />
      <BasicTextArea
        value="Test"
        onSetValue={() => {
          //
        }}
      />
      <BasicSelect
        value={selectedValue}
        onValueChange={setSelectedValue}
        options={options}
        placeholder="Choose an option"
      />
    </div>
  );
}
