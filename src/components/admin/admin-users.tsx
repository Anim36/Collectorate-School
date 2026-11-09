"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { AddUserModal } from "@/components/admin/add-user-modal";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUserFilters } from "@/components/admin/admin-user-filters";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CsvImportPanel } from "@/components/admin/csv-import-panel";
import { useSetPortalSection } from "@/components/layout/portal-section-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  commitCsvAction,
  createUserAction,
  listUsersAction,
  previewCsvAction,
  resetUserPasswordAction,
  setUserActiveAction,
} from "@/app/admin/actions";
import { adminGreeting, type AdminCsvRow, type AdminUser } from "@/data/admin";

/** The account a confirmation acts on. */
type PendingAccount = {
  /** What the admin is about to do. */
  action: "reset" | "toggle";
  /** The account the action applies to. */
  user: AdminUser;
};

/**
 * The page size the users table shows.
 *
 * Figma draws four accounts on a page, so a page holds four rows.
 */
const PAGE_SIZE = 4;

export interface AdminUsersProps {
  /** The accounts the server read for the first page. */
  initialUsers: {
    rows: AdminUser[];
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  } | null;
  /** The classes of the school, for the dropdowns. */
  classes: readonly { id: string; name: string }[];
}

/**
 * The admin users page.
 *
 * Figma "Admin / Users" (2:10048 desktop, 2:10187 tablet, 2:10324 mobile),
 * "Admin / Add User" (2:10491 / 2:10790 / 2:10944) and "Admin / CSV import"
 * (2:11018 / 2:11168 / 2:11371):
 *
 * - Desktop (1440): 32px padding. A 93px heading, the 76px selection filters,
 *   the 49px action row, the 368px table and the 19px pagination line.
 * - Tablet (768): the same rhythm; the action copy wraps, so the table is
 *   448px tall.
 * - Mobile (375): 24px padding, a 111px heading, a 168px filter block, a 112px
 *   action row and a 661px table.
 *
 * The search, the filters and the pagination run on the server, so the count
 * in "Showing X of Y" is the number of accounts that really match.
 */
export function AdminUsers({ initialUsers, classes }: AdminUsersProps) {
  const { toast } = useToast();

  const [accounts, setAccounts] = React.useState<readonly AdminUser[]>(
    initialUsers?.rows ?? [],
  );
  const [total, setTotal] = React.useState(initialUsers?.total ?? 0);
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState("All roles");
  const [status, setStatus] = React.useState("All statuses");
  const [page, setPage] = React.useState(0);
  const [addUserOpen, setAddUserOpen] = React.useState(false);
  const [csvOpen, setCsvOpen] = React.useState(false);
  const [csvRows, setCsvRows] = React.useState<readonly AdminCsvRow[]>([]);
  const [csvFileName, setCsvFileName] = React.useState("");
  const [csvFile, setCsvFile] = React.useState<{
    name: string;
    text: string;
    size: number;
  } | null>(null);
  const [csvReady, setCsvReady] = React.useState(0);
  const [csvFailed, setCsvFailed] = React.useState(0);
  const [csvWarning, setCsvWarning] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [pending, setPending] = React.useState<PendingAccount | null>(null);

  // The top bar names the section, as Figma draws it: "Admin Panel / CSV
  // import" above the import panel.
  useSetPortalSection(csvOpen ? "CSV import" : null);

  /**
   * Reads a page of accounts from the server.
   *
   * The search is debounced, so a slow typist does not ask for a page on
   * every keystroke.
   */
  const load = React.useCallback(
    async (nextPage: number) => {
      const result = await listUsersAction({
        query,
        role: role === "All roles" ? "ALL" : role.toUpperCase(),
        status:
          status === "All statuses"
            ? "ALL"
            : status === "Active"
              ? "ACTIVE"
              : "INACTIVE",
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      if (!result.ok) {
        toast({
          title: "Could not load the accounts",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setAccounts(result.data.rows);
      setTotal(result.data.total);
    },
    [query, role, status, toast],
  );

  // The list is read again when the filters change.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      void load(0);
    }, 250);

    return () => clearTimeout(timer);
  }, [load]);

  const createAccount = async (values: {
    name: string;
    role: AdminUser["role"];
    classId: string;
    email: string;
    password: string;
  }) => {
    const result = await createUserAction({
      name: values.name,
      role: values.role === "Student" ? "STUDENT" : "TEACHER",
      classId: values.classId,
      email: values.email,
      password: values.password,
    });

    if (!result.ok) {
      toast({
        title: "Account not created",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setAddUserOpen(false);
    setPage(0);
    await load(0);

    toast({
      title: "Account created",
      description: `${values.name} can now sign in with the temporary password.`,
    });
  };

  const toggleStatus = async (user: AdminUser) => {
    const activate = user.status === "Inactive";

    const result = await setUserActiveAction(user.id, activate);

    if (!result.ok) {
      toast({
        title: activate ? "Account not activated" : "Account not deactivated",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await load(page);

    toast({
      title: activate ? "Account activated" : "Account deactivated",
      description: activate
        ? `${user.name} can sign in again.`
        : `${user.name} can no longer sign in.`,
    });
  };

  const resetPassword = async (user: AdminUser) => {
    const result = await resetUserPasswordAction(user.id);

    if (!result.ok) {
      toast({
        title: "Password not reset",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    await load(page);

    toast({
      title: "Password reset",
      description: `A new temporary password was issued to ${user.name}: ${result.data.temporaryPassword}. It is shown once.`,
    });
  };

  const confirmPending = async () => {
    if (!pending) return;

    if (pending.action === "reset") {
      await resetPassword(pending.user);
    } else {
      await toggleStatus(pending.user);
    }

    setPending(null);
  };

  /**
   * Reads a picked CSV on the server and turns its rows into the preview
   * table.
   */
  const pickCsv = async (file: File) => {
    setCsvFileName(file.name);
    setCsvWarning("");

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvWarning("Only a .csv file can be imported");
      setCsvRows([]);
      setCsvReady(0);
      setCsvFailed(0);
      setCsvFile(null);
      return;
    }

    const text = await file.text();
    const payload = { name: file.name, text, size: file.size };

    const result = await previewCsvAction(payload);

    if (!result.ok) {
      setCsvWarning(result.error);
      setCsvRows([]);
      setCsvReady(0);
      setCsvFailed(0);
      setCsvFile(null);
      return;
    }

    setCsvFile(payload);
    setCsvRows(result.data.rows);
    setCsvReady(result.data.ready);
    setCsvFailed(result.data.failed);
  };

  /**
   * Writes the rows of the file.
   */
  const importRows = async () => {
    if (!csvFile) return;

    setImporting(true);

    const result = await commitCsvAction(csvFile);

    setImporting(false);

    if (!result.ok) {
      toast({
        title: "Import failed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    setCsvOpen(false);
    setCsvRows([]);
    setCsvFile(null);
    setCsvReady(0);
    setCsvFailed(0);
    setPage(0);
    await load(0);

    toast({
      title: "Import complete",
      description: `${result.data.imported} accounts were added to the school roll.`,
    });
  };

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
      <AdminPageHeader
        title={csvOpen ? "CSV import" : "Users"}
        description={adminGreeting.context}
      />

      <AdminUserFilters
        query={query}
        onQueryChange={setQuery}
        role={role}
        onRoleChange={setRole}
        status={status}
        onStatusChange={setStatus}
      />

      {/* The action row. */}
      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:items-center md:gap-4">
        <Button
          type="button"
          className="h-[47px] w-[120px] shrink-0"
          onClick={() => setAddUserOpen(true)}
        >
          Add User
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="h-[49px] w-[177px] shrink-0"
          onClick={() => setCsvOpen((open) => !open)}
          aria-expanded={csvOpen}
        >
          <Upload aria-hidden className="size-4" />
          Bulk CSV import
        </Button>
      </div>

      <AdminUsersTable
        rows={accounts}
        totalRecords={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={(next) => {
          setPage(next);
          void load(next);
        }}
        onResetPassword={(user) => setPending({ action: "reset", user })}
        onToggleStatus={(user) => setPending({ action: "toggle", user })}
      />

      {csvOpen ? (
        <CsvImportPanel
          rows={csvRows}
          fileName={csvFileName}
          ready={csvReady}
          failed={csvFailed}
          warning={csvWarning}
          importing={importing}
          onFilePicked={pickCsv}
          onReview={importRows}
        />
      ) : null}

      {addUserOpen ? (
        <AddUserModal
          classes={classes}
          onClose={() => setAddUserOpen(false)}
          onCreate={createAccount}
        />
      ) : null}

      {pending ? (
        <ConfirmDialog
          title={
            pending.action === "reset"
              ? "Reset this password?"
              : pending.user.status === "Active"
                ? "Deactivate this account?"
                : "Activate this account?"
          }
          description={
            pending.action === "reset"
              ? `${pending.user.name} will get a new temporary password and will be asked to change it at the next sign-in.`
              : pending.user.status === "Active"
                ? `${pending.user.name} will no longer be able to sign in. The account keeps its records.`
                : `${pending.user.name} will be able to sign in again.`
          }
          confirmLabel={
            pending.action === "reset"
              ? "Reset password"
              : pending.user.status === "Active"
                ? "Deactivate"
                : "Activate"
          }
          onConfirm={confirmPending}
          onClose={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}
