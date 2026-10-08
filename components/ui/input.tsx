import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { cloneElement, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-xl border border-line bg-surface-2 px-4 text-sm text-fg placeholder:text-muted/70 transition-colors focus:border-lime/60 focus:outline-none focus:ring-2 focus:ring-lime/20 disabled:opacity-50 aria-[invalid=true]:border-danger/60";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24 py-3", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-12 appearance-none bg-[length:16px] pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-fg/90", className)} {...props} />;
}

/** Elements a `<label htmlFor>` can point at directly. */
const FORM_CONTROLS = new Set<unknown>([Input, Textarea, Select, UnitInput, "input", "select", "textarea"]);

export function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  const autoId = useId();
  // Link the label to a lone form control so screen readers announce it and clicking it focuses the field.
  // Anything else (chip rows, segmented buttons) becomes a group named by the label.
  const control = isValidElement<{ id?: string }>(children) && FORM_CONTROLS.has(children.type) ? children : null;
  const controlId = htmlFor ?? control?.props.id ?? (control ? autoId : undefined);
  const labelId = `${autoId}-label`;
  const isGroup = Boolean(label) && !controlId;
  return (
    <div className={className} role={isGroup ? "group" : undefined} aria-labelledby={isGroup ? labelId : undefined}>
      {label && (
        <Label id={labelId} htmlFor={controlId}>
          {label}
        </Label>
      )}
      {control && !control.props.id ? cloneElement(control, { id: controlId }) : children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Number input with a trailing unit label (kg, cm…). */
export function UnitInput({
  unit,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { unit: string }) {
  return (
    <div className="relative">
      <Input type="number" inputMode="decimal" className={cn("pr-14", className)} {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted">{unit}</span>
    </div>
  );
}
