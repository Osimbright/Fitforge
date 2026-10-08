// Chart tokens. The macro palette is validated (dark surface #141716) for
// lightness band, chroma, CVD separation and contrast — keep the fixed order.
export const MACRO_COLORS = {
  carbs: "#D9692A",
  protein: "#1F9E84",
  fat: "#9B5DE5",
} as const;

export const CHART = {
  series: "#C6F432", // single-series marks (brand accent)
  grid: "#232825",
  axis: "#8A938E",
  surface: "#141716",
  track: "#232825",
};

export const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;
