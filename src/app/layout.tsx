import type { Metadata } from "next";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { hindSiliguri, inter } from "./fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "[School Name] · Narail Collectorate School",
    template: "%s · [School Name]",
  },
  description:
    "Learning today. Leading tomorrow. A digital campus for students, teachers and administrators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${hindSiliguri.variable} font-sans bg-background text-ink`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
