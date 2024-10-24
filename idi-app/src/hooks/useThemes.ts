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
          .sort((a, b) => {
            if (b.quoteCount !== a.quoteCount) {
              return b.quoteCount - a.quoteCount;
            }
            return a.name.localeCompare(b.name);
          })
          .slice(0, 25),
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  );
}
