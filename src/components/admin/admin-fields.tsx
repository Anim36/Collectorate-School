"use client";

import * as React from "react";
import { Calendar } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AdminSelectFieldProps {
  /** Visible label above the control. */
  label: string;
  /** Options rendered in the dropdown. */
  options: readonly string[];
  /** Currently selected value. */
  value: string;
  /** Fired when the admin picks a different option. */
  onValueChange: (value: string) => void;
  /** Helper or error copy shown under the control. */
  hint?: string;
  /** Accessible name of the control. */
  ariaLabel?: string;
  /** Extra control shown on the label row, e.g. a link to another view. */
  aside?: React.ReactNode;
  className?: string;
}

/**
 * Labelled dropdown, in the admin rhythm.
 *
 * Figma "Category" (2:12047 desktop, 2:12166 tablet, 2:12278 mobile),
 * "Class" (2:12849), "Month" (2:13322) and "Type" (2:13327): a 13px muted
 * label above a 49px bordered control whose value sits 25px from the leading
 * edge, with a chevron on the trailing edge.
 */
export function AdminSelectField({
  label,
  options,
  value,
  onValueChange,
  hint,
  ariaLabel,
  aside,
  className,
}: AdminSelectFieldProps) {
  const generatedId = React.useId();
  const controlId = `admin-select-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;

  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <div className="flex w-full items-center justify-between gap-4">
        <label
          htmlFor={controlId}
          className="text-caption font-medium leading-[1.45] text-muted"
        >
          {label}
        </label>
        {aside}
      </div>

      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={controlId}
          aria-label={ariaLabel ?? label}
          aria-describedby={hintId}
          className="mt-2 h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink shadow-none focus:outline-none focus:ring-2 focus:ring-ring [&>span]:line-clamp-1 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted [&>svg]:opacity-100"
        >
          <SelectValue placeholder={options[0]} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hint ? (
        <p id={hintId} className="mt-2 text-caption leading-[1.45] text-danger">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface AdminSearchFieldProps {
  /** Visible label above the control. */
  label: string;
  /** Current free-text query. */
  value: string;
  /** Fired when the query changes. */
  onValueChange: (value: string) => void;
  /** Placeholder shown while the control is empty. */
  placeholder?: string;
  className?: string;
}

/**
 * Labelled search box, in the admin rhythm.
 *
 * Figma "Search albums" (2:12435 desktop, 2:12565 tablet, 2:12688 mobile):
 * a 13px muted label above a 49px bordered control with a magnifier glyph on
 * the leading edge and the text 57px from it.
 */
export function AdminSearchField({
  label,
  value,
  onValueChange,
  placeholder,
  className,
}: AdminSearchFieldProps) {
  const generatedId = React.useId();
  const controlId = `admin-search-${generatedId}`;

  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <label
        htmlFor={controlId}
        className="text-caption font-medium leading-[1.45] text-muted"
      >
        {label}
      </label>

      <div className="relative mt-2 w-full">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="pointer-events-none absolute left-[25px] top-1/2 size-4 -translate-y-1/2 text-muted"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id={controlId}
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className="h-[49px] w-full rounded-[12px] border border-border bg-surface pl-[57px] pr-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}

export interface AdminTextFieldProps {
  /** Visible label above the control. */
  label: string;
  /** Value of the control. */
  value: string;
  /** Fired when the value changes. */
  onValueChange: (value: string) => void;
  /** Placeholder shown while the control is empty. */
  placeholder?: string;
  /** Helper or error copy shown under the control. */
  hint?: string;
  /** Type of the control, e.g. "password". */
  type?: React.HTMLInputTypeAttribute;
  /** Name of the control, used by the form library. */
  name?: string;
  /** Reference to the underlying input. */
  ref?: React.Ref<HTMLInputElement>;
  /** Accessible name of the control. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Labelled text input, in the admin rhythm.
 *
 * Figma "Notice title" (2:12043 desktop, 2:12162 tablet, 2:12274 mobile) and
 * "Event title" (2:13361): a 13px muted label above a 49px bordered control
 * whose text sits 25px from the leading edge.
 */
export function AdminTextField({
  label,
  value,
  onValueChange,
  placeholder,
  hint,
  type = "text",
  name,
  ref,
  ariaLabel,
  className,
}: AdminTextFieldProps) {
  const generatedId = React.useId();
  const controlId = `admin-field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;

  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <label
        htmlFor={controlId}
        className="text-caption font-medium leading-[1.45] text-muted"
      >
        {label}
      </label>

      <input
        id={controlId}
        ref={ref}
        name={name}
        type={type}
        value={value}
        aria-label={ariaLabel ?? label}
        aria-describedby={hintId}
        aria-invalid={hint ? true : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-[49px] w-full rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
      />

      {hint ? (
        <p id={hintId} className="mt-2 text-caption leading-[1.45] text-danger">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface AdminTextAreaFieldProps {
  /** Visible label above the control. */
  label: string;
  /** Value of the control. */
  value: string;
  /** Fired when the value changes. */
  onValueChange: (value: string) => void;
  /** Placeholder shown while the control is empty. */
  placeholder?: string;
  /** Helper or error copy shown under the control. */
  hint?: string;
  /** Name of the control, used by the form library. */
  name?: string;
  /** Reference to the underlying textarea. */
  ref?: React.Ref<HTMLTextAreaElement>;
  /** Accessible name of the control. */
  ariaLabel?: string;
  /** Extra control shown on the label row, e.g. a link to another view. */
  aside?: React.ReactNode;
  className?: string;
}

/**
 * Labelled text area that grows with its content.
 *
 * Figma "Notice title" (2:12043 desktop, 2:12162 tablet, 2:12274 mobile):
 * a 13px muted label above a bordered control whose text sits 25px from the
 * leading edge and 13px from the top. The control is 49px tall for a single
 * line and grows to 72px when the headline wraps onto two lines, as it does
 * on the mobile frame.
 */
export function AdminTextAreaField({
  label,
  value,
  onValueChange,
  placeholder,
  hint,
  name,
  ref,
  ariaLabel,
  aside,
  className,
}: AdminTextAreaFieldProps) {
  const generatedId = React.useId();
  const controlId = `admin-area-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const areaRef = React.useRef<HTMLTextAreaElement>(null);

  // A textarea does not grow on its own, so its height follows the content.
  React.useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }, [value]);

  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <div className="flex w-full items-center justify-between gap-4">
        <label
          htmlFor={controlId}
          className="text-caption font-medium leading-[1.45] text-muted"
        >
          {label}
        </label>

        {aside}
      </div>

      <textarea
        id={controlId}
        ref={(node) => {
          areaRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        name={name}
        rows={1}
        value={value}
        aria-label={ariaLabel ?? label}
        aria-describedby={hintId}
        aria-invalid={hint ? true : undefined}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-[49px] w-full resize-none overflow-hidden rounded-[12px] border border-border bg-surface px-[25px] py-[13px] text-body leading-[1.45] text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring"
      />

      {hint ? (
        <p id={hintId} className="mt-2 text-caption leading-[1.45] text-danger">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface AdminDateFieldProps {
  /** Visible label above the control. */
  label: string;
  /** ISO date (`yyyy-mm-dd`) used as the native control value. */
  value: string;
  /** Fired with the ISO date whenever the reader picks a day. */
  onValueChange: (value: string) => void;
  /** Copy shown when no date is selected. */
  placeholder?: string;
  /** Accessible name of the control. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Labelled date control, in the admin rhythm.
 *
 * Figma "Start date" and "End date" (2:13365): a 13px muted label above a
 * 49px bordered control showing the long date, e.g. "12 November 2026".
 */
export function AdminDateField({
  label,
  value,
  onValueChange,
  placeholder = "Select a date",
  ariaLabel,
  className,
}: AdminDateFieldProps) {
  const generatedId = React.useId();
  const controlId = `admin-date-${generatedId}`;
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn("flex w-full flex-col items-start", className)}>
      <label
        htmlFor={controlId}
        className="text-caption font-medium leading-[1.45] text-muted"
      >
        {label}
      </label>

      <button
        type="button"
        id={controlId}
        aria-label={ariaLabel ?? label}
        onClick={() => inputRef.current?.showPicker?.()}
        className="mt-2 flex h-[49px] w-full items-center justify-between gap-2 rounded-[12px] border border-border bg-surface px-[25px] text-body leading-[1.45] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={value ? "" : "text-muted"}>
          {value ? longDate(value) : placeholder}
        </span>
        <Calendar aria-hidden className="size-4 shrink-0 text-muted" />
      </button>

      <input
        ref={inputRef}
        type="date"
        value={value}
        tabIndex={-1}
        aria-hidden
        onChange={(event) => onValueChange(event.target.value)}
        className="sr-only"
      />
    </div>
  );
}

/** Formats an ISO date the way the Figma frames show it. */
export function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export interface AdminCheckboxGroupProps<TOption extends string> {
  /** Heading above the options. */
  label: string;
  /** Options offered by the group. */
  options: readonly TOption[];
  /** Options that are ticked. */
  selected: readonly TOption[];
  /** Fired with the full set of ticked options. */
  onChange: (selected: readonly TOption[]) => void;
  className?: string;
}

/**
 * The audience selector of the notice editor.
 *
 * Figma "Who should see this?" (2:12054 desktop, 2:12173 tablet, 2:12285
 * mobile): a 35px heading above a row of ticked checkboxes — "Public",
 * "Students" and "Teachers" — on a 23px line. The heading and the row are
 * returned separately so the page keeps the 24px rhythm Figma draws.
 */
export function AdminCheckboxGroup<TOption extends string>({
  label,
  options,
  selected,
  onChange,
  className,
}: AdminCheckboxGroupProps<TOption>) {
  const toggle = (option: TOption) => {
    onChange(
      selected.includes(option)
        ? selected.filter((entry) => entry !== option)
        : [...selected, option],
    );
  };

  return (
    <>
      <p
        className={cn(
          "text-title font-bold leading-[1.45] text-ink",
          className,
        )}
      >
        {label}
      </p>

      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 md:gap-x-16">
        {options.map((option) => {
          const checked = selected.includes(option);

          return (
            <label
              key={option}
              className="flex items-center gap-1.5 text-body leading-[1.45] text-ink"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option)}
                className="size-4 shrink-0 rounded-[4px] border border-border accent-[hsl(var(--action))]"
              />
              {option}
            </label>
          );
        })}
      </div>
    </>
  );
}
