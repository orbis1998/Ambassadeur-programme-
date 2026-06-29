import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

const CHART_COLORS = ['hsl(352 84% 49%)', 'hsl(352 70% 60%)', 'hsl(0 0% 45%)', 'hsl(45 90% 55%)', 'hsl(160 60% 45%)'];

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`vsm-card p-5 animate-fade-up ${className}`}>
      <h3 className="font-display text-lg font-bold mb-4">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

function fmtDate(label) {
  if (!label) return '';
  const d = new Date(label);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function AdminAreaChart({ title, data, dataKey = 'value' }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
              <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
          <XAxis dataKey="date" tickFormatter={fmtDate} stroke="hsl(0 0% 45%)" fontSize={11} />
          <YAxis stroke="hsl(0 0% 45%)" fontSize={11} />
          <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid hsl(0 0% 20%)' }} labelFormatter={fmtDate} />
          <Area type="monotone" dataKey={dataKey} stroke={CHART_COLORS[0]} fill="url(#adminGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AdminMultiLineChart({ title, data, lines }) {
  return (
    <ChartCard title={title} className="lg:col-span-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
          <XAxis dataKey="date" tickFormatter={fmtDate} stroke="hsl(0 0% 45%)" fontSize={11} />
          <YAxis stroke="hsl(0 0% 45%)" fontSize={11} />
          <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid hsl(0 0% 20%)' }} labelFormatter={fmtDate} />
          <Legend />
          {(lines || []).map((l, i) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function AdminBarChart({ title, data, dataKey = 'value', nameKey = 'name' }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
          <XAxis type="number" stroke="hsl(0 0% 45%)" fontSize={11} />
          <YAxis type="category" dataKey={nameKey} width={100} stroke="hsl(0 0% 45%)" fontSize={10} />
          <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid hsl(0 0% 20%)' }} />
          <Bar dataKey={dataKey} fill={CHART_COLORS[0]} radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function mergeTimeSeries(seriesList) {
  const map = {};
  (seriesList || []).forEach(({ key, data }) => {
    (data || []).forEach(({ date, value }) => {
      if (!map[date]) map[date] = { date };
      map[date][key] = value;
    });
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}
