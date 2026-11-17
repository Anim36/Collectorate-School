import type { Metadata } from "next";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { TopBar } from "@/components/layout/top-bar";
import { SITE, SITE_DESCRIPTION, siteUrl } from "@/config/site";
import { countPublicNotices } from "@/server/services/public-notices";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: SITE.name,
    template: `%s · ${SITE.name}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: siteUrl(),
  },
};

/**
 * Shell for every public page.
 * The utility bar, navbar and footer come from the Figma "Public / Home"
 * frames (2:166 / 2:176 / 2:186) so pages only supply their own content.
 *
 * The navbar reads the count of the published public notices from the
 * database, so the bell carries the number the school really has. The read
 * is cached and revalidated by tag, so the shell stays cheap to render.
 */
export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const noticeCount = await countPublicNotices();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <Navbar noticeCount={noticeCount} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
