import clsx, { type ClassValue } from "clsx";
import { defineConfig } from "cva";
import { createTwc } from "react-twc";
import { twMerge } from "tailwind-merge";

const cn = (...classes: ClassValue[]) => twMerge(clsx(...classes));

export const twc = createTwc({
  compose: cn,
});

export const { cva, cx, compose } = defineConfig({
  hooks: {
    onComplete: (className) => cn(className),
  },
});

export type { VariantProps } from "cva";
