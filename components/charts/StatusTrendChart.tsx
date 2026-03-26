import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatusTrendChartProps {
  data: any[];
  chartView: 'daily' | 'weekly';
}

const StatusTrendChart = forwardRef<HTMLDivElement, StatusTrendChartProps>(({ data, chartView }, ref) => {
  const { t } = useTranslation();
  const statusOrder: Record<string, number> = {
    extreme: 0,
    veryhigh: 1,
    high: 2,
    medium: 3,
    low: 4,
    safe: 5,
    offline: 6,
  };
  const CustomLegend = ({ payload }: any) => {
    if (!payload?.length) return null;
    const sortedPayload = [...payload].sort(
      (a: any, b: any) => (statusOrder[a.dataKey] ?? 999) - (statusOrder[b.dataKey] ?? 999)
    );

    return (
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-4 text-xs text-slate-700">
        {sortedPayload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const CustomTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const sortedPayload = [...payload].sort(
        (a: any, b: any) => (statusOrder[a.dataKey] ?? 999) - (statusOrder[b.dataKey] ?? 999)
      );
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-slate-700 mb-2">{payload[0].payload.date}</p>
          {sortedPayload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={ref} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-100">
      <h3 className="font-semibold text-slate-700 mb-4">{t('dashboard:charts.statusTrend')}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            fontSize={10}
            angle={chartView === 'weekly' ? 0 : -90}
            textAnchor={chartView === 'weekly' ? 'middle' : 'end'}
            height={chartView === 'weekly' ? 40 : 80}
            interval={0}
            tick={chartView === 'weekly' ? undefined : { dy: -5 }}
          />
          <YAxis fontSize={12} />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" align="center" content={<CustomLegend />} />
          <Line type="monotone" dataKey="extreme" stroke="#EE0000" strokeWidth={2} dot={false} name="Ekstrim" />
          <Line type="monotone" dataKey="veryhigh" stroke="#FFC000" strokeWidth={2} dot={false} name="Sangat Tinggi" />
          <Line type="monotone" dataKey="high" stroke="#F2D335" strokeWidth={2} dot={false} name="Tinggi" />
          <Line type="monotone" dataKey="medium" stroke="#00B0F0" strokeWidth={2} dot={false} name="Sedang" />
          <Line type="monotone" dataKey="low" stroke="#00B050" strokeWidth={2} dot={false} name="Rendah" />
          <Line type="monotone" dataKey="safe" stroke="#703CA0" strokeWidth={2} dot={false} name="Tidak Beresiko" />
          <Line type="monotone" dataKey="offline" stroke="#9CA3AF" strokeWidth={2} dot={false} name="Offline" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

StatusTrendChart.displayName = 'StatusTrendChart';

export default StatusTrendChart;
