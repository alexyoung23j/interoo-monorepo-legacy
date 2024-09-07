import { useCallback } from "react";
import { INNER_SIDEBAR_ROUTES } from "../app/_components/layouts/sidebar/sidebarRoutes";

export function useSidebar(pathname: string) {
  const shouldShowInnerSidebar = useCallback(() => {
    // Check if the current pathname matches any of the inner sidebar routes
    return INNER_SIDEBAR_ROUTES.some((section) => {
      if (section.items) {
        // For sections with items
        return section.items.some((item) => matchRoute(item.path, pathname));
      } else if (section.path) {
        // For sections without items (direct routes)
        return matchRoute(section.path, pathname);
      }
      return false;
    });
  }, [pathname]);

  return {
    shouldShowInnerSidebar: shouldShowInnerSidebar(),
  };
}

// Helper function to match route patterns
function matchRoute(routePath: string, pathname: string): boolean {
  const cleanedPath = routePath.replace(/\[.*?\]/g, "[^/]+");
  const regex = new RegExp(`^${cleanedPath}$`);
  return regex.test(pathname);
}
