import React, { useState } from "react";
import {
  FollowUpLevel,
  Question,
  QuestionType,
  Theme as BaseTheme,
  ThemesOnQuestion,
} from "@shared/generated/client";
import BasicCard from "@/app/_components/reusable/BasicCard";
import { Button } from "@/components/ui/button";
import {
  CaretRight,
  ListChecks,
  Sparkle,
  Waveform,
  CaretDown,
} from "@phosphor-icons/react";
import MultipleChoiceMetadataDisplay from "./MultipleChoiceMetadataDisplay";
import BasicTag from "@/app/_components/reusable/BasicTag";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface ExtendedTheme extends BaseTheme {
  quoteCount: number;
}

interface ResultsQuestionCardProps {
  orgId: string;
  question: Question & {
    _count?: { Response: number };
    ThemesOnQuestion: (ThemesOnQuestion & {
      theme: BaseTheme;
    })[];
  };
  index: number;
  onViewResponses: () => void;
  isSelected: boolean;
  onThemeClick: (themeId: string) => void;
  themes: ExtendedTheme[];
}

const getFollowUpLevelAverage = (level: FollowUpLevel): number => {
  switch (level) {
    case FollowUpLevel.AUTOMATIC:
      return 2;
    case FollowUpLevel.SURFACE:
      return 1;
    case FollowUpLevel.LIGHT:
      return 2;
    case FollowUpLevel.DEEP:
      return 4;
    default:
      return 3;
  }
};

const ResultsQuestionCard: React.FC<ResultsQuestionCardProps> = ({
  question,
  index,
  onViewResponses,
  isSelected,
  orgId,
  onThemeClick,
  themes,
}) => {
  const [showAllThemes, setShowAllThemes] = useState(false);
  const { isFeatureEnabled, isLoading: featureFlagsLoading } =
    useFeatureFlags(orgId);
  const themesEnabled = isFeatureEnabled("themes");

  const relevantThemes = themes
    .filter((theme) => theme.quoteCount >= 3)
    .sort((a, b) => b.quoteCount - a.quoteCount);

  const visibleThemes = showAllThemes
    ? relevantThemes
    : relevantThemes.slice(0, 7);

  const renderThemes = (themesToRender: typeof relevantThemes) => (
    <div className="flex flex-wrap items-center gap-2">
      {themesToRender.map((theme) => (
        <BasicTag
          key={theme.id}
          style={{
            borderColor: theme.tagColor,
            backgroundColor: `${theme.tagColor}33`,
          }}
          className="flex cursor-pointer gap-2 border py-1 transition-colors duration-200 ease-in-out"
          onClick={() => onThemeClick(theme.id)}
        >
          {theme.name}
        </BasicTag>
      ))}
    </div>
  );

  const renderQuestionTypeMetadata = () => {
    switch (question.questionType) {
      case QuestionType.OPEN_ENDED:
        return (
          <div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2 text-base font-medium text-theme-900">
                Responses{" "}
                <Waveform size={16} className="text-theme-900" weight="bold" />
              </div>
              <div className="mb-4 text-sm text-theme-600">
                <div className="flex w-full flex-row items-center gap-6">
                  <span className="font-semibold text-theme-900">
                    {question._count?.Response ?? 0}{" "}
                    <span className="font-normal text-theme-500">
                      Responses
                    </span>
                  </span>

                  <span className="font-semibold text-theme-900">
                    {getFollowUpLevelAverage(question.followUpLevel)}{" "}
                    <span className="font-normal text-theme-500">
                      Avg. Follow Ups
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center gap-2 text-base font-medium text-theme-900">
                Summary{" "}
                <Sparkle size={16} className="text-theme-900" weight="bold" />
              </div>
              <div className="text-sm text-theme-600">
                Summary has not been generated yet.
              </div>
            </div>
            {themesEnabled && relevantThemes.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex flex-col">
                  <div className="flex flex-row items-center gap-2 text-base font-medium text-theme-900">
                    Themes{" "}
                    <ListChecks
                      size={16}
                      className="text-theme-900"
                      weight="bold"
                    />
                  </div>
                  <div className="text-sm text-theme-600">
                    Themes capture the big picture ideas communicated by your
                    respondents.
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {renderThemes(visibleThemes)}
                  {relevantThemes.length > 7 && (
                    <Button
                      variant="unstyled"
                      size="sm"
                      onClick={() => setShowAllThemes(!showAllThemes)}
                      className="flex h-auto items-center gap-1 whitespace-nowrap p-0 text-theme-600"
                    >
                      {showAllThemes
                        ? "Hide"
                        : `See ${relevantThemes.length - 7} more`}
                      <CaretDown
                        size={16}
                        className={`transition-transform ${showAllThemes ? "rotate-180" : ""}`}
                      />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case QuestionType.MULTIPLE_CHOICE:
        return <MultipleChoiceMetadataDisplay questionId={question.id} />;
      case QuestionType.RANGE:
        return <div>Coming Soon!</div>;
    }
  };
  return (
    <BasicCard
      className={`flex flex-col gap-4 p-6 shadow-standard ${
        isSelected ? "!bg-theme-50" : ""
      }`}
    >
      <div className="flex flex-row items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-theme-900">
          {`Question ${index + 1}: `}
          {question.title}
        </h3>
        <Button
          variant="secondary"
          className="flex flex-row items-center"
          size="sm"
          onClick={onViewResponses}
        >
          <span>See Responses</span>
          <CaretRight className="ml-2" size={16} />
        </Button>
      </div>
      <div className="h-[1px] w-full bg-theme-200" />
      {renderQuestionTypeMetadata()}
    </BasicCard>
  );
};

export default ResultsQuestionCard;
