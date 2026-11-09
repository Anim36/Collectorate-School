"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, Menu } from "lucide-react";
import * as React from "react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { navItems, type NavDropdown } from "@/data/navigation";
import { cn } from "@/lib/utils";

/** Matches the current route, treating nested routes as active too. */
function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopDropdown({ dropdown }: { dropdown: NavDropdown }) {
  const pathname = usePathname();
  const isActive = dropdown.items.some((item) =>
    isActivePath(pathname, item.href),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap text-caption font-medium leading-[1.45] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isActive ? "text-primary" : "text-muted hover:text-primary",
        )}
      >
        {dropdown.label}
        <ChevronDown aria-hidden className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="flex w-[300px] flex-col items-start gap-5 rounded-[12px] border border-border bg-surface p-6 text-ink"
      >
        {dropdown.items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            asChild
            className="h-auto w-full p-0 text-body font-medium leading-[1.45] text-ink focus:bg-transparent focus:text-primary"
          >
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileLink({
  href,
  label,
  nested = false,
}: {
  href: string;
  label: string;
  nested?: boolean;
}) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center rounded-[12px] px-3 text-body leading-[1.45] transition-colors",
        nested ? "text-muted" : "font-medium",
        isActive ? "text-primary" : "text-ink hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
}

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  // The drawer holds the focus while it is open and Escape closes it.
  useFocusTrap(open, onClose, panelRef);

  return (
    <div
      ref={panelRef}
      id="mobile-navigation"
      hidden={!open}
      className="absolute inset-x-0 top-full z-40 border-b border-border bg-surface px-6 pb-8 pt-4 shadow-raised md:hidden"
    >
      <nav aria-label="Mobile" className="flex flex-col">
        {navItems.map((item) =>
          item.kind === "link" ? (
            <MobileLink key={item.href} href={item.href} label={item.label} />
          ) : (
            <React.Fragment key={item.label}>
              <p className="px-3 pb-1 pt-5 text-caption font-bold uppercase tracking-wide text-muted">
                {item.label}
              </p>
              {item.items.map((child) => (
                <MobileLink
                  key={child.label}
                  href={child.href}
                  label={child.label}
                  nested
                />
              ))}
            </React.Fragment>
          ),
        )}

        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[12px] bg-action px-6 text-body font-semibold text-white"
        >
          Login
        </Link>
      </nav>
    </div>
  );
}

function DesktopLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "whitespace-nowrap text-caption font-medium leading-[1.45] transition-colors",
        isActive ? "text-primary" : "text-muted hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
}

/**
 * Sticky site navbar.
 * Figma "Navbar / 1440" (2:16045), "/ 768" (2:16083) and "/ 375" (2:16121):
 * surface background, 24px vertical padding, a 40px book mark (30px on
 * mobile) and the school identity, followed by the primary navigation. The
 * desktop links follow the identity directly with 24px gaps and the theme
 * toggle closes the row; tablet and mobile replace the links with a
 * hamburger drawer while keeping the theme toggle.
 *
 * The frame draws the school name as the placeholder "[School Name]", which
 * is twelve characters wide. The real name is twenty-five, so it is set at
 * 17px on mobile and the identity block is widened, so the name stays on one
 * line and the band keeps the height the frame measures.
 */
export function Navbar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface">
      <div className="relative flex items-center gap-3 px-6 py-6 md:gap-6 md:px-8 xl:gap-6 xl:px-20">
        <BookOpen
          aria-hidden
          className="size-[30px] shrink-0 text-primary md:size-10"
        />

        <Link
          href="/"
          className="flex w-[220px] shrink-0 flex-col items-start overflow-hidden leading-[1.45] md:w-[540px] xl:w-[320px]"
        >
          <span className="max-w-full truncate text-[17px] font-bold leading-[1.45] text-primary md:text-title">
            Narail Collectorate School
          </span>
          <span lang="bn" className="font-bengali text-caption text-muted">
            শিক্ষা • শৃঙ্খলা • মানবতা
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 xl:flex">
          {navItems.map((item) =>
            item.kind === "link" ? (
              <DesktopLink key={item.href} href={item.href} label={item.label} />
            ) : (
              <DesktopDropdown key={item.label} dropdown={item} />
            ),
          )}
        </nav>

        <div className="flex items-center gap-6 xl:gap-4">
          <ThemeToggle className="size-6 shrink-0 rounded-none p-0" />
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation"
            onClick={() => setDrawerOpen((value) => !value)}
            className="flex size-6 items-center justify-center text-ink transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
          >
            <Menu aria-hidden className="size-6" />
          </button>
        </div>

        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </header>
  );
}
