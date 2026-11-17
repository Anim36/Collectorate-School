import type { ReactNode } from "react";

import { PortalBottomNav } from "@/components/layout/portal-bottom-nav";
import { PortalSectionProvider } from "@/components/layout/portal-section-context";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import { PortalTopBar } from "@/components/layout/portal-top-bar";
import type { PortalNavConfig } from "@/types/portal";

export interface PortalLayoutProps {
  /** Navigation configuration for the signed-in role. */
  nav: PortalNavConfig;
  /** Name of the signed-in user. */
  userName: string;
  /** Photo of the signed-in user. */
  userPhoto: string;
  /** Alternative text for the photo. */
  userPhotoAlt: string;
  /** Page content rendered below the top bar. */
  children: ReactNode;
}

/**
 * Shared shell for the signed-in portals.
 *
 * Figma shows the same shell for all three roles — "Student / Dashboard"
 * (2:3613 / 2:3718 / 2:3805), "Teacher / Dashboard" (2:6341 / 2:6537 /
 * 2:6701) and "Admin / Dashboard" (2:9503 / 2:9700 / 2:9858):
 *
 * - Desktop (1440): a 240px navy sidebar beside the workspace.
 * - Tablet (768): the sidebar is gone and a 95px bottom tab bar appears.
 * - Mobile (375): the same tab bar, 67px tall.
 *
 * The tab bar is pinned to the bottom of the viewport, so the workspace
 * scrolls behind it.
 */
export function PortalLayout({
  nav,
  userName,
  userPhoto,
  userPhotoAlt,
  children,
}: PortalLayoutProps) {
  return (
    <PortalSectionProvider>
      <div className="flex min-h-screen flex-col bg-background xl:flex-row">
        <div className="hidden xl:flex xl:shrink-0">
          <PortalSidebar
            portalName={nav.portalName}
            items={nav.items}
            labelSize={nav.labelSize}
            iconGap={nav.iconGap}
          />
        </div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col xl:min-h-screen">
          <PortalTopBar
            title={nav.title}
            userName={userName}
            userPhoto={userPhoto}
            userPhotoAlt={userPhotoAlt}
          />

          <main data-portal="content" className="flex-1">
            {children}
          </main>

          <div className="sticky bottom-0 z-40 xl:hidden">
            <PortalBottomNav
              items={nav.bottomItems}
              moreItems={nav.moreItems}
            />
          </div>
        </div>
      </div>
    </PortalSectionProvider>
  );
}
