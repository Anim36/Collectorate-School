"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { TeacherCard } from "@/components/shared/teacher-card";
import { StaffFilters } from "@/components/teachers/staff-filters";
import { StaffGrid } from "@/components/teachers/staff-grid";
import {
  staffMembers,
  staffSubjects,
  staffTabs,
  type StaffGroup,
} from "@/data/public-pages";
import { cn } from "@/lib/utils";

/**
 * Staff directory with client-side search and filters.
 * Figma "Teachers & Staff main" (2:942 desktop, 2:1033 tablet, 2:1121
 * mobile): a tab row, the search and subject filters and a responsive grid of
 * teacher cards — three across on desktop, two on tablet, one on mobile.
 */
export function StaffDirectory() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState(staffSubjects[0]);
  const [group, setGroup] = useState<StaffGroup>(staffTabs[0]);

  const visibleMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return staffMembers.filter((member) => {
      if (member.group !== group) return false;
      if (subject !== staffSubjects[0] && member.subject !== subject) return false;
      if (!normalizedQuery) return true;

      return (
        member.name.toLowerCase().includes(normalizedQuery) ||
        member.designation.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [group, query, subject]);

  return (
    <>
      <div
        role="tablist"
        aria-label="Staff directory"
        className="flex items-start gap-8"
      >
        {staffTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={group === tab}
            onClick={() => setGroup(tab)}
            className={cn(
              "text-body font-semibold leading-[1.45] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              group === tab ? "text-primary" : "text-muted hover:text-primary",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-8 w-full">
        <StaffFilters
          query={query}
          onQueryChange={setQuery}
          subject={subject}
          onSubjectChange={setSubject}
          subjects={staffSubjects}
        />
      </div>

      {visibleMembers.length === 0 ? (
        <div className="mt-8 w-full">
          <EmptyState
            message="No matching staff"
            title="No staff match your search yet."
          />
        </div>
      ) : (
        <StaffGrid className="mt-8">
          {visibleMembers.map((member) => (
            <li key={member.id} className="w-full">
              <TeacherCard
                imageSrc={member.imageSrc}
                imageAlt={member.imageAlt}
                imageWidth={member.imageWidth}
                imageHeight={member.imageHeight}
                name={member.name}
                designation={member.designation}
                email={member.email}
              />
            </li>
          ))}
        </StaffGrid>
      )}
    </>
  );
}
