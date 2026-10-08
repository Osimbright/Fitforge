import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-5", className)} {...props} />;
}

export function CardHeader({
  title,
  action,
  href,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h3 className="font-semibold text-fg">{title}</h3>
      {action ??
        (href ? (
          <Link href={href} className="text-sm font-medium text-lime hover:underline">
            View all
          </Link>
        ) : null)}
    </div>
  );
}

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "lime" | "ember" | "violet" | "sky" | "danger" }) {
  const tones = {
    default: "bg-surface-3 text-fg/80",
    lime: "bg-lime/15 text-lime",
    ember: "bg-ember/15 text-ember",
    violet: "bg-violet/15 text-violet",
    sky: "bg-sky/15 text-sky",
    danger: "bg-danger/15 text-danger",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div className={cn("h-full rounded-full bg-lime transition-all duration-500", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="rounded-full bg-surface-2 p-3 text-lime">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}
