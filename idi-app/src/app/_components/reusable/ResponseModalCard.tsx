import React, { useState, useEffect } from "react";
import { CopySimple, Star } from "@phosphor-icons/react";
import type { ExtendedResponse, FullTranscriptBlob } from "@shared/types";
import BasicCard from "./BasicCard";
import BasicTag from "./BasicTag";
import { formatDuration } from "@/app/utils/functions";
import QuoteTextField, { HighlightReference } from "./QuoteTextField";
import type {
  FollowUpQuestion,
  Question,
  Response,
  Theme,
} from "@shared/generated/client";
import ThemeGroup from "./ThemeGroup";
import { getColorWithOpacity } from "@/app/utils/color";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";

interface ResponseModalCardProps {
  response: ExtendedResponse;
  currentResponseId: string;
  showNumber?: boolean;
  onResponseClicked: (response: ResponseModalCardProps["response"]) => void;
  copyIndividualResponse: (
    response: Response & {
      question: Question | null;
      followUpQuestion: FollowUpQuestion | null;
    },
    e: React.MouseEvent,
  ) => void;
  refetchResponses: () => void;
}

export const ResponseModalCard: React.FC<ResponseModalCardProps> = ({
  response,
  currentResponseId,
  showNumber = false,
  onResponseClicked,
  copyIndividualResponse,
  refetchResponses,
}) => {
  const { toast } = useToast();

  const removeThemeFromQuote = api.themes.removeThemeFromQuote.useMutation();
  const createFavorite = api.favorites.createFavorite.useMutation();
  const removeFavorite = api.favorites.removeFavorite.useMutation();
  const [currentHighlight, setCurrentHighlight] =
    useState<HighlightReference | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(response.Favorites?.length > 0 ?? false);
  }, [response.Favorites]);

  const hasTheme = response.Quote?.some(
    (quote) => quote.QuotesOnTheme.length > 0,
  );

  const themes = Array.from(
    new Map(
      response.Quote?.flatMap((quote) =>
        quote.QuotesOnTheme.map((qot) => [qot.theme.id, qot.theme]),
      ),
    ).values(),
  );

  const handleThemeHover = (theme: Theme) => {
    const relatedQuotes = response.Quote.filter((quote) =>
      quote.QuotesOnTheme.some((qot) => qot.theme.id === theme.id),
    );

    if (relatedQuotes.length > 0) {
      const firstQuote = relatedQuotes[0];
      setCurrentHighlight({
        id: theme.id,
        startWordIndex: firstQuote?.wordStartIndex ?? 0,
        endWordIndex: firstQuote?.wordEndIndex ?? 0,
        color: getColorWithOpacity(theme.tagColor, 0.3),
      });
    }
  };

  const handleThemeLeave = () => {
    setCurrentHighlight(null);
  };

  const handleRemoveThemeFromQuote = async (themeId: string) => {
    const quoteWithTheme = response.Quote?.find((quote) =>
      quote.QuotesOnTheme.some((qot) => qot.theme.id === themeId),
    );
    if (quoteWithTheme) {
      await removeThemeFromQuote.mutateAsync({
        quoteId: quoteWithTheme.id,
        themeId,
      });
      refetchResponses();
    } else {
      console.error("No quote found with the given theme");
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite((prev) => !prev);

    if (isFavorite) {
      toast({
        title: "Removed from favorites",
        variant: "default",
        duration: 1500,
      });
      await removeFavorite.mutateAsync({
        favoriteId: response.Favorites[0]?.id ?? "",
      });

      refetchResponses();
    } else {
      toast({
        title: "Response added to Favorites!",
        variant: "default",
        duration: 1500,
      });
      await createFavorite.mutateAsync({
        responseId: response.id,
        studyId: response.question?.studyId ?? "",
      });

      refetchResponses();
    }
  };

  return (
    <BasicCard
      className={`flex cursor-pointer flex-col gap-2 shadow-standard ${
        response.id === currentResponseId ? "shadow-sm" : ""
      }`}
      shouldHover
      isSelected={response.id === currentResponseId}
      onClick={() => onResponseClicked(response)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-grow font-semibold text-theme-900">
          {showNumber
            ? `${(response.question?.questionOrder ?? -1) + 1}: ${response.question?.title ?? ""}`
            : (response.followUpQuestion?.title ??
              response.question?.title ??
              "")}
        </div>
        <div className="flex items-center gap-2">
          <CopySimple
            size={16}
            className="flex-shrink-0 text-theme-900"
            onClick={(e) => copyIndividualResponse(response, e)}
          />
          <Star
            size={16}
            weight={isFavorite ? "fill" : "regular"}
            className={isFavorite ? "text-yellow-400" : "text-theme-900"}
            onClick={handleToggleFavorite}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-theme-500">
        {response.followUpQuestion && (
          <BasicTag className="py-0.5 text-xs">Follow Up</BasicTag>
        )}
        <span className="italic">
          {formatDuration(
            new Date(response.createdAt),
            new Date(response.updatedAt),
          )}
        </span>
      </div>

      <div className="text-theme-600">
        {response.transcriptionBody ? (
          <QuoteTextField
            transcriptBlob={response.transcriptionBody as FullTranscriptBlob}
            highlight={currentHighlight}
            className="text-sm text-theme-600"
            editMode={false}
          />
        ) : (
          <div className="text-sm text-theme-600">
            {response.fastTranscribedText}
          </div>
        )}
      </div>
      {hasTheme && (
        <ThemeGroup
          themes={themes}
          onThemeHover={handleThemeHover}
          onThemeLeave={handleThemeLeave}
          handleRemoveThemeFromQuote={handleRemoveThemeFromQuote}
          responseSelected={response.id === currentResponseId}
          isRemovingTheme={removeThemeFromQuote.isPending}
        />
      )}
    </BasicCard>
  );
};
