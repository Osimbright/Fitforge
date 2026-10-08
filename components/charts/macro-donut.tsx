"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SrTable, TooltipCard } from "./chart-tooltip";
import { CHART, MACRO_COLORS } from "./theme";

/**
 * Calories eaten vs target in the centre; ring split by macro calories.
 * Legend lives beside the ring (identity never relies on color alone).
 */
export function MacroDonut({
  calories,
  target,
  protein,
  carbs,
  fat,
  targets,
  size = 168,
}: {
  calories: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
  targets?: { protein_g: number; carbs_g: number; fat_g: number };
  size?: number;
}) {
  const slices = [
    { key: "Carbs", grams: carbs, kcal: carbs * 4, color: MACRO_COLORS.carbs, target: targets?.carbs_g },
    { key: "Protein", grams: protein, kcal: protein * 4, color: MACRO_COLORS.protein, target: targets?.protein_g },
    { key: "Fat", grams: fat, kcal: fat * 9, color: MACRO_COLORS.fat, target: targets?.fat_g },
  ];
  const totalKcal = slices.reduce((t, s) => t + s.kcal, 0);
  const empty = totalKcal === 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={empty ? [{ key: "empty", kcal: 1 }] : slices}
              dataKey="kcal"
              nameKey="key"
              innerRadius="76%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={empty ? 0 : 2}
              stroke={CHART.surface}
              strokeWidth={2}
              cornerRadius={4}
              isAnimationActive
            >
              {empty ? <Cell fill={CHART.track} /> : slices.map((s) => <Cell key={s.key} fill={s.color} />)}
            </Pie>
            {!empty && (
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const s = payload[0].payload as (typeof slices)[number];
                  return (
                    <TooltipCard
                      title={s.key}
                      rows={[
                        { label: "Eaten", value: `${Math.round(s.grams)} g${s.target ? ` / ${s.target} g` : ""}`, color: s.color },
                        { label: "Share", value: `${Math.round((s.kcal / totalKcal) * 100)}% of kcal` },
                      ]}
                    />
                  );
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold">{Math.round(calories).toLocaleString("en-US")}</span>
          <span className="text-xs text-muted">/ {target.toLocaleString("en-US")} kcal</span>
        </div>
      </div>
      <ul className="w-full space-y-3 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 text-fg/90">{s.key}</span>
            <span className="text-muted">{empty ? "0%" : `${Math.round((s.kcal / totalKcal) * 100)}%`}</span>
            <span className="w-24 text-right font-semibold">
              {Math.round(s.grams)}
              {s.target ? <span className="font-normal text-muted"> / {s.target} g</span> : " g"}
            </span>
          </li>
        ))}
      </ul>
      <SrTable
        caption="Macronutrients eaten today"
        headers={["Macro", "Grams", "Target grams"]}
        rows={slices.map((s) => [s.key, Math.round(s.grams), s.target ?? "—"])}
      />
    </div>
  );
}
