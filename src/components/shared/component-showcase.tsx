"use client";

import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { GalleryCard } from "@/components/shared/gallery-card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { NoticeCard } from "@/components/shared/notice-card";
import { NoticeDetailedCard } from "@/components/shared/notice-detailed-card";
import { StatCard } from "@/components/shared/stat-card";
import { ThemePair } from "@/components/shared/theme-pair";
import { ToastCard } from "@/components/shared/toast-card";
import { ToastTrigger } from "@/components/shared/toast-trigger";
import { TeacherCard } from "@/components/shared/teacher-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldInput } from "@/components/ui/field-input";
import { FieldSelect } from "@/components/ui/field-select";
import { Modal } from "@/components/ui/modal";
import { ModalOption } from "@/components/ui/modal-option";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminTaskRecords,
  classOptions,
  galleryEntries,
  noticeEntries,
  noticeTabs,
  teacherEntries,
  type AdminTaskRecord,
} from "@/data/components";
import { schoolPhotos } from "@/data/photos";

/** Finds a downloaded photo by its id. */
function photoById(id: string) {
  const photo = schoolPhotos.find((item) => item.id === id);
  if (!photo) {
    throw new Error(`Unknown photo id: ${id}`);
  }
  return photo;
}

const tableColumns: readonly DataTableColumn<AdminTaskRecord>[] = [
  { header: "Task", cell: (row) => row.task },
  { header: "Count", cell: (row) => row.count },
  { header: "Action", cell: (row) => row.action },
];

export function ComponentShowcase() {
  const [classValue, setClassValue] = useState("class-9");
  const [dateValue, setDateValue] = useState("2026-11-04");
  const [paymentMethod, setPaymentMethod] = useState("bkash");

  return (
    <div className="flex flex-col gap-16">
      <ThemePair label="Button · Primary, Secondary, Ghost, Disabled">
        <div className="flex flex-wrap items-start gap-4">
          <Button type="button">Apply Now</Button>
          <Button type="button" variant="secondary">
            Secondary
          </Button>
          <Button type="button" variant="ghost">
            Ghost
          </Button>
          <Button type="button" variant="disabled" disabled>
            Disabled
          </Button>
        </div>
      </ThemePair>

      <ThemePair label="Button · Sizes">
        <div className="flex flex-wrap items-start gap-4">
          <Button type="button" size="sm">
            Small
          </Button>
          <Button type="button" size="default">
            Default
          </Button>
          <Button type="button" size="lg">
            Large
          </Button>
        </div>
      </ThemePair>

      <ThemePair label="Badge · Academic, Paid, Due, Late">
        <div className="flex flex-wrap items-start gap-4">
          <Badge variant="default">Academic</Badge>
          <Badge variant="success">Paid</Badge>
          <Badge variant="danger">Due</Badge>
          <Badge variant="warning">Late</Badge>
        </div>
      </ThemePair>

      <ThemePair label="Input · With label and hint">
        <FieldInput
          label="Student ID / email"
          placeholder="e.g. ST-2026-0042"
          hint="Use the ID printed on your admission card."
        />
      </ThemePair>

      <ThemePair label="Select · Class">
        <FieldSelect
          label="Class"
          options={classOptions}
          value={classValue}
          onValueChange={setClassValue}
        />
      </ThemePair>

      <ThemePair label="DatePicker · Date">
        <DatePicker
          label="Date"
          value={dateValue}
          displayValue="04 November 2026"
          onValueChange={setDateValue}
        />
      </ThemePair>

      <ThemePair label="Tabs · Notices, Events, Holidays, Achievements">
        <Tabs defaultValue="notices">
          <TabsList>
            {noticeTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="notices">
            <p className="text-body leading-[1.45] text-muted">
              Annual examination schedule published.
            </p>
          </TabsContent>
          <TabsContent value="events">
            <p className="text-body leading-[1.45] text-muted">
              Annual sports day — 18 to 20 November.
            </p>
          </TabsContent>
          <TabsContent value="holidays">
            <p className="text-body leading-[1.45] text-muted">
              Winter vacation starts 20 December.
            </p>
          </TabsContent>
          <TabsContent value="achievements">
            <p className="text-body leading-[1.45] text-muted">
              Science fair — three first places.
            </p>
          </TabsContent>
        </Tabs>
      </ThemePair>

      <ThemePair label="NoticeCard · Compact">
        <NoticeCard
          date={noticeEntries[0].date}
          category={noticeEntries[0].category}
          title={noticeEntries[0].title}
        />
      </ThemePair>

      <ThemePair label="NoticeCard · Detailed">
        <NoticeDetailedCard
          date={noticeEntries[0].date}
          category={noticeEntries[0].category}
          title={noticeEntries[0].title}
          description={noticeEntries[0].description}
        />
      </ThemePair>

      <ThemePair label="TeacherCard">
        {teacherEntries.map((teacher) => {
          const photo = photoById(teacher.photoId);
          return (
            <TeacherCard
              key={teacher.id}
              imageSrc={photo.src}
              imageAlt={photo.alt}
              imageWidth={photo.width}
              imageHeight={photo.height}
              name={teacher.name}
              designation={teacher.designation}
              email={teacher.email}
            />
          );
        })}
      </ThemePair>

      <ThemePair label="StatCard">
        <StatCard label="Attendance" value="94.5%" hint="Up 2.1% from last term" />
      </ThemePair>

      <ThemePair label="GalleryCard">
        {galleryEntries.map((album) => {
          const photo = photoById(album.photoId);
          return (
            <GalleryCard
              key={album.id}
              imageSrc={photo.src}
              imageAlt={photo.alt}
              imageWidth={photo.width}
              imageHeight={photo.height}
              title={album.title}
              meta={album.meta}
            />
          );
        })}
      </ThemePair>

      <ThemePair label="DataTable · With pagination">
        <DataTable
          caption="Admin tasks"
          columns={tableColumns}
          rows={adminTaskRecords}
          totalRecords={adminTaskRecords.length}
          page={0}
          pageSize={3}
        />
      </ThemePair>

      <ThemePair label="Modal · Payment method">
        <Modal
          title="Choose a payment method"
          description="Secure payment · Total ৳ 3,000"
          footer={
            <>
              <Button type="button">Continue to bKash</Button>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </>
          }
        >
          <div className="flex w-full flex-col gap-4">
            <ModalOption
              label="bKash"
              selected={paymentMethod === "bkash"}
              onSelect={() => setPaymentMethod("bkash")}
            />
            <ModalOption
              label="Nagad"
              selected={paymentMethod === "nagad"}
              onSelect={() => setPaymentMethod("nagad")}
            />
            <ModalOption
              label="Debit / Credit Card"
              selected={paymentMethod === "card"}
              onSelect={() => setPaymentMethod("card")}
            />
          </div>
          <p className="text-caption leading-[1.45] text-muted">
            You’ll continue to your payment provider to authorise the
            transaction.
          </p>
        </Modal>
      </ThemePair>

      <ThemePair label="Toast · Changes saved">
        <ToastCard
          title="Changes saved"
          message="Your attendance sheet is up to date."
        />
        <ToastTrigger />
      </ThemePair>

      <ThemePair label="EmptyState · You’re all caught up">
        <EmptyState
          message="You’re all caught up"
          title="New notices will appear here."
        />
      </ThemePair>

      <ThemePair label="Skeleton · Loading your dashboard">
        <LoadingSkeleton />
      </ThemePair>
    </div>
  );
}
