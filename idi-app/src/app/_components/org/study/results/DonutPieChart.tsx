"use client";

import { TrendingUp } from "lucide-react";
import { Pie, PieChart } from "recharts";

import { ChartLegend, ChartLegendContent } from "@/components/ui/chart";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "A donut chart for multiple choice responses";

export interface ChartDataItem {
  option: string;
  count: number;
  fill: string;
}

interface DonutPieChartProps {
  chartData: ChartDataItem[];
  title: string;
  description: string;
}

const colors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function Component({
  chartData,
  title,
  description,
}: DonutPieChartProps) {
  const chartConfig = chartData.reduce((config, item, index) => {
    config[item.option] = {
      label: item.option,
      color: colors[index % colors.length],
    };
    return config;
  }, {} as ChartConfig);

  return (
    <div className="flex w-[50%] flex-col">
      <ChartContainer
        config={chartConfig}
        className="mx-auto flex aspect-square max-h-[400px] min-h-72 w-full justify-start"
      >
        <PieChart className="flex items-start justify-start">
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="option"
            innerRadius={60}
          />
          <ChartLegend
            content={<ChartLegendContent />}
            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
