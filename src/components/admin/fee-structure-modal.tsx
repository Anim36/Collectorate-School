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
import { formatTaka, type AdminFeeStructureRow } from "@/data/admin-11c";

export interface FeeStructureModalProps {
  /** Called when the admin dismisses the modal. */
  onClose: () => void;
  /** Called with the edited fee line. */
  onSave: (values: {
    id: string;
    monthlyTuition: number;
    admissionFee: number;
    activities: number;
    dueOn: string;
  }) => void;
  /** The fee lines the admin can edit. */
  rows: readonly AdminFeeStructureRow[];
  /** The line the modal opens on. */
  initialRowId: string;
}

/**
 * The edit fee structure dialog.
 *
 * The admin picks a class band and changes the monthly tuition, the admission
 * fee, the activities fee and the due date of that band. The edit is only
 * recorded in memory — nothing is sent to a server.
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
    String(row.monthlyTuition),
  );
  const [admissionFee, setAdmissionFee] = React.useState(
    String(row.admissionFee),
  );
  const [activities, setActivities] = React.useState(String(row.activities));
  const [dueOn, setDueOn] = React.useState(row.dueOn);
  const [error, setError] = React.useState<string | null>(null);

  // Picking another band loads that band's fees.
  const pickBand = (id: string) => {
    const next = rows.find((entry) => entry.id === id);
    if (!next) return;

    setRowId(id);
    setMonthlyTuition(String(next.monthlyTuition));
    setAdmissionFee(String(next.admissionFee));
    setActivities(String(next.activities));
    setDueOn(next.dueOn);
    setError(null);
  };

  const submit = () => {
    const tuition = Number(monthlyTuition.replace(/[^0-9]/g, ""));
    const admission = Number(admissionFee.replace(/[^0-9]/g, ""));
    const activitiesAmount = Number(activities.replace(/[^0-9]/g, ""));

    if (!tuition || !admission || !activitiesAmount) {
      setError("Enter an amount for every fee");
      return;
    }

    onSave({
      id: row.id,
      monthlyTuition: tuition,
      admissionFee: admission,
      activities: activitiesAmount,
      dueOn,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-6 md:items-center">
      <Modal
        title="Edit fee structure"
        description="The fees every student of the class band pays."
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
              Class band
            </span>
            <Select value={row.id} onValueChange={pickBand}>
              <SelectTrigger
                id="admin-fee-band"
                aria-label="Class band"
                className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
              >
                <SelectValue placeholder={row.classBand} />
              </SelectTrigger>
              <SelectContent>
                {rows.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.classBand}
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
            hint={error ?? undefined}
            ariaLabel="Monthly tuition"
          />

          <AdminTextField
            label="Admission fee"
            value={admissionFee}
            onValueChange={setAdmissionFee}
            placeholder="5000"
            ariaLabel="Admission fee"
          />

          <AdminTextField
            label="Activities"
            value={activities}
            onValueChange={setActivities}
            placeholder="1000"
            ariaLabel="Activities"
          />

          <AdminDateField
            label="Due date"
            value={dueOn}
            onValueChange={setDueOn}
            ariaLabel="Due date"
          />

          <p className="text-caption leading-[1.45] text-muted">
            Class {row.classBand} now bills {formatTaka(row.monthlyTuition)}{" "}
            tuition, {formatTaka(row.admissionFee)} admission and{" "}
            {formatTaka(row.activities)} activities.
          </p>
        </div>
      </Modal>
    </div>
  );
}
