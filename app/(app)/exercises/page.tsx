import { Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { requireOnboardedProfile } from "@/lib/data/profile";
import type { Exercise } from "@/lib/types";
import { cn, exerciseImageUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Exercise library" };

const MUSCLES = ["chest", "lats", "middle back", "shoulders", "biceps", "triceps", "quadriceps", "hamstrings", "glutes", "calves", "abdominals", "lower back"];
const EQUIPMENT = ["body only", "dumbbell", "barbell", "kettlebells", "bands", "cable", "machine"];
const PAGE = 24;

export default async function ExercisesPage({ searchParams }: PageProps<"/exercises">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const muscle = typeof sp.muscle === "string" ? sp.muscle : "";
  const equipment = typeof sp.equipment === "string" ? sp.equipment : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { supabase } = await requireOnboardedProfile();

  let query = supabase
    .from("exercises")
    .select("id,name,level,equipment,category,primary_muscles,images", { count: "exact" })
    .order("name")
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) query = query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  if (muscle) query = query.contains("primary_muscles", [muscle]);
  if (equipment) query = query.eq("equipment", equipment);
  const { data, count } = await query;
  const list = (data ?? []) as Exercise[];
  const pages = Math.ceil((count ?? 0) / PAGE);

  const href = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(muscle && { muscle }), ...(equipment && { equipment }) });
    for (const [k, v] of Object.entries(patch)) {
      if (v === "") p.delete(k);
      else p.set(k, String(v));
    }
    if (!("page" in patch)) p.delete("page");
    return `/exercises?${p}`;
  };

  return (
    <div>
      <PageHeader title="Exercise library" subtitle={`${count ?? 0} exercises with step-by-step instructions`} />

      <form className="relative mb-4" action="/exercises">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          aria-label="Search exercises"
          defaultValue={q}
          placeholder="Search exercises, e.g. squat, push-up…"
          className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-sm focus:border-lime/60 focus:outline-none"
        />
        {muscle && <input type="hidden" name="muscle" value={muscle} />}
        {equipment && <input type="hidden" name="equipment" value={equipment} />}
      </form>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <FilterChip href={href({ muscle: "" })} active={!muscle}>All muscles</FilterChip>
        {MUSCLES.map((m) => (
          <FilterChip key={m} href={href({ muscle: m })} active={muscle === m}>{m}</FilterChip>
        ))}
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <FilterChip href={href({ equipment: "" })} active={!equipment}>Any equipment</FilterChip>
        {EQUIPMENT.map((e) => (
          <FilterChip key={e} href={href({ equipment: e })} active={equipment === e}>{e}</FilterChip>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState title="No exercises found" body={count === 0 && !q && !muscle && !equipment ? "The library hasn't been seeded yet — run `npm run seed:exercises`." : "Try a different search or filter."} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {list.map((e) => {
            const img = exerciseImageUrl(e.images[0]);
            return (
              <Link key={e.id} href={`/exercises/${encodeURIComponent(e.id)}`} className="card group overflow-hidden hover:border-lime/40">
                <div className="relative aspect-[4/3] bg-surface-3">
                  {img && <Image src={img} alt={e.name} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{e.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge className="capitalize">{e.primary_muscles[0]}</Badge>
                    <Badge tone={e.level === "beginner" ? "lime" : e.level === "intermediate" ? "sky" : "ember"} className="capitalize">{e.level}</Badge>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="rounded-full border border-line px-4 py-2 hover:border-lime/60" href={href({ page: page - 1 })}>← Prev</Link>}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages && <Link className="rounded-full border border-line px-4 py-2 hover:border-lime/60" href={href({ page: page + 1 })}>Next →</Link>}
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors",
        active ? "border-lime bg-lime text-black" : "border-line text-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}
