"use client";

import { Camera, Check, ChevronLeft, ChevronRight, Dumbbell, Flag, Info, Plus, Trash2, Trophy, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteSet, discardSession, finishSession, saveSet } from "@/app/(app)/actions/workout";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { PhotoUploader } from "@/components/progress/photo-uploader";
import type { StoredWorkoutPlan } from "@/lib/ai/schemas";
import type { SessionSet } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RestTimer } from "./rest-timer";

export type PrevSet = { set_no: number; reps: number | null; weight_kg: number | null; duration_sec: number | null };
type Day = StoredWorkoutPlan["days"][number];
type Row = { id?: string; weight: string; reps: string; duration: string; done: boolean; saving?: boolean };

function parseTargetReps(reps: string): string {
  const m = reps.match(/\d+/);
  return m ? m[0] : "";
}
function parseTargetSeconds(reps: string): string {
  const min = reps.match(/(\d+)\s*min/i);
  if (min) return String(Number(min[1]) * 60);
  const s = reps.match(/\d+/);
  return s ? s[0] : "30";
}

export function SessionTracker({
  sessionId,
  startedAt,
  day,
  savedSets,
  previous,
  bestWeight,
}: {
  sessionId: string;
  startedAt: string;
  day: Day;
  savedSets: SessionSet[];
  previous: Record<string, PrevSet[]>;
  bestWeight: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(0);
  const [rest, setRest] = useState<{ seconds: number; nonce: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finishOpen, setFinishOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState<{ volume: number; minutes: number; calories: number; prs: string[] } | null>(null);
  const [photoAdded, setPhotoAdded] = useState(false);

  const [rows, setRows] = useState<Row[][]>(() =>
    day.exercises.map((ex) => {
      const saved = savedSets.filter((s) => s.exercise_id === ex.exercise_id);
      const prev = previous[ex.exercise_id] ?? [];
      const count = Math.max(ex.sets, saved.length);
      return Array.from({ length: count }, (_, i) => {
        const s = saved.find((x) => x.set_no === i + 1);
        const p = prev.find((x) => x.set_no === i + 1) ?? prev[prev.length - 1];
        if (s) {
          return {
            id: s.id,
            weight: s.weight_kg?.toString() ?? "",
            reps: s.reps?.toString() ?? "",
            duration: s.duration_sec?.toString() ?? "",
            done: s.completed,
          };
        }
        return {
          weight: p?.weight_kg ? String(p.weight_kg) : "",
          reps: p?.reps ? String(p.reps) : parseTargetReps(ex.reps),
          duration: p?.duration_sec ? String(p.duration_sec) : parseTargetSeconds(ex.reps),
          done: false,
        };
      });
    }),
  );

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const ex = day.exercises[current];
  const exRows = rows[current];
  const isTime = ex.tracking === "time";
  const doneSets = rows.flat().filter((r) => r.done).length;
  const totalSets = rows.flat().length;

  const updateRow = (ei: number, ri: number, patch: Partial<Row>) =>
    setRows((all) => all.map((r, i) => (i === ei ? r.map((x, j) => (j === ri ? { ...x, ...patch } : x)) : r)));

  async function toggleDone(ri: number) {
    const row = exRows[ri];
    const nextDone = !row.done;
    updateRow(current, ri, { done: nextDone, saving: true });
    if (!nextDone && row.id) {
      const res = await deleteSet(row.id);
      updateRow(current, ri, { id: undefined, saving: false });
      if (!res.ok) toast.error(res.error);
      return;
    }
    const res = await saveSet({
      id: row.id,
      session_id: sessionId,
      exercise_id: ex.exercise_id,
      exercise_name: ex.name,
      set_no: ri + 1,
      reps: isTime ? null : Number(row.reps) || 0,
      weight_kg: isTime ? null : row.weight === "" ? null : Number(row.weight),
      duration_sec: isTime ? Number(row.duration) || 0 : null,
    });
    if (!res.ok || !res.data) {
      updateRow(current, ri, { done: false, saving: false });
      toast.error(res.ok ? "Couldn't save set" : res.error);
      return;
    }
    updateRow(current, ri, { id: res.data.id, saving: false });
    const allDone = exRows.every((r, j) => (j === ri ? true : r.done));
    if (allDone && current < day.exercises.length - 1) {
      toast.success(`${ex.name} complete! 🎉`);
    }
    setRest({ seconds: ex.rest_seconds, nonce: Date.now() });
  }

  const endRest = useCallback(() => setRest(null), []);

  function finish() {
    startTransition(async () => {
      const res = await finishSession(sessionId, notes);
      if (!res.ok || !res.data) {
        toast.error(res.ok ? "Couldn't finish" : res.error);
        return;
      }
      const prs = day.exercises
        .filter((e, i) => {
          const best = bestWeight[e.exercise_id] ?? 0;
          return best > 0 && rows[i].some((r) => r.done && Number(r.weight) > best);
        })
        .map((e) => e.name);
      setFinishOpen(false);
      setRest(null);
      setSummary({ ...res.data, prs });
    });
  }

  function discard() {
    if (!window.confirm("Discard this workout? Logged sets will be deleted.")) return;
    startTransition(async () => {
      const res = await discardSession(sessionId);
      if (res.ok) router.push("/workouts");
      else toast.error(res.error);
    });
  }

  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/workouts" className="flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ChevronLeft className="h-4 w-4" /> Plan
        </Link>
        <div className="text-center">
          <p className="text-xs text-muted">Elapsed</p>
          <p className="font-display text-xl font-bold tabular-nums">
            {mm}:{ss}
          </p>
        </div>
        <Button size="sm" onClick={() => setFinishOpen(true)}>
          <Flag className="h-4 w-4" /> Finish
        </Button>
      </div>

      <h1 className="mt-5 font-display text-2xl font-bold">{day.name}</h1>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${(doneSets / Math.max(1, totalSets)) * 100}%` }} />
        </div>
        <span className="text-xs text-muted">
          {doneSets}/{totalSets} sets
        </span>
      </div>

      {/* Exercise chips */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {day.exercises.map((e, i) => {
          const complete = rows[i].every((r) => r.done);
          return (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer",
                i === current ? "border-lime bg-lime text-black" : complete ? "border-lime/40 text-lime" : "border-line text-muted",
              )}
            >
              {complete && i !== current && <Check className="h-3 w-3" />}
              {i + 1}. {e.name.length > 18 ? e.name.slice(0, 18) + "…" : e.name}
            </button>
          );
        })}
      </div>

      {/* Current exercise */}
      <div className="card mt-3 overflow-hidden">
        <div className="relative h-48 bg-surface-3 sm:h-60">
          {ex.image ? (
            <Image src={ex.image} alt={ex.name} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
          ) : (
            <Dumbbell className="m-auto h-full w-10 text-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
          <Link
            href={`/exercises/${encodeURIComponent(ex.exercise_id)}`}
            target="_blank"
            className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold backdrop-blur"
          >
            <Info className="h-3.5 w-3.5" /> How to
          </Link>
        </div>
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-lime">
            Exercise {current + 1} of {day.exercises.length}
          </p>
          <h2 className="mt-1 text-xl font-bold">{ex.name}</h2>
          <p className="mt-1 text-sm text-muted">
            Target: {ex.sets} × {ex.reps} · Rest {ex.rest_seconds}s
          </p>
          {ex.notes && <p className="mt-2 text-sm text-fg/80">💡 {ex.notes}</p>}

          {/* Set table */}
          <div className="mt-5">
            <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_3rem] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <span>Set</span>
              <span>Previous</span>
              {isTime ? <span className="col-span-2">Seconds</span> : <><span>kg</span><span>Reps</span></>}
              <span />
            </div>
            <div className="mt-2 space-y-2">
              {exRows.map((r, ri) => {
                const prev = previous[ex.exercise_id]?.find((p) => p.set_no === ri + 1);
                return (
                  <div
                    key={ri}
                    className={cn(
                      "grid grid-cols-[2.5rem_1fr_1fr_1fr_3rem] items-center gap-2 rounded-xl px-1 py-1 transition-colors",
                      r.done && "bg-lime/10",
                    )}
                  >
                    <span className="text-center text-sm font-bold">{ri + 1}</span>
                    <span className="truncate text-xs text-muted">
                      {prev ? (isTime ? `${prev.duration_sec}s` : `${prev.weight_kg ?? 0}kg × ${prev.reps}`) : "—"}
                    </span>
                    {isTime ? (
                      <input
                        inputMode="numeric"
                        aria-label={`Set ${ri + 1} seconds`}
                        value={r.duration}
                        disabled={r.done}
                        onChange={(e) => updateRow(current, ri, { duration: e.target.value.replace(/[^\d]/g, "") })}
                        className="col-span-2 h-10 rounded-lg border border-line bg-surface-2 px-3 text-center text-sm font-semibold disabled:opacity-70"
                      />
                    ) : (
                      <>
                        <input
                          inputMode="decimal"
                          aria-label={`Set ${ri + 1} weight`}
                          placeholder="0"
                          value={r.weight}
                          disabled={r.done}
                          onChange={(e) => updateRow(current, ri, { weight: e.target.value.replace(/[^\d.]/g, "") })}
                          className="h-10 w-full rounded-lg border border-line bg-surface-2 px-2 text-center text-sm font-semibold disabled:opacity-70"
                        />
                        <input
                          inputMode="numeric"
                          aria-label={`Set ${ri + 1} reps`}
                          value={r.reps}
                          disabled={r.done}
                          onChange={(e) => updateRow(current, ri, { reps: e.target.value.replace(/[^\d]/g, "") })}
                          className="h-10 w-full rounded-lg border border-line bg-surface-2 px-2 text-center text-sm font-semibold disabled:opacity-70"
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleDone(ri)}
                      disabled={r.saving}
                      aria-label={r.done ? `Undo set ${ri + 1}` : `Complete set ${ri + 1}`}
                      className={cn(
                        "flex h-10 w-12 items-center justify-center rounded-lg transition-colors cursor-pointer",
                        r.done ? "bg-lime text-black" : "bg-surface-3 text-muted hover:text-fg",
                      )}
                    >
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setRows((all) =>
                    all.map((r, i) => (i === current ? [...r, { ...r[r.length - 1], id: undefined, done: false }] : r)),
                  )
                }
              >
                <Plus className="h-4 w-4" /> Add set
              </Button>
              {exRows.length > 1 && !exRows[exRows.length - 1].done && (
                <Button variant="ghost" size="sm" onClick={() => setRows((all) => all.map((r, i) => (i === current ? r.slice(0, -1) : r)))}>
                  <Trash2 className="h-4 w-4" /> Remove set
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prev / next */}
      <div className="mt-4 flex justify-between gap-3">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        {current < day.exercises.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)}>
            Next exercise <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setFinishOpen(true)}>
            <Flag className="h-4 w-4" /> Finish workout
          </Button>
        )}
      </div>

      <button type="button" onClick={discard} className="mx-auto mt-8 flex items-center gap-1 text-xs text-muted hover:text-danger cursor-pointer">
        <X className="h-3.5 w-3.5" /> Discard workout
      </button>

      {rest && <RestTimer key={rest.nonce} seconds={rest.seconds} onDone={endRest} />}

      <Dialog open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish workout?">
        <p className="text-sm text-muted">
          You completed <b className="text-fg">{doneSets}</b> of {totalSets} sets in {mm} minutes.
        </p>
        <Textarea className="mt-4" placeholder="How did it feel? (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setFinishOpen(false)}>
            Keep going
          </Button>
          <Button onClick={finish} loading={pending}>
            Finish
          </Button>
        </div>
      </Dialog>

      <Dialog open={summary !== null} onClose={() => router.push("/dashboard")} title="Workout complete! 🎉">
        {summary && (
          <div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-surface-2 p-3">
                <p className="font-display text-2xl font-bold">{summary.minutes}</p>
                <p className="text-xs text-muted">minutes</p>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <p className="font-display text-2xl font-bold">{summary.volume.toLocaleString("en-US")}</p>
                <p className="text-xs text-muted">kg volume</p>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <p className="font-display text-2xl font-bold">{summary.calories}</p>
                <p className="text-xs text-muted">kcal burned</p>
              </div>
            </div>
            {summary.prs.length > 0 && (
              <div className="mt-4 rounded-2xl border border-lime/30 bg-lime/10 p-4">
                <p className="flex items-center gap-2 font-semibold text-lime">
                  <Trophy className="h-4 w-4" /> New personal records
                </p>
                <ul className="mt-1 text-sm text-fg/85">
                  {summary.prs.map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              </div>
            )}
            {photoAdded ? (
              <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-surface-2 p-4 text-sm text-fg/85">
                <Check className="h-4 w-4 text-lime" /> Progress photo saved —{" "}
                <Link href="/progress" className="font-semibold text-lime hover:underline">view gallery</Link>
              </p>
            ) : (
              <PhotoUploader sessionId={sessionId} onUploaded={() => setPhotoAdded(true)} className="mt-4 w-full text-left">
                <span className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-4 transition-colors hover:border-lime/60">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime/10 text-lime">
                    <Camera className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">Add a progress photo</span>
                    <span className="block text-xs text-muted">Capture the pump — track how your body changes session to session.</span>
                  </span>
                </span>
              </PhotoUploader>
            )}
            <Button className="mt-5 w-full" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
