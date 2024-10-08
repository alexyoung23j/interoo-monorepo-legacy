import React, { useState, useEffect } from "react";
import BasicTag from "./BasicTag";
import type { Theme } from "@shared/generated/client";
import { CaretDown, CaretUp, DotsThree, Trash } from "@phosphor-icons/react";
import BasicPopover from "./BasicPopover";
import { api } from "@/trpc/react";
import { ClipLoader } from "react-spinners";

interface ThemeGroupProps {
  themes: Theme[];
  onThemeHover: (theme: Theme) => void;
  onThemeLeave: () => void;
  responseSelected: boolean;
  handleRemoveThemeFromQuote: (themeId: string) => void;
  isRemovingTheme: boolean;
}

const ThemeGroup: React.FC<ThemeGroupProps> = ({
  themes,
  onThemeHover,
  onThemeLeave,
  responseSelected,
  handleRemoveThemeFromQuote,
  isRemovingTheme,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (responseSelected) {
      setIsOpen(true);
    }
  }, [responseSelected]);

  const toggleOpen = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="h-[1px] w-full bg-theme-200" />
      <div
        className="flex w-full cursor-pointer items-center justify-between gap-2"
        onClick={toggleOpen}
      >
        <div className="text-medium mt-1 text-sm text-theme-900">Themes</div>
        <span className="ml-1 flex items-center text-xs font-light text-theme-600">
          {isOpen ? "hover to highlight" : "click to show"}
          {isOpen ? (
            <CaretUp size={14} className="ml-1 text-theme-900" />
          ) : (
            <CaretDown size={14} className="ml-1 text-theme-900" />
          )}
        </span>
      </div>
      {isOpen && (
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => (
            <BasicTag
              key={theme.id}
              style={{
                borderColor: theme.tagColor,
                backgroundColor: `${theme.tagColor}33`, // 33 represents 20% opacity in hex
              }}
              className="flex gap-2 border py-1 transition-colors duration-200 ease-in-out"
              onMouseEnter={() => onThemeHover(theme)}
              onMouseLeave={onThemeLeave}
            >
              {theme.name}
              <BasicPopover
                trigger={<DotsThree size={20} color="black" />}
                options={[
                  {
                    text: "Remove theme from quote",
                    icon: isRemovingTheme ? (
                      <ClipLoader size={12} color="red" />
                    ) : (
                      <Trash />
                    ),
                    color: "text-red-500",
                    onClick: () => {
                      handleRemoveThemeFromQuote(theme.id);
                    },
                  },
                ]}
              />
            </BasicTag>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeGroup;
