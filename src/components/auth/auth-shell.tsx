import { AuthHeader } from "@/components/auth/auth-header";
import { CampusWelcome } from "@/components/auth/campus-welcome";

/**
 * Split shell shared by the auth screens.
 * Figma "Login split" (2:3198 desktop, 2:3232 tablet, 2:3266 mobile): the
 * campus image sits beside the form on desktop (640px of a 1440px page) and
 * stacks above it on tablet and mobile.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AuthHeader />
      <div className="flex flex-1 flex-col xl:flex-row">
        <div className="w-full xl:w-[640px] xl:shrink-0">
          <CampusWelcome />
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
