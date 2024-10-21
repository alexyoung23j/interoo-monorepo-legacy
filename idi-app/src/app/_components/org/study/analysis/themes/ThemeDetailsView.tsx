import React, { useState } from "react";
import BasicCard from "@/app/_components/reusable/BasicCard";
import BasicTag from "@/app/_components/reusable/BasicTag";
import {
  Theme,
  Quote,
  Response,
  Question,
  FollowUpQuestion,
  Favorite,
} from "@shared/generated/client";
import { Star, Trash, ArrowSquareOut, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import QuoteTextField, {
  HighlightReference,
} from "@/app/_components/reusable/QuoteTextField";
import { getColorWithOpacity } from "@/app/utils/color";
import { FullTranscriptBlob } from "@shared/types";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import BasicConfirmationModal from "@/app/_components/reusable/BasicConfirmationModal";

interface ExtendedQuote extends Quote {
  Favorites?: Favorite[];
}

interface ThemeDetailsViewProps {
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
  onClose: () => void;
}

const ThemeDetailsView: React.FC<ThemeDetailsViewProps> = ({
  theme,
  onClose,
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const utils = api.useContext();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<ExtendedQuote | null>(
    null,
  );

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

  const deleteQuoteMutation = api.themes.deleteQuote.useMutation({
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
      toast({
        title: "Quote deleted successfully",
        variant: "default",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting quote",
        description: error.message,
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const removeQuoteFromThemeMutation =
    api.themes.removeQuoteFromTheme.useMutation({
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
        toast({
          title: "Quote removed from theme successfully",
          variant: "default",
          duration: 3000,
        });
      },
      onError: (error) => {
        toast({
          title: "Error removing quote from theme",
          description: error.message,
          variant: "destructive",
          duration: 3000,
        });
      },
    });

  // Group quotes by response
  const responseMap = theme.quotes.reduce((acc, quote) => {
    if (!acc.has(quote.response.id)) {
      acc.set(quote.response.id, { response: quote.response, quotes: [] });
    }
    acc.get(quote.response.id)?.quotes.push(quote);
    return acc;
  }, new Map<string, { response: Response & { question: Question | null; followUpQuestion: FollowUpQuestion | null; interviewSession: { id: string } }; quotes: Quote[] }>());

  const handleGoToResponse = (
    response: Response & {
      question: Question | null;
      followUpQuestion: FollowUpQuestion | null;
      interviewSession: { id: string };
    },
  ) => {
    const url = `/org/${theme.orgId}/study/${theme.studyId}/results?questionId=${response.question?.id ?? response.followUpQuestion?.id}&interviewSessionId=${response.interviewSession.id}&responseId=${response.id}&modalOpen=true`;
    router.push(url);
  };

  const handleToggleFavorite = async (quote: ExtendedQuote) => {
    try {
      const isFavorite = quote.Favorites && quote.Favorites.length > 0;

      const result = await toggleFavoriteMutation.mutateAsync({
        quoteId: quote.id,
        studyId: theme.studyId,
      });

      toast({
        title: result.isFavorite
          ? "Quote added to favorites"
          : "Quote removed from favorites",
        variant: "default",
        duration: 1500,
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error toggling favorite",
        description: "An unexpected error occurred",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleDeleteQuote = (quote: ExtendedQuote) => {
    setQuoteToDelete(quote);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteQuote = async () => {
    if (quoteToDelete) {
      try {
        await deleteQuoteMutation.mutateAsync({
          quoteId: quoteToDelete.id,
        });
      } catch (error) {
        console.error("Error deleting quote:", error);
      }
    }
    setIsDeleteModalOpen(false);
    setQuoteToDelete(null);
  };

  const handleRemoveQuoteFromTheme = (quote: ExtendedQuote) => {
    setQuoteToDelete(quote);
    setIsDeleteModalOpen(true);
  };

  const confirmRemoveQuoteFromTheme = async () => {
    if (quoteToDelete) {
      try {
        await removeQuoteFromThemeMutation.mutateAsync({
          quoteId: quoteToDelete.id,
          themeId: theme.id,
        });
      } catch (error) {
        console.error("Error removing quote from theme:", error);
      }
    }
    setIsDeleteModalOpen(false);
    setQuoteToDelete(null);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="text-lg font-medium text-theme-900">{theme.name}</div>
          <Button
            variant="unstyled"
            size="sm"
            onClick={onClose}
            className="rounded-full p-1 text-theme-900 hover:bg-theme-100"
          >
            <X size={24} />
          </Button>
        </div>
        <p className="text-sm text-theme-600">{theme.description}</p>
        <div className="mt-4 flex flex-col gap-4">
          {Array.from(responseMap.values()).map(({ response, quotes }) => {
            const highlights: HighlightReference[] = quotes.map((quote) => ({
              id: quote.id,
              startWordIndex: quote.wordStartIndex,
              endWordIndex: quote.wordEndIndex,
              color: getColorWithOpacity(theme.tagColor, 0.3),
            }));

            return (
              <BasicCard
                key={response.id}
                className="flex flex-col gap-2 shadow-standard"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-grow pr-4 text-sm font-semibold text-theme-900">
                    {response.followUpQuestion?.title ??
                      response.question?.title ??
                      "Unknown Question"}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Star
                      size={16}
                      weight={
                        (quotes[0] as ExtendedQuote).Favorites &&
                        (quotes[0] as ExtendedQuote).Favorites!.length > 0
                          ? "fill"
                          : "regular"
                      }
                      className={`cursor-pointer ${
                        (quotes[0] as ExtendedQuote).Favorites &&
                        (quotes[0] as ExtendedQuote).Favorites!.length > 0
                          ? "text-yellow-400"
                          : "text-theme-900"
                      }`}
                      onClick={() =>
                        handleToggleFavorite(quotes[0] as ExtendedQuote)
                      }
                    />
                    <Trash
                      size={16}
                      className="cursor-pointer text-theme-900"
                      onClick={() =>
                        handleRemoveQuoteFromTheme(quotes[0] as ExtendedQuote)
                      }
                    />
                  </div>
                </div>
                <div className="text-sm text-theme-600">
                  <QuoteTextField
                    transcriptBlob={
                      response.transcriptionBody as FullTranscriptBlob
                    }
                    highlight={highlights[0] ?? null}
                    className="text-sm text-theme-600"
                    editMode={false}
                  />
                </div>
                <div className="mb-3 mt-2 h-px bg-theme-200" />
                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-sm text-theme-600 hover:text-theme-900"
                    onClick={() => handleGoToResponse(response)}
                  >
                    <ArrowSquareOut size={16} className="mr-2" />
                    Go to response
                  </Button>
                  {response.followUpQuestion && (
                    <BasicTag className="py-0.5 text-xs">
                      Follow-Up Question
                    </BasicTag>
                  )}
                </div>
              </BasicCard>
            );
          })}
        </div>
      </div>
      <BasicConfirmationModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Remove Quote from Theme"
        subtitle="Are you sure you want to remove this quote from the theme? This action cannot be undone."
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmRemoveQuoteFromTheme}
        confirmButtonText="Remove"
        confirmButtonColor="bg-red-600"
      />
    </>
  );
};

export default ThemeDetailsView;
