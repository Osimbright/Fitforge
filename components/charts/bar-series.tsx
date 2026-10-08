"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TooltipCard, SrTable } from "./chart-tooltip";
import { axisProps, CHART } from "./theme";

/** Single-series column chart (weekly minutes, weekly volume…). */
export function BarSeries({
  data,
  unit,
  label,
  highlightIndex,
  height = 200,
}: {
  data: { label: string; value: number; sublabel?: string }[];
  unit: string;
  label: string;
  highlightIndex?: number;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} width={44} />
          <Tooltip
            cursor={{ fill: "rgb(255 255 255 / 0.04)" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <TooltipCard
                  title={(payload[0].payload as { sublabel?: string; label: string }).sublabel ?? String(payload[0].payload.label)}
                  rows={[{ label, value: `${Number(payload[0].value).toLocaleString("en-US")} ${unit}`, color: CHART.series }]}
                />
              ) : null
            }
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART.series} fillOpacity={highlightIndex === undefined || highlightIndex === i ? 1 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <SrTable caption={label} headers={["Period", `${label} (${unit})`]} rows={data.map((d) => [d.sublabel ?? d.label, d.value])} />
    </div>
  );
}
