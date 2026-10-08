import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#c6f432" />
      {/* Anvil-meets-lightning "F" */}
      <path d="M10 8h13l-2 4h-7v3h6l-2 4h-4v5h-4V8z" fill="#0b0d0c" />
    </svg>
  );
}

/** Flexed-bicep mark in brand lime — replaces the 💪 emoji. Sized to the surrounding text (1em). */
export function FlexIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("inline-block h-[1em] w-[1em] shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="ff-flex-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2ff7a" />
          <stop offset="1" stopColor="#8fb31c" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ff-flex-grad)"
        d="M4 60 L4 47 C6 37 13 30 22 30 C29 30 34 33 37 38 C37.5 32 38.2 27 38 22 C33 22 30 17 31 12 C32 5 39 2 46 2 C53 2 57 8 55 15 C54.5 17 54 19 53 21 C59 27 62 38 60 47 C58 56 50 60 42 60 C30 61 16 62 4 60 Z"
      />
      {/* Sheen on the bicep peak */}
      <ellipse cx="17" cy="38" rx="7.5" ry="3" transform="rotate(-28 17 38)" fill="#fff" opacity=".28" />
      {/* Muscle definition + curled fingers */}
      <g fill="none" stroke="#0b0d0c" strokeWidth="2" strokeLinecap="round" opacity=".5">
        <path d="M37 38 C32 44 22 46 12 43" />
        <path d="M32 10 C35 10 37 11 38.5 12.5" />
        <path d="M31.6 15 C34.5 15 36.8 16 38.3 17.6" />
        <path d="M41 6 C45 5.5 48 7.5 49 11" />
        <path d="M53.5 25 C56.5 33 56.5 41 52 49" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">
        Fit<span className="text-lime">Forge</span>
      </span>
    </Link>
  );
}
