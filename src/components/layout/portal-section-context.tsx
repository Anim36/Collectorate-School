"use client";

import * as React from "react";

interface PortalSectionValue {
  /** The section the current page publishes, or null when it publishes none. */
  section: string | null;
  /** Publishes the open section. */
  setSection: (section: string | null) => void;
}

const PortalSectionContext = React.createContext<PortalSectionValue>({
  section: null,
  setSection: () => {},
});

/**
 * Lets a page name the section it is showing, so the portal top bar can
 * follow it.
 *
 * Figma draws a different top-bar title for the tabs of a page — "Teacher
 * Portal / Attendance Sheet" above the sheet and "Teacher Portal /
 * Attendance history" above the history. The route alone cannot tell them
 * apart, so the page publishes the open section here.
 */
export function PortalSectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [section, setSection] = React.useState<string | null>(null);

  const value = React.useMemo(
    () => ({ section, setSection }),
    [section],
  );

  return (
    <PortalSectionContext.Provider value={value}>
      {children}
    </PortalSectionContext.Provider>
  );
}

/** The section the current page publishes, or null when it publishes none. */
export function usePortalSection(): string | null {
  return React.useContext(PortalSectionContext).section;
}

/** Publishes the open section of the page. */
export function useSetPortalSection(section: string | null): void {
  const { setSection } = React.useContext(PortalSectionContext);

  React.useEffect(() => {
    setSection(section);
    return () => setSection(null);
  }, [section, setSection]);
}
