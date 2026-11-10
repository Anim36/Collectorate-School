"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, ChevronDown, Heart, Menu, Star } from "lucide-react";
import * as React from "react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navItems, type NavDropdown } from "@/data/navigation";
import { notices } from "@/data/notices";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/utils";

/** Matches the current route, treating nested routes as active too. */
function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The rounded glass pill that holds the primary navigation. */
const navPillClass =
  "flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-1.5 backdrop-blur-xl";

/** A label inside the pill, active or not. */
const navItemClass =
  "relative whitespace-nowrap rounded-full px-3 py-2 text-body font-semibold leading-[1.45] text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

/** An icon button in the right-hand utility group. */
const utilityButtonClass =
  "flex size-10 shrink-0 items-center justify-center rounded-full text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0";

function DesktopDropdown({ dropdown }: { dropdown: NavDropdown }) {
  const pathname = usePathname();
  const isActive = dropdown.items.some((item) =>
    isActivePath(pathname, item.href),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          navItemClass,
          "inline-flex items-center gap-1.5",
          isActive && "text-white",
        )}
      >
        {dropdown.label}
        <ChevronDown aria-hidden className="size-4 opacity-70" />
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

function DesktopLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        navItemClass,
        // The open page is underlined, the way the reference marks "Home".
        isActive &&
          "font-bold text-white after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-white",
      )}
    >
      {label}
    </Link>
  );
}

/** An icon in the right-hand utility group, linking to a page. */
function UtilityLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={utilityButtonClass}
    >
      {children}
    </Link>
  );
}

/** The notification bell, carrying the count of published notices. */
function NotificationBell() {
  return (
    <Link
      href="/notice"
      aria-label={`Notice board, ${notices.length} notices`}
      title="Notice board"
      className={cn(utilityButtonClass, "relative")}
    >
      <Bell aria-hidden className="size-5" />
      <span className="absolute -right-1 -top-1 flex min-w-[22px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-[1.45] text-destructive-foreground">
        {notices.length}
      </span>
    </Link>
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
        nested ? "text-white/70" : "font-medium text-white",
        isActive ? "bg-white/10 text-white" : "hover:bg-white/10",
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
      className="absolute inset-x-0 top-full z-40 max-h-[calc(100vh-96px)] overflow-y-auto border-b border-white/10 bg-navy/95 px-6 pb-8 pt-4 backdrop-blur-xl md:max-h-[calc(100vh-102px)] xl:hidden"
    >
      <nav aria-label="Mobile" className="flex flex-col">
        {navItems.map((item) =>
          item.kind === "link" ? (
            <MobileLink key={item.href} href={item.href} label={item.label} />
          ) : (
            <React.Fragment key={item.label}>
              <p className="px-3 pb-1 pt-5 text-caption font-bold uppercase tracking-wide text-white/60">
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
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[12px] bg-white px-6 text-body font-semibold text-navy transition-colors hover:bg-white/90"
        >
          Login
        </Link>
      </nav>
    </div>
  );
}

/**
 * Sticky site navbar.
 *
 * The band follows the reference picture: a blurred campus photograph behind
 * a navy scrim, the school crest and wordmark on the left, the primary
 * navigation in a centred rounded glass pill and a utility icon group on the
 * right (apply, portal, theme and the notice board with its count badge).
 * The open page is underlined inside the pill.
 *
 * Below the large breakpoint the pill is replaced by the hamburger drawer,
 * while the crest, the wordmark and the utility icons stay in the band.
 */
export function Navbar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // A route change closes the drawer behind the reader.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50">
      {/* The blurred photograph that fills the band behind the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <Image
          src="/images/campus.jpg"
          alt=""
          fill
          sizes="100vw"
          className="scale-110 object-cover blur-md"
        />
        <div className="absolute inset-0 bg-navy/75" />
      </div>

      {/* On the large breakpoint the row becomes a three-column grid, so the
          navigation pill sits in the middle of the band whatever the widths
          of the brand and the utility group.

          The band keeps the height the Figma navbar frames measure (96px on
          mobile, 102px from the tablet breakpoint up), so the page below it
          starts where the design says it starts. The row is centred in that
          height, so the picture proportions are kept. */}
      <div className="relative flex min-h-[96px] items-center gap-3 px-4 py-3 md:min-h-[102px] md:gap-5 md:px-8 xl:grid xl:grid-cols-[1fr_auto_1fr] xl:gap-6 xl:px-12">
        <Link
          href="/"
          aria-label="Narail Collectorate School — home"
          className="flex shrink-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
            <BookOpen aria-hidden className="size-5" />
          </span>

          <span className="flex items-center gap-3 text-white">
            
            
            <span className="hidden text-body-lg font-semibold leading-none sm:inline">
               Narail Collectorate School
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center xl:flex">
          <ul className={navPillClass}>
            {navItems.map((item) =>
              item.kind === "link" ? (
                <li key={item.href}>
                  <DesktopLink href={item.href} label={item.label} />
                </li>
              ) : (
                <li key={item.label}>
                  <DesktopDropdown dropdown={item} />
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:justify-self-end xl:gap-3">
          <span className="hidden sm:block">
            <UtilityLink href="/admission" label="Apply now">
              <Star aria-hidden className="size-5" />
            </UtilityLink>
          </span>

          <span className="hidden sm:block">
            <UtilityLink href="/student" label="Student portal">
              <Heart aria-hidden className="size-5" />
            </UtilityLink>
          </span>

          <ThemeToggle className="size-10 shrink-0 rounded-full bg-transparent p-0 text-white/90 hover:bg-white/10 hover:text-white focus-visible:ring-offset-0 [&_svg]:size-5" />

          <NotificationBell />

          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation"
            onClick={() => setDrawerOpen((value) => !value)}
            className="flex size-10 items-center justify-center rounded-full text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 xl:hidden"
          >
            <Menu aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
