import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useTheme, type ThemeMode } from '../hooks/useTheme'

export type ChartDatum = {
  name: string
  value: number
}

function chartColors(theme: ThemeMode) {
  return theme === 'dark'
    ? { mark: '#f59e0b', grid: '#292524', axis: '#a8a29e', label: '#e7e5e4', cursor: 'rgba(250, 250, 249, 0.06)', surface: '#1c1917' }
    : { mark: '#d97706', grid: '#e7e5e4', axis: '#78716c', label: '#44403c', cursor: 'rgba(28, 25, 23, 0.04)', surface: '#ffffff' }
}

type TooltipProps = {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<{ value?: unknown; payload?: { name?: string; tooltipLabel?: string } }>
  unit?: string
}

function ChartTooltip({ active, payload, label, unit = 'pts' }: TooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const title = entry.payload?.tooltipLabel ?? entry.payload?.name ?? label
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-stone-700 dark:bg-stone-800">
      <p className="font-medium text-stone-500 dark:text-stone-400">{title}</p>
      <p className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-white">
        {Number(entry.value ?? 0).toLocaleString()} {unit}
      </p>
    </div>
  )
}

const truncate = (value: string, max = 16) => (value.length > max ? `${value.slice(0, max - 1)}…` : value)

// Recharts' default tick word-wraps long names onto two lines; render a single truncated line instead.
function CategoryTick({ x, y, payload, fill }: { x?: number | string; y?: number | string; payload?: { value: string }; fill: string }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={fill} fontSize={12}>
      <title>{payload?.value}</title>
      {truncate(payload?.value ?? '')}
    </text>
  )
}

/** Horizontal bars: category names stay readable on narrow screens. Values sit at the bar tips. */
export function CategoryBarChart({ data }: { data: ChartDatum[] }) {
  const { theme } = useTheme()
  const colors = chartColors(theme)
  const longest = data.reduce((max, item) => Math.max(max, Math.min(item.name.length, 16)), 0)
  const labelWidth = Math.min(132, Math.max(56, longest * 7 + 12))
  const height = Math.max(data.length * 40, 80)

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide domain={[0, (dataMax: number) => Math.max(dataMax, 1)]} />
          <YAxis
            type="category"
            dataKey="name"
            width={labelWidth}
            tickLine={false}
            axisLine={false}
            tick={(props) => <CategoryTick {...props} fill={colors.axis} />}
          />
          <Tooltip cursor={{ fill: colors.cursor }} content={<ChartTooltip />} />
          <Bar dataKey="value" fill={colors.mark} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" offset={8} fill={colors.label} fontSize={12} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export type TrendDatum = {
  name: string
  tooltipLabel: string
  value: number
}

export function TrendChart({ data }: { data: TrendDatum[] }) {
  const { theme } = useTheme()
  const colors = chartColors(theme)

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: colors.axis, fontSize: 12 }}
            minTickGap={28}
            tickMargin={8}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: colors.axis, fontSize: 12 }}
            width={32}
          />
          <Tooltip cursor={{ stroke: colors.axis, strokeWidth: 1 }} content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.mark}
            strokeWidth={2}
            fill={colors.mark}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, fill: colors.mark, stroke: colors.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
