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
  ADMIN_ROLE_OPTIONS,
  ADMIN_USERS_PAGE_SIZE,
  adminCsvPreviewRows,
  adminGreeting,
  adminRoster,
  type AdminCsvRow,
  type AdminUser,
} from "@/data/admin";

/** The account a confirmation acts on. */
type PendingAccount = {
  /** What the admin is about to do. */
  action: "reset" | "toggle";
  /** The account the action applies to. */
  user: AdminUser;
};

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
 * Everything happens in memory: the search, the role filter, the pagination,
 * the new accounts, the status changes and the password resets are held in the
 * page state and never leave the browser.
 */
export function AdminUsers() {
  const { toast } = useToast();

  const [accounts, setAccounts] = React.useState<readonly AdminUser[]>(
    adminRoster,
  );
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState<string>(ADMIN_ROLE_OPTIONS[0]);
  const [page, setPage] = React.useState(0);
  const [addUserOpen, setAddUserOpen] = React.useState(false);
  const [csvOpen, setCsvOpen] = React.useState(false);
  const [csvRows, setCsvRows] = React.useState<readonly AdminCsvRow[]>(
    adminCsvPreviewRows,
  );
  const [csvFileName, setCsvFileName] = React.useState(
    "students-class-9.csv",
  );
  const [pending, setPending] = React.useState<PendingAccount | null>(null);

  // The top bar names the section, as Figma draws it: "Admin Panel / CSV
  // import" above the import panel.
  useSetPortalSection(csvOpen ? "CSV import" : null);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesRole = role === ADMIN_ROLE_OPTIONS[0] || account.role === role;
      if (!matchesRole) return false;
      if (needle === "") return true;

      return (
        account.name.toLowerCase().includes(needle) ||
        account.email.toLowerCase().includes(needle) ||
        account.id.toLowerCase().includes(needle)
      );
    });
  }, [accounts, query, role]);

  // A filter change starts the list again from the first page.
  React.useEffect(() => {
    setPage(0);
  }, [query, role]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_USERS_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleAccounts = filtered.slice(
    currentPage * ADMIN_USERS_PAGE_SIZE,
    currentPage * ADMIN_USERS_PAGE_SIZE + ADMIN_USERS_PAGE_SIZE,
  );

  const createAccount = (values: {
    name: string;
    role: AdminUser["role"];
    classOrDept: string;
    email: string;
  }) => {
    setAccounts((previous) => [
      {
        id: `user-new-${previous.length + 1}`,
        name: values.name,
        role: values.role,
        classOrDept: values.classOrDept,
        status: "Active",
        email: values.email,
      },
      ...previous,
    ]);

    setAddUserOpen(false);
    setPage(0);

    toast({
      title: "Account created",
      description: `${values.name} can now sign in with the temporary password.`,
    });
  };

  const toggleStatus = (user: AdminUser) => {
    setAccounts((previous) =>
      previous.map((account) =>
        account.id === user.id
          ? {
              ...account,
              status: account.status === "Active" ? "Inactive" : "Active",
            }
          : account,
      ),
    );

    toast({
      title: user.status === "Active" ? "Account deactivated" : "Account activated",
      description:
        user.status === "Active"
          ? `${user.name} can no longer sign in.`
          : `${user.name} can sign in again.`,
    });
  };

  const resetPassword = (user: AdminUser) => {
    toast({
      title: "Password reset",
      description: `A new temporary password was issued to ${user.name}.`,
    });
  };

  const confirmPending = () => {
    if (!pending) return;

    if (pending.action === "reset") {
      resetPassword(pending.user);
    } else {
      toggleStatus(pending.user);
    }

    setPending(null);
  };

  /**
   * Reads a picked CSV in the browser and turns its rows into the preview
   * table. Nothing is uploaded anywhere.
   */
  const pickCsv = async (file: File) => {
    setCsvFileName(file.name);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "");

      const [header, ...body] = lines;
      if (!header) {
        setCsvRows(adminCsvPreviewRows);
        return;
      }

      const parsed: AdminCsvRow[] = body.map((line, index) => {
        const cells = line.split(",").map((cell) => cell.trim());
        const email = cells[3] ?? "";

        return {
          row: index + 1,
          name: cells[0] ?? "",
          role: cells[1] === "Teacher" ? "Teacher" : "Student",
          classOrDept: cells[2] ?? "",
          email,
          valid: email !== "",
          ...(email === "" ? { problem: "Email address is missing" } : {}),
        };
      });

      setCsvRows(parsed);
    } catch {
      setCsvRows(adminCsvPreviewRows);
    }
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
        rows={visibleAccounts}
        totalRecords={filtered.length}
        page={currentPage}
        pageSize={ADMIN_USERS_PAGE_SIZE}
        onPageChange={setPage}
        onResetPassword={(user) => setPending({ action: "reset", user })}
        onToggleStatus={(user) => setPending({ action: "toggle", user })}
      />

      {csvOpen ? (
        <CsvImportPanel
          rows={csvRows}
          fileName={csvFileName}
          onFilePicked={pickCsv}
          onReview={() =>
            toast({
              title: "Import queued",
              description: `${csvRows.length} rows will be added to the school roll.`,
            })
          }
        />
      ) : null}

      {addUserOpen ? (
        <AddUserModal
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
