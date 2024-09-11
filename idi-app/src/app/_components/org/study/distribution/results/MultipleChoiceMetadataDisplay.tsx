import { api } from "@/trpc/react";
import React from "react";
import { ChartDataItem, Component as DonutPieChart } from "./DonutPieChart";
import { ListChecks } from "@phosphor-icons/react";

interface MultipleChoiceMetadataDisplayProps {
  questionId: string;
}

const MultipleChoiceMetadataDisplay: React.FC<
  MultipleChoiceMetadataDisplayProps
> = ({ questionId }) => {
  const { data: mcData, isLoading: mcLoading } =
    api.questions.getResponses.useQuery({
      questionId: questionId,
    });

  const { data: mcOptions, isLoading: mcOptionsLoading } =
    api.questions.getMultipleChoiceOptions.useQuery({
      questionId: questionId,
    });

  if (mcLoading || mcOptionsLoading) {
    return <div className="text-theme-700">Loading...</div>;
  }

  if (!mcData || !mcOptions) {
    return <div className="text-theme-700">No data available</div>;
  }

  const responsesWithOption = mcData.filter(
    (response) => response.multipleChoiceOptionId,
  );

  const optionCounts = mcOptions.reduce(
    (acc, option) => {
      acc[option.id] = 0;
      return acc;
    },
    {} as Record<string, number>,
  );

  mcData.forEach((response) => {
    if (response.multipleChoiceOptionId) {
      optionCounts[response.multipleChoiceOptionId]++;
    }
  });

  const chartData: ChartDataItem[] = mcOptions.map((option, index) => ({
    option: option.optionText,
    count: optionCounts[option.id] ?? 0,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

  return (
    <div className="flex flex-col items-start">
      <div className="flex flex-col gap-2">
        <div className="text-theme-900 flex flex-row items-center gap-2 text-base font-medium">
          Multiple Choice Responses{" "}
          <ListChecks size={16} className="text-theme-900" weight="bold" />
        </div>
        <div className="text-theme-600 mb-4 text-sm">
          <span className="text-theme-900 font-semibold">
            {responsesWithOption.length}{" "}
            <span className="text-theme-500 font-normal">Responses</span>
          </span>
        </div>
      </div>
      <DonutPieChart
        chartData={chartData}
        title="Response Distribution"
        description="Multiple Choice Options"
      />
    </div>
  );
};

export default MultipleChoiceMetadataDisplay;
