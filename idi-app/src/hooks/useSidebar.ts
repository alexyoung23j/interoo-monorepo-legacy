import { useCallback } from "react";
import { INNER_SIDEBAR_ROUTES } from "../app/_components/layouts/sidebar/sidebarRoutes";

export function useSidebar(pathname: string) {
  const shouldShowInnerSidebar = useCallback(() => {
    // Check if the current pathname matches any of the inner sidebar routes
    return INNER_SIDEBAR_ROUTES.some((section) =>
      section.items.some((item) => {
        const routePath = item.path.replace(/\[.*?\]/g, "[^/]+");
        const regex = new RegExp(`^${routePath}$`);
        return regex.test(pathname);
      }),
    );
  }, [pathname]);

  return {
    shouldShowInnerSidebar: shouldShowInnerSidebar(),
  };
}
