"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes to keep it alive
      refetchOnWindowFocus={true} // Refetch when window regains focus
    >
      {children}
    </SessionProvider>
  );
}
