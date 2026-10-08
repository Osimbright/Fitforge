"use client";

import { Pause, Play, Plus, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = i === 2 ? 1046 : 784;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.2);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* audio not available */
  }
}

/** Floating rest countdown. The parent remounts it (via `key`) to restart after each set. */
export function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000);
  const [paused, setPaused] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // While paused, `paused` holds the milliseconds that were left.
  const left = paused !== null ? Math.ceil(paused / 1000) : Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    if (paused === null && left === 0 && !fired.current) {
      fired.current = true;
      beep();
      onDone();
    }
  }, [left, paused, onDone]);

  const pct = Math.min(100, (left / Math.max(1, seconds)) * 100);
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 px-4 lg:bottom-6 lg:left-64">
      <div className="mx-auto flex max-w-md items-center gap-4 rounded-full border border-lime/40 bg-surface-2/95 p-2 pl-5 shadow-2xl backdrop-blur">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted">Rest</p>
          <p className="font-display text-2xl font-bold tabular-nums text-lime">
            {mm}:{ss}
          </p>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full bg-lime transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          type="button"
          aria-label="Add 15 seconds"
          onClick={() => (paused !== null ? setPaused(paused + 15000) : setEndsAt((e) => e + 15000))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-3 text-sm font-bold cursor-pointer"
        >
          <Plus className="h-3 w-3" />15
        </button>
        <button
          type="button"
          aria-label={paused !== null ? "Resume" : "Pause"}
          onClick={() => {
            if (paused !== null) {
              setEndsAt(Date.now() + paused);
              setPaused(null);
            } else setPaused(endsAt - Date.now());
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-3 cursor-pointer"
        >
          {paused !== null ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button
          type="button"
          aria-label="Skip rest"
          onClick={onDone}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-black cursor-pointer"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
