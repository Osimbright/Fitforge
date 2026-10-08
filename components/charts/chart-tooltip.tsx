"use client";

/** Dark tooltip card shared by all charts. Text uses text tokens, a swatch carries identity. */
export function TooltipCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-fg">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-muted">
          {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
          {r.label}: <span className="font-semibold text-fg">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Screen-reader data table so no chart is color- or vision-only. */
export function SrTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
