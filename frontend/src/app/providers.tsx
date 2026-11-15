"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { bootstrapSession } from "@/features/auth/session";
import { getStatus } from "@/lib/errors";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Don't retry client errors (401/403/404 will not fix themselves).
            retry: (count, error) => {
              const s = getStatus(error);
              return count < 2 && (s === undefined || s >= 500);
            },
          },
        },
      }),
  );

  useEffect(() => {
    void bootstrapSession();
  }, []);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
