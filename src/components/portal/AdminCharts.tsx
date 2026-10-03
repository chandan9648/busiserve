"use client";

import { useState, useEffect, useRef } from "react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MonthlyRevenueItem = {
  label: string;
  amount: number;
};

type MonthlyUsersItem = {
  label: string;
  count: number;
};

type PlanDistributionItem = {
  label: string;
  count: number;
};

type AdminChartData = {
  totalUsers?: number;
  activeUsers?: number;
  expiredUsers?: number;
  totalRevenue?: number;
  monthlyRevenue?: MonthlyRevenueItem[];
  monthlyUsers?: MonthlyUsersItem[];
  planDistribution?: PlanDistributionItem[];
};

type VisitSummary = {
  total: number;
  today: number;
  yesterday: number;
};

type AdminChartsProps = {
  data?: AdminChartData | null;
  /**
   * Unique site visitors, polled separately by the dashboard.
   * Null until the first reading arrives, which the card shows as a
   * dash rather than as zero visitors.
   */
  visits?: VisitSummary | null;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMonthlyRevenue(
  data?: AdminChartData | null,
): MonthlyRevenueItem[] {
  if (!data || !Array.isArray(data.monthlyRevenue)) {
    return [];
  }

  return data.monthlyRevenue.map((item) => ({
    label: String(item?.label ?? ""),
    amount: safeNumber(item?.amount),
  }));
}

function normalizeMonthlyUsers(
  data?: AdminChartData | null,
): MonthlyUsersItem[] {
  if (!data || !Array.isArray(data.monthlyUsers)) {
    return [];
  }

  return data.monthlyUsers.map((item) => ({
    label: String(item?.label ?? ""),
    count: safeNumber(item?.count),
  }));
}

function normalizePlanDistribution(
  data?: AdminChartData | null,
): PlanDistributionItem[] {
  if (!data || !Array.isArray(data.planDistribution)) {
    return [];
  }

  return data.planDistribution.map((item) => ({
    label: String(item?.label ?? ""),
    count: safeNumber(item?.count),
  }));
}

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

/* -------------------------------------------------------------------------- */
/* Animated counter hook                                                      */
/* -------------------------------------------------------------------------- */

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let animationFrame = 0;

    const step = (timestamp: number) => {
      if (start === null) {
        start = timestamp;
      }

      const progress = Math.min(
        (timestamp - start) / duration,
        1,
      );

      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(target * eased));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [target, duration]);

  return value;
}

/* -------------------------------------------------------------------------- */
/* Stat card icons                                                             */
/* -------------------------------------------------------------------------- */

function IconUsers() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      />
      <circle cx="9" cy="7" r="4" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      />
    </svg>
  );
}

function IconActive() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
      />
    </svg>
  );
}

function IconExpired() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="10" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3"
      />
    </svg>
  );
}

function IconRevenue() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v2m0 16v2m-5-9H5m14 0h-2"
      />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function IconVisitors() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.5-6.75 9.75-6.75S21.75 12 21.75 12s-3.5 6.75-9.75 6.75S2.25 12 2.25 12Z"
      />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat card                                                                   */
/* -------------------------------------------------------------------------- */

const STAT_CONFIG = [
  {
    key: "users",
    gradient: "from-violet-600 to-indigo-600",
    iconBg: "bg-white/20",
    Icon: IconUsers,
  },
  {
    key: "active",
    gradient: "from-emerald-500 to-teal-600",
    iconBg: "bg-white/20",
    Icon: IconActive,
  },
  {
    key: "expired",
    gradient: "from-amber-500 to-orange-600",
    iconBg: "bg-white/20",
    Icon: IconExpired,
  },
  {
    key: "revenue",
    gradient: "from-rose-500 to-pink-600",
    iconBg: "bg-white/20",
    Icon: IconRevenue,
  },
  {
    key: "visitors",
    gradient: "from-sky-500 to-cyan-600",
    iconBg: "bg-white/20",
    Icon: IconVisitors,
  },
];

function StatCard({
  label,
  rawValue,
  description,
  configKey,
  isRevenue = false,
  pending = false,
}: {
  label: string;
  rawValue: number;
  description?: string;
  configKey: string;
  isRevenue?: boolean;
  /**
   * True while the figure has not been read yet. The card shows a dash
   * instead of counting up to zero, so "not loaded" is never displayed
   * as a real measurement of nothing.
   */
  pending?: boolean;
}) {
  const cfg =
    STAT_CONFIG.find((item) => item.key === configKey) ??
    STAT_CONFIG[0];

  const counted = useCountUp(rawValue);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.gradient} p-6 text-white shadow-xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-white/5" />

      <div className="flex items-start justify-between">
        <div
          className={`rounded-xl ${cfg.iconBg} p-2.5`}
        >
          <cfg.Icon />
        </div>

        <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
          LIVE
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-white/75">
        {label}
      </p>

      <p className="mt-1 text-4xl font-extrabold tracking-tight">
        {pending
          ? "—"
          : isRevenue
            ? formatCurrency(counted)
            : counted.toLocaleString("en-IN")}
      </p>

      {description && (
        <p className="mt-2 text-xs text-white/60">
          {description}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Animated bar chart                                                         */
/* -------------------------------------------------------------------------- */

function BarChart({
  title,
  labels,
  values,
  color = "#6366f1",
  prefix = "",
}: {
  title: string;
  labels: string[];
  values: number[];
  color?: string;
  prefix?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const safeLabels = Array.isArray(labels)
    ? labels
    : [];

  const safeValues = Array.isArray(values)
    ? values.map(safeNumber)
    : [];

  const count = Math.min(
    safeLabels.length,
    safeValues.length,
  );

  const finalLabels = safeLabels.slice(0, count);
  const finalValues = safeValues.slice(0, count);

  const maxValue = Math.max(...finalValues, 1);

  const chartH = 200;
  const barW = 36;
  const gap = 18;
  const padX = 44;
  const padBottom = 36;
  const padTop = 28;
  const innerH =
    chartH - padBottom - padTop;

  const totalW =
    count > 0
      ? count * (barW + gap) -
        gap +
        padX * 2
      : 300;

  const gradId = `bar-${title.replace(
    /\W/g,
    "",
  )}`;

  if (count === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1a2e] p-6">
        <p className="text-sm font-semibold text-white">
          {title}
        </p>

        <div className="mt-6 flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10">
          <p className="text-xs text-white/40">
            No data available yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1a2e] p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">
          {title}
        </p>

        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
          6 months
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <svg
          width={Math.max(totalW, 300)}
          height={chartH}
          className="overflow-visible"
        >
          <defs>
            <linearGradient
              id={gradId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={color}
                stopOpacity="1"
              />
              <stop
                offset="100%"
                stopColor={color}
                stopOpacity="0.3"
              />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map(
            (ratio) => {
              const y =
                padTop +
                innerH * (1 - ratio);

              const value = Math.round(
                maxValue * ratio,
              );

              return (
                <g key={ratio}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={totalW - padX + 20}
                    y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth={1}
                  />

                  <text
                    x={padX - 6}
                    y={y + 4}
                    textAnchor="end"
                    fill="rgba(255,255,255,0.35)"
                    fontSize={10}
                  >
                    {prefix}
                    {value > 999
                      ? `${(
                          value / 1000
                        ).toFixed(1)}k`
                      : value}
                  </text>
                </g>
              );
            },
          )}

          {finalValues.map(
            (value, index) => {
              const x =
                padX +
                index * (barW + gap);

              const barH =
                innerH *
                (value / maxValue);

              const y =
                padTop +
                innerH -
                barH;

              return (
                <g
                  key={`${finalLabels[index]}-${index}`}
                >
                  <rect
                    x={x}
                    y={
                      mounted
                        ? y
                        : padTop + innerH
                    }
                    width={barW}
                    height={
                      mounted ? barH : 0
                    }
                    rx={6}
                    fill={`url(#${gradId})`}
                    style={{
                      transition:
                        "all 0.8s cubic-bezier(.22,.61,.36,1)",
                    }}
                  />

                  <text
                    x={x + barW / 2}
                    y={
                      mounted
                        ? y - 7
                        : padTop +
                          innerH -
                          7
                    }
                    textAnchor="middle"
                    fill="white"
                    fontSize={10}
                    fontWeight={600}
                  >
                    {prefix}
                    {value > 999
                      ? `${(
                          value / 1000
                        ).toFixed(1)}k`
                      : value}
                  </text>

                  <text
                    x={x + barW / 2}
                    y={chartH - 6}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.4)"
                    fontSize={10}
                  >
                    {finalLabels[index]}
                  </text>
                </g>
              );
            },
          )}
        </svg>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Animated line / area chart                                                 */
/* -------------------------------------------------------------------------- */

function LineChart({
  title,
  labels,
  values,
}: {
  title: string;
  labels: string[];
  values: number[];
}) {
  const [mounted, setMounted] =
    useState(false);

  const pathRef =
    useRef<SVGPathElement>(null);

  const [pathLen, setPathLen] =
    useState(1000);

  const safeLabels = Array.isArray(labels)
    ? labels
    : [];

  const safeValues = Array.isArray(values)
    ? values.map(safeNumber)
    : [];

  const count = Math.min(
    safeLabels.length,
    safeValues.length,
  );

  const finalLabels =
    safeLabels.slice(0, count);

  const finalValues =
    safeValues.slice(0, count);

  const maxValue = Math.max(
    ...finalValues,
    1,
  );

  const W = 460;
  const H = 200;
  const padX = 44;
  const padTop = 28;
  const padBottom = 36;

  const innerW = W - padX * 2;
  const innerH =
    H - padTop - padBottom;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);

      if (pathRef.current) {
        setPathLen(
          pathRef.current.getTotalLength(),
        );
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (count === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1a2e] p-6">
        <p className="text-sm font-semibold text-white">
          {title}
        </p>

        <div className="mt-6 flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10">
          <p className="text-xs text-white/40">
            No data available yet
          </p>
        </div>
      </div>
    );
  }

  const points = finalValues.map(
    (value, index) => ({
      x:
        padX +
        (index /
          Math.max(count - 1, 1)) *
          innerW,
      y:
        padTop +
        innerH *
          (1 - value / maxValue),
    }),
  );

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
    )
    .join(" ");

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${
      padTop + innerH
    } L ${points[0].x} ${
      padTop + innerH
    } Z`;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1a2e] p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">
          {title}
        </p>

        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
          Trend
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <svg
          width={W}
          height={H}
          className="overflow-visible"
        >
          <defs>
            <linearGradient
              id="line-area"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#10b981"
                stopOpacity="0.35"
              />

              <stop
                offset="100%"
                stopColor="#10b981"
                stopOpacity="0.01"
              />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map(
            (ratio) => {
              const y =
                padTop +
                innerH * (1 - ratio);

              return (
                <g key={ratio}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={W - padX}
                    y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth={1}
                  />

                  <text
                    x={padX - 6}
                    y={y + 4}
                    textAnchor="end"
                    fill="rgba(255,255,255,0.35)"
                    fontSize={10}
                  >
                    {Math.round(
                      maxValue * ratio,
                    )}
                  </text>
                </g>
              );
            },
          )}

          <path
            d={areaPath}
            fill="url(#line-area)"
          />

          <path
            ref={pathRef}
            d={linePath}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={pathLen}
            strokeDashoffset={
              mounted ? 0 : pathLen
            }
            style={{
              transition:
                "stroke-dashoffset 1.2s cubic-bezier(.22,.61,.36,1)",
            }}
          />

          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={4}
                fill="#10b981"
                stroke="#0d1a2e"
                strokeWidth={2}
                opacity={
                  mounted ? 1 : 0
                }
              />

              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fill="white"
                fontSize={10}
                fontWeight={600}
                opacity={
                  mounted ? 1 : 0
                }
              >
                {finalValues[index]}
              </text>

              <text
                x={point.x}
                y={H - 6}
                textAnchor="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize={10}
              >
                {finalLabels[index]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Donut chart                                                                */
/* -------------------------------------------------------------------------- */

const DONUT_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function DonutChart({
  data,
}: {
  data?: AdminChartData | null;
}) {
  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const items =
    normalizePlanDistribution(data);

  const total = items.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  if (items.length === 0 || total === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1a2e] p-6">
        <p className="text-sm font-semibold text-white">
          Plan distribution
        </p>

        <div className="mt-6 flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10">
          <p className="text-xs text-white/40">
            No plan data yet
          </p>
        </div>
      </div>
    );
  }

  const cx = 90;
  const cy = 90;
  const r = 64;
  const stroke = 28;

  const circumference =
    2 * Math.PI * r;

  const slices = items.map(
    (item, index) => {
      const percentage =
        item.count / total;

      const dash =
        percentage * circumference;

      const gap =
        circumference - dash;

      const previousPercentageSum = items
        .slice(0, index)
        .reduce((sum, prev) => sum + prev.count / total, 0);

      const rotation =
        previousPercentageSum * 360 - 90;

      return {
        ...item,
        dash,
        gap,
        rotation,
        color:
          DONUT_COLORS[
            index %
              DONUT_COLORS.length
          ],
        percentage,
      };
    },
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1a2e] p-6 shadow-xl">
      <p className="text-sm font-semibold text-white">
        Plan distribution
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-8">
        <div className="relative flex-shrink-0">
          <svg
            width={180}
            height={180}
          >
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={stroke}
            />

            {slices.map(
              (slice, index) => (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  strokeDasharray={`${mounted ? slice.dash : 0} ${
                    mounted
                      ? slice.gap
                      : circumference
                  }`}
                  strokeDashoffset={0}
                  transform={`rotate(${slice.rotation} ${cx} ${cy})`}
                  style={{
                    transition: `stroke-dasharray 0.9s ${index * 0.13}s cubic-bezier(.22,.61,.36,1)`,
                  }}
                />
              ),
            )}

            <text
              x={cx}
              y={cy - 8}
              textAnchor="middle"
              fill="white"
              fontSize={22}
              fontWeight={800}
            >
              {total}
            </text>

            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize={11}
            >
              total
            </text>
          </svg>
        </div>

        <div className="flex flex-col gap-3">
          {slices.map(
            (slice, index) => (
              <div
                key={index}
                className="flex items-center gap-3"
              >
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      slice.color,
                  }}
                />

                <span className="text-sm text-white/80">
                  {slice.label}
                </span>

                <span className="ml-auto pl-6 text-sm font-bold text-white">
                  {slice.count}
                </span>

                <span className="w-10 text-right text-xs text-white/40">
                  {(
                    slice.percentage * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main export                                                                */
/* -------------------------------------------------------------------------- */

export default function AdminCharts({
  data,
  visits = null,
}: AdminChartsProps) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1a2e] p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <svg
            className="h-6 w-6 animate-spin text-white/50"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />

            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <p className="mt-3 text-sm text-white/50">
          Loading dashboard data…
        </p>
      </div>
    );
  }

  const totalUsers =
    safeNumber(data.totalUsers);

  const activeUsers =
    safeNumber(data.activeUsers);

  const expiredUsers =
    safeNumber(data.expiredUsers);

  const totalRevenue =
    safeNumber(data.totalRevenue) / 100;

  const monthlyRevenue =
    normalizeMonthlyRevenue(data);

  const monthlyUsers =
    normalizeMonthlyUsers(data);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          configKey="users"
          label="Registered users"
          rawValue={totalUsers}
          description="Total Firebase customers"
        />

        <StatCard
          configKey="active"
          label="Active subscriptions"
          rawValue={activeUsers}
          description="Users with a live plan"
        />

        <StatCard
          configKey="expired"
          label="Expired plans"
          rawValue={expiredUsers}
          description="Subscriptions that lapsed"
        />

        <StatCard
          configKey="revenue"
          label="Captured revenue"
          rawValue={totalRevenue}
          isRevenue
          description="All-time Razorpay payments"
        />

        <StatCard
          configKey="visitors"
          label="Website visitors"
          rawValue={visits ? visits.total : 0}
          pending={visits === null}
          description={
            visits
              ? `${visits.today.toLocaleString("en-IN")} today · ${visits.yesterday.toLocaleString("en-IN")} yesterday`
              : "Loading…"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChart
          title="Captured payments — last 6 months"
          labels={monthlyRevenue.map(
            (item) => item.label,
          )}
          values={monthlyRevenue.map(
            (item) =>
              Math.round(
                item.amount / 100,
              ),
          )}
          color="#6366f1"
          prefix="₹"
        />

        <LineChart
          title="Registered users — last 6 months"
          labels={monthlyUsers.map(
            (item) => item.label,
          )}
          values={monthlyUsers.map(
            (item) => item.count,
          )}
        />
      </div>

      <DonutChart data={data} />
    </div>
  );
}