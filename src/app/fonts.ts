import { Inter, Hind_Siliguri } from "next/font/google";

/** Latin UI typeface — Figma "Inter" (Regular / Medium / Semi Bold / Bold). */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

/** Bengali typeface — Figma "Hind Siliguri" (Regular). */
export const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  display: "swap",
  variable: "--font-hind-siliguri",
  weight: ["400", "500", "600", "700"],
});
