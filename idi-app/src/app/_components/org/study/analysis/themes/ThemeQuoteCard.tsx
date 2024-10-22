import React, { useState, useEffect } from "react";
import { Star, Trash, ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import BasicCard from "@/app/_components/reusable/BasicCard";
import QuoteTextField, {
  HighlightReference,
} from "@/app/_components/reusable/QuoteTextField";
import { getColorWithOpacity } from "@/app/utils/color";
import { FullTranscriptBlob } from "@shared/types";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import type {
  Theme,
  Response,
  Question,
  FollowUpQuestion,
  Favorite,
  Quote,
} from "@shared/generated/client";

export interface ExtendedQuote extends Quote {
  Favorites?: Favorite[];
}

interface ThemeQuoteCardProps {
  quote: ExtendedQuote;
  theme: Theme & {
    quotes: (ExtendedQuote & {
      response: Response & {
        question: Question | null;
        followUpQuestion: FollowUpQuestion | null;
        interviewSession: { id: string };
      };
    })[];
    studyId: string;
    orgId: string;
  };
  response: Response & {
    question: Question | null;
    followUpQuestion: FollowUpQuestion | null;
    interviewSession: { id: string };
  };
  onGoToResponse: (response: ThemeQuoteCardProps["response"]) => void;
  onRemoveQuoteFromTheme: (quote: ExtendedQuote) => void;
}

const ThemeQuoteCard: React.FC<ThemeQuoteCardProps> = ({
  quote,
  theme,
  response,
  onGoToResponse,
  onRemoveQuoteFromTheme,
}) => {
  const { toast } = useToast();
  const utils = api.useContext();
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavoriteMutation = api.favorites.toggleQuoteFavorite.useMutation({
    onSuccess: () => {
      utils.themes.getThemeDetails
        .invalidate({
          themeId: theme.id,
          studyId: theme.studyId,
          orgId: theme.orgId,
        })
        .catch((error) => {
          console.error("Error invalidating cache:", error);
        });
    },
  });

  useEffect(() => {
    if (quote.Favorites) {
      setIsFavorite(quote.Favorites?.length > 0 ?? false);
    }
  }, [quote.Favorites]);

  const handleToggleFavorite = async () => {
    try {
      setIsFavorite((prev) => !prev);

      toast({
        title: "Favorites updated",
        variant: "default",
        duration: 1500,
      });

      const result = await toggleFavoriteMutation.mutateAsync({
        quoteId: quote.id,
        studyId: theme.studyId,
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setIsFavorite((prev) => !prev); // Revert on error
      toast({
        title: "Error toggling favorite",
        description: "An unexpected error occurred",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const highlight: HighlightReference = {
    id: quote.id,
    startWordIndex: quote.wordStartIndex,
    endWordIndex: quote.wordEndIndex,
    color: getColorWithOpacity(theme.tagColor, 0.3),
  };

  return (
    <BasicCard className="flex flex-col gap-2 shadow-standard">
      <div className="flex items-start justify-between">
        <div className="flex-grow pr-4 text-sm font-semibold text-theme-900">
          {response.followUpQuestion?.title ??
            response.question?.title ??
            "Unknown Question"}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Star
            size={16}
            weight={isFavorite ? "fill" : "regular"}
            className={`cursor-pointer ${isFavorite ? "text-yellow-400" : "text-theme-900"}`}
            onClick={handleToggleFavorite}
          />
          <Trash
            size={16}
            className="cursor-pointer text-theme-900"
            onClick={() => onRemoveQuoteFromTheme(quote)}
          />
        </div>
      </div>
      <div className="text-sm text-theme-600">
        <QuoteTextField
          transcriptBlob={response.transcriptionBody as FullTranscriptBlob}
          highlight={highlight}
          className="text-sm text-theme-600"
          editMode={false}
        />
      </div>
      <div className="mb-2 mt-2 h-px bg-theme-200" />
      <div className="flex items-center justify-start">
        <Button
          variant="secondary"
          size="sm"
          className="text-xs text-theme-600 hover:text-theme-900"
          onClick={() => onGoToResponse(response)}
        >
          <ArrowSquareOut size={14} className="mr-2" />
          See response
        </Button>
      </div>
    </BasicCard>
  );
};

export default ThemeQuoteCard;
