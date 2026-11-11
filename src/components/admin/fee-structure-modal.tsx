"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AdminDateField, AdminTextField } from "@/components/admin/admin-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPoisha } from "@/lib/money";
import type { AdminFeeStructureRow } from "@/types/admin-11c";

export interface FeeStructureModalProps {
  /** Called when the admin dismisses the modal. */
  onClose: () => void;
  /** Called with the edited fee line. */
  onSave: (values: {
    id: string;
    monthlyTuitionPoisha: number;
    admissionFeePoisha: number;
    activitiesPoisha: number;
    dueDate: string;
  }) => void;
  /** The fee lines the admin can edit. */
  rows: readonly AdminFeeStructureRow[];
  /** The line the modal opens on. */
  initialRowId: string;
}

/**
 * The largest amount a class may be charged, in poisha.
 *
 * The server holds the same limit, so the dialog can refuse an amount before
 * it is sent rather than after it comes back.
 */
const MAX_POISHA = 10_000_000;

/**
 * Reads an amount the admin typed, in taka.
 *
 * The amount is turned into poisha here, so no amount ever goes through a
 * float on its way to the server. A fraction smaller than a poisha is rounded
 * and anything that is not an amount is refused.
 */
function parseTaka(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const poisha = Math.round(Number(cleaned) * 100);

  if (!Number.isFinite(poisha)) return null;
  if (poisha <= 0 || poisha > MAX_POISHA) return null;

  return poisha;
}

/**
 * The amount as the admin types it, in whole taka.
 */
function takaText(poisha: number): string {
  return String(Math.round(poisha / 100));
}

/**
 * The edit fee structure dialog.
 *
 * The admin picks a class and changes the monthly tuition, the admission fee,
 * the activities fee and the due date of that class. The change is written to
 * the database when the dialog is saved.
 *
 * The school charges in whole taka, so the fields hold taka and the amounts
 * are turned into poisha before they are sent. A field that does not hold an
 * amount the school can charge is refused here, with the reason on the field
 * itself.
 */
export function FeeStructureModal({
  onClose,
  onSave,
  rows,
  initialRowId,
}: FeeStructureModalProps) {
  const [rowId, setRowId] = React.useState(initialRowId);
  const row = rows.find((entry) => entry.id === rowId) ?? rows[0];

  const [monthlyTuition, setMonthlyTuition] = React.useState(
    row ? takaText(row.monthlyTuitionPoisha) : "",
  );
  const [admissionFee, setAdmissionFee] = React.useState(
    row ? takaText(row.admissionFeePoisha) : "",
  );
  const [activities, setActivities] = React.useState(
    row ? takaText(row.activitiesPoisha) : "",
  );
  const [dueOn, setDueOn] = React.useState(row?.dueDate ?? "");
  const [errors, setErrors] = React.useState<{
    monthlyTuition?: string;
    admissionFee?: string;
    activities?: string;
    dueDate?: string;
  }>({});

  // Picking another class loads that class's fees.
  const pickClass = (id: string) => {
    const next = rows.find((entry) => entry.id === id);
    if (!next) return;

    setRowId(id);
    setMonthlyTuition(takaText(next.monthlyTuitionPoisha));
    setAdmissionFee(takaText(next.admissionFeePoisha));
    setActivities(takaText(next.activitiesPoisha));
    setDueOn(next.dueDate);
    setErrors({});
  };

  const submit = () => {
    if (!row) return;

    const tuition = parseTaka(monthlyTuition);
    const admission = parseTaka(admissionFee);
    const activitiesPoisha = parseTaka(activities);
    const due = dueOn.trim();

    const nextErrors: typeof errors = {};

    if (tuition === null) {
      nextErrors.monthlyTuition = "Enter an amount of taka";
    }

    if (admission === null) {
      nextErrors.admissionFee = "Enter an amount of taka";
    }

    if (activitiesPoisha === null) {
      nextErrors.activities = "Enter an amount of taka";
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      nextErrors.dueDate = "Choose the day the fees fall due";
    }

    setErrors(nextErrors);

    if (
      tuition === null ||
      admission === null ||
      activitiesPoisha === null ||
      nextErrors.dueDate
    ) {
      return;
    }

    onSave({
      id: row.id,
      monthlyTuitionPoisha: tuition,
      admissionFeePoisha: admission,
      activitiesPoisha: activitiesPoisha,
      dueDate: due,
    });
  };

  // The line under the fields reads the amounts as they stand, so the admin
  // sees what the class will be charged before the dialog is saved.
  const tuition = parseTaka(monthlyTuition);
  const admission = parseTaka(admissionFee);
  const activitiesPoisha = parseTaka(activities);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Edit fee structure"
        description="The fees every student of the class pays."
        onClose={onClose}
        className="max-w-[640px]"
        footer={
          <>
            <Button type="button" className="h-[47px]" onClick={submit}>
              Save fee structure
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-[49px]"
              onClick={onClose}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col items-start">
            <span className="text-caption font-medium leading-[1.45] text-muted">
              Class
            </span>
            <Select value={row?.id ?? ""} onValueChange={pickClass}>
              <SelectTrigger
                id="admin-fee-class"
                aria-label="Class"
                className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
              >
                <SelectValue placeholder={row?.className} />
              </SelectTrigger>
              <SelectContent>
                {rows.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AdminTextField
            label="Monthly tuition"
            value={monthlyTuition}
            onValueChange={setMonthlyTuition}
            placeholder="1500"
            hint={errors.monthlyTuition}
            ariaLabel="Monthly tuition"
          />

          <AdminTextField
            label="Admission fee"
            value={admissionFee}
            onValueChange={setAdmissionFee}
            placeholder="5000"
            hint={errors.admissionFee}
            ariaLabel="Admission fee"
          />

          <AdminTextField
            label="Activities"
            value={activities}
            onValueChange={setActivities}
            placeholder="1000"
            hint={errors.activities}
            ariaLabel="Activities"
          />

          <AdminDateField
            label="Due date"
            value={dueOn}
            onValueChange={setDueOn}
            ariaLabel="Due date"
          />

          {errors.dueDate ? (
            <p className="text-caption leading-[1.45] text-danger">
              {errors.dueDate}
            </p>
          ) : null}

          <p className="text-caption leading-[1.45] text-muted">
            {row?.className} now bills{" "}
            {formatPoisha(tuition ?? row?.monthlyTuitionPoisha ?? 0)} tuition,{" "}
            {formatPoisha(admission ?? row?.admissionFeePoisha ?? 0)} admission
            and {formatPoisha(activitiesPoisha ?? row?.activitiesPoisha ?? 0)}{" "}
            activities.
          </p>
        </div>
      </Modal>
    </div>
  );
}
