import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/components/brand";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="hero-gradient flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <LogoMark className="h-14 w-14" />
      <p className="mt-8 font-display text-7xl font-bold text-lime">404</p>
      <h1 className="mt-2 text-xl font-semibold">This page skipped leg day.</h1>
      <p className="mt-2 text-muted">It doesn&apos;t exist, or it moved.</p>
      <Link href="/dashboard" className="mt-8 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-black hover:bg-[#d4ff4a]">
        Back to dashboard
      </Link>
    </div>
  );
}
