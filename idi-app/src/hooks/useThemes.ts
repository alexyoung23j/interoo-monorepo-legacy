import { api } from "@/trpc/react";
import { Theme } from "@shared/generated/client";

interface ExtendedTheme extends Theme {
  quoteCount: number;
}

export function useThemes(studyId: string) {
  return api.themes.getStudyThemes.useQuery(
    { studyId },
    {
      enabled: !!studyId,
      select: (themes: ExtendedTheme[]) =>
        themes
          .filter((theme) => theme.quoteCount >= 3)
          .sort((a, b) => b.quoteCount - a.quoteCount)
          .slice(0, 25),
    },
  );
}
