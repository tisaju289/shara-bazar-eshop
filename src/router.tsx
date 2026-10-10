import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // A reload must start at the top rather than restore a stale footer position.
  if (typeof window !== "undefined") {
    window.history.scrollRestoration = "manual";
  }
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Public catalog data changes rarely — serve from cache and avoid
        // refetch storms when traffic is high.
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: false,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
