import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui/card";
import { requireOnboardedProfile } from "@/lib/data/profile";
import type { Exercise } from "@/lib/types";
import { exerciseImageUrl } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/exercises/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: decodeURIComponent(id).replace(/_/g, " ") };
}

export default async function ExercisePage({ params }: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const { supabase } = await requireOnboardedProfile();
  const { data } = await supabase.from("exercises").select("*").eq("id", decodeURIComponent(id)).maybeSingle<Exercise>();
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/exercises" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" /> Library
      </Link>
      <h1 className="font-display text-3xl font-bold tracking-tight">{data.name}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="lime" className="capitalize">{data.level}</Badge>
        <Badge className="capitalize">{data.equipment ?? "no equipment"}</Badge>
        <Badge className="capitalize">{data.category}</Badge>
        {data.mechanic && <Badge className="capitalize">{data.mechanic}</Badge>}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {data.images.slice(0, 2).map((img, i) => (
          <div key={img} className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-3">
            <Image src={exerciseImageUrl(img)!} alt={`${data.name} — ${i === 0 ? "start" : "end"} position`} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
            <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold">{i === 0 ? "Start" : "Finish"}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_260px]">
        <Card>
          <h2 className="font-semibold">How to do it</h2>
          <ol className="mt-4 space-y-4">
            {data.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-fg/85">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime/15 text-xs font-bold text-lime">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
        <Card className="h-fit">
          <h2 className="font-semibold">Muscles worked</h2>
          <p className="mt-3 text-xs uppercase tracking-widest text-muted">Primary</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.primary_muscles.map((m) => <Badge key={m} tone="lime" className="capitalize">{m}</Badge>)}
          </div>
          {data.secondary_muscles.length > 0 && (
            <>
              <p className="mt-4 text-xs uppercase tracking-widest text-muted">Secondary</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.secondary_muscles.map((m) => <Badge key={m} className="capitalize">{m}</Badge>)}
              </div>
            </>
          )}
          <Link href={`/coach?q=${encodeURIComponent(`Give me form tips for ${data.name}`)}`} className="mt-5 block text-sm font-semibold text-lime hover:underline">
            Ask the AI coach about form →
          </Link>
        </Card>
      </div>
    </div>
  );
}
