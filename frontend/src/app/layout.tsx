import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TMS", template: "%s · TMS" },
  description: "Transportation management system",
};

// NOT IN USE YET. This script would restore the saved dark/light theme before the first paint.
// To turn it on, put <script dangerouslySetInnerHTML={{ __html: themeScript }} /> inside a <head> below.
const themeScript = `
(function () {
  try {
    const savedTheme = localStorage.getItem("tms.theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const isDark = savedTheme === "dark" ||
      (!savedTheme && prefersDark);

    document.documentElement.classList.toggle("dark", isDark);
  } catch (error) {
    // Ignore localStorage access errors.
  }
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
