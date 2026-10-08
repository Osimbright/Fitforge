"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SrTable, TooltipCard } from "./chart-tooltip";
import { axisProps, CHART } from "./theme";

/** Single-series trend line with soft area wash, crosshair tooltip and optional goal line. */
export function LineSeries({
  data,
  unit,
  label,
  goal,
  goalLabel = "Goal",
  height = 240,
}: {
  data: { label: string; value: number; sublabel?: string }[];
  unit: string;
  label: string;
  goal?: number | null;
  goalLabel?: string;
  height?: number;
}) {
  const values = data.map((d) => d.value).concat(goal ? [goal] : []);
  const min = Math.floor(Math.min(...values) - 2);
  const max = Math.ceil(Math.max(...values) + 2);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="lineWash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.series} stopOpacity={0.14} />
              <stop offset="100%" stopColor={CHART.series} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
          <XAxis dataKey="label" {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} domain={[min, max]} width={48} />
          {goal ? (
            <ReferenceLine
              y={goal}
              stroke={CHART.axis}
              strokeWidth={1}
              label={{ value: `${goalLabel} ${goal} ${unit}`, position: "insideTopRight", fill: CHART.axis, fontSize: 11 }}
            />
          ) : null}
          <Tooltip
            cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <TooltipCard
                  title={(payload[0].payload as { sublabel?: string; label: string }).sublabel ?? String(payload[0].payload.label)}
                  rows={[{ label, value: `${payload[0].value} ${unit}`, color: CHART.series }]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART.series}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#lineWash)"
            dot={data.length <= 12 ? { r: 4, fill: CHART.series, stroke: CHART.surface, strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: CHART.series, stroke: CHART.surface, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <SrTable caption={label} headers={["Date", `${label} (${unit})`]} rows={data.map((d) => [d.sublabel ?? d.label, d.value])} />
    </div>
  );
}
