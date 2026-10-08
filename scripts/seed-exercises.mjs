// Seeds the public `exercises` table from the open-source free-exercise-db (Unlicense).
// Usage: npm run seed:exercises   (reads .env.local)
import { createClient } from "@supabase/supabase-js";

const SOURCE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

console.log("Downloading exercise library…");
const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
const raw = await res.json();

const rows = raw.map((e) => ({
  id: e.id,
  name: e.name,
  force: e.force ?? null,
  level: e.level,
  mechanic: e.mechanic ?? null,
  equipment: e.equipment ?? null,
  category: e.category,
  primary_muscles: e.primaryMuscles ?? [],
  secondary_muscles: e.secondaryMuscles ?? [],
  instructions: e.instructions ?? [],
  images: e.images ?? [],
}));

for (let i = 0; i < rows.length; i += 200) {
  const batch = rows.slice(i, i + 200);
  const { error } = await supabase.from("exercises").upsert(batch, { onConflict: "id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }
  console.log(`  ${Math.min(i + 200, rows.length)} / ${rows.length}`);
}
console.log(`✓ Seeded ${rows.length} exercises`);
