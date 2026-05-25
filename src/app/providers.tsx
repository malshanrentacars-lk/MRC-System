"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster as HotToaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
      <HotToaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "16px",
            background: "rgba(15, 23, 42, 0.96)",
            color: "#f8fafc",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 18px 45px rgba(2, 6, 23, 0.45)",
          },
          success: {
            iconTheme: {
              primary: "#22c55e",
              secondary: "#0f172a",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#0f172a",
            },
          },
        }}
      />
    </ThemeProvider>
  );
}
