import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuthStore } from "../store/authStore";
import { useWorkspace } from "../hooks/useWorkspaces";
import { useAnalytics } from "../hooks/useAnalytics";
import { getMyRole, hasAtLeastRole } from "../lib/workspaceRole";
import { AppShell } from "../components/AppShell";

// Validated with the dataviz palette checker (light surface): lightness band, chroma
// floor, CVD separation (worst adjacent ΔE 23.2 deutan) and normal-vision floor all pass.
// The amber sits below 3:1 contrast, so every mark using it carries a visible label.
const STATUS_COLORS = {
  todo: "#f59e0b",
  in_progress: "#8b5cf6",
  done: "#059669",
} as const;

const LINE_COLOR = "#7c3aed";
const GRID_COLOR = "#e2e8f0";
const AXIS_TICK = { fill: "#64748b", fontSize: 12 };

const RANGES = [7, 30, 90];

const errorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

const formatDay = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
};

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div
        className={`mt-2 text-3xl font-semibold tracking-tight ${
          tone === "warning" && value > 0 ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  borderRadius: "0.75rem",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px -12px rgba(15,23,42,0.25)",
  fontSize: "0.8125rem",
};

export default function WorkspaceAnalytics() {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const user = useAuthStore((s) => s.user);
  const [days, setDays] = useState(30);

  const workspaceQuery = useWorkspace(workspaceId);
  const analyticsQuery = useAnalytics(workspaceId, days);

  const role = workspaceQuery.data ? getMyRole(workspaceQuery.data, user?.id) : null;
  const workspaceName = workspaceQuery.data?.name ?? "Workspace";

  // Server gates this too; bouncing early avoids rendering a page that will only 403.
  if (workspaceQuery.data && !hasAtLeastRole(role, "admin")) {
    return <Navigate to={`/app/workspaces/${workspaceId}`} replace />;
  }

  const data = analyticsQuery.data;
  const hasTasks = (data?.totals.total ?? 0) > 0;

  return (
    <AppShell
      title="Analytics"
      crumbs={[
        { label: "Workspaces", to: "/app" },
        { label: workspaceName, to: `/app/workspaces/${workspaceId}` },
        { label: "Analytics" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <label htmlFor="range" className="text-xs font-medium text-slate-500">
            Range
          </label>
          <select
            id="range"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          >
            {RANGES.map((value) => (
              <option key={value} value={value}>
                Last {value} days
              </option>
            ))}
          </select>
        </div>
      }
    >
      <>
        {analyticsQuery.isError && (
          <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage(analyticsQuery.error) ?? "Failed to load analytics"}
          </div>
        )}

        {analyticsQuery.isPending ? (
          <div className="grid gap-4">
            <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          </div>
        ) : !data ? null : !hasTasks ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-base font-semibold text-slate-900">Nothing to measure yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Create some tasks and the charts will fill in.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatTile label="Total" value={data.totals.total} />
              <StatTile label="To do" value={data.totals.todo} />
              <StatTile label="In progress" value={data.totals.in_progress} />
              <StatTile label="Done" value={data.totals.done} />
              <StatTile label="Overdue" value={data.totals.overdue} tone="warning" />
            </div>

            <ChartCard
              title="Completions"
              subtitle={`Tasks moved to Done, per day, last ${data.days} days (UTC)`}
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.completions} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={GRID_COLOR} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDay}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(value) => formatDay(String(value))}
                    formatter={(value) => [Number(value ?? 0), "Completed"] as [number, string]}
                    cursor={{ stroke: GRID_COLOR, strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={LINE_COLOR}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Tasks by project" subtitle="Split by status">
                <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
                  {(
                    [
                      ["To do", STATUS_COLORS.todo],
                      ["In progress", STATUS_COLORS.in_progress],
                      ["Done", STATUS_COLORS.done],
                    ] as const
                  ).map(([label, color]) => (
                    <span key={label} className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      {label}
                    </span>
                  ))}
                </div>

                <ResponsiveContainer width="100%" height={Math.max(160, data.byProject.length * 52)}>
                  <BarChart
                    data={data.byProject}
                    layout="vertical"
                    margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                    <Bar dataKey="todo" name="To do" stackId="s" fill={STATUS_COLORS.todo} stroke="#ffffff" strokeWidth={2} barSize={18} />
                    <Bar dataKey="in_progress" name="In progress" stackId="s" fill={STATUS_COLORS.in_progress} stroke="#ffffff" strokeWidth={2} barSize={18} />
                    <Bar
                      dataKey="done"
                      name="Done"
                      stackId="s"
                      fill={STATUS_COLORS.done}
                      stroke="#ffffff"
                      strokeWidth={2}
                      barSize={18}
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList
                        dataKey="total"
                        position="right"
                        offset={8}
                        style={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Throughput" subtitle="Completed tasks, attributed by assignee">
                {data.throughput.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No completed tasks yet.</p>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(160, data.throughput.length * 52)}
                  >
                    <BarChart
                      data={data.throughput}
                      layout="vertical"
                      margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={false}
                        width={110}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: "rgba(148,163,184,0.12)" }}
                        formatter={(value) => [Number(value ?? 0), "Completed"] as [number, string]}
                      />
                      <Bar
                        dataKey="completed"
                        name="Completed"
                        fill={STATUS_COLORS.done}
                        barSize={18}
                        radius={[0, 4, 4, 0]}
                      >
                        <LabelList
                          dataKey="completed"
                          position="right"
                          offset={8}
                          style={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </>
    </AppShell>
  );
}
