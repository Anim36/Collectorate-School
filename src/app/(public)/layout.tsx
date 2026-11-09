import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { TopBar } from "@/components/layout/top-bar";

export const metadata: Metadata = {
  title: {
    default: "Narail Collectorate School · Narail Collectorate School",
    template: "%s · Narail Collectorate School",
  },
  description:
    "Learning today. Leading tomorrow. A digital campus for students, teachers and administrators.",
};

/**
 * Shell for every public page.
 * The utility bar, navbar and footer come from the Figma "Public / Home"
 * frames (2:166 / 2:176 / 2:186) so pages only supply their own content.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
