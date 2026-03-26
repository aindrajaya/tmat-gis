import React, { useMemo, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartConditionProps {
  data: any[];
  chartView: 'daily' | 'weekly';
}

const BarChartCondition = forwardRef<HTMLDivElement, BarChartConditionProps>(({ data, chartView }, ref) => {
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
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Convert counts to percentages
  const percentageData = useMemo(() => {
    return data.map(item => {
      const total = (item.safe || 0) + (item.low || 0) + (item.medium || 0) + (item.high || 0) + (item.veryhigh || 0) + (item.extreme || 0) + (item.offline || 0);
      if (total === 0) {
        return {
          ...item,
          safe: 0,
          low: 0,
          medium: 0,
          high: 0,
          veryhigh: 0,
          extreme: 0,
          offline: 0,
        };
      }
      return {
        ...item,
        safe: Math.round((item.safe || 0) / total * 100),
        low: Math.round((item.low || 0) / total * 100),
        medium: Math.round((item.medium || 0) / total * 100),
        high: Math.round((item.high || 0) / total * 100),
        veryhigh: Math.round((item.veryhigh || 0) / total * 100),
        extreme: Math.round((item.extreme || 0) / total * 100),
        offline: Math.round((item.offline || 0) / total * 100),
      };
    });
  }, [data]);

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
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={ref} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-100">
      <h3 className="font-semibold text-slate-700 mb-4">
        {chartView === 'daily'
          ? t('dashboard:charts.dailyTmatCondition')
          : t('dashboard:charts.weeklyTmatCondition')}
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={percentageData}>
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
          <YAxis fontSize={12} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" align="center" content={<CustomLegend />} />
          <Bar dataKey="extreme" stackId="a" fill="#EE0000" name="Ekstrim" />
          <Bar dataKey="veryhigh" stackId="a" fill="#FFC000" name="Sangat Tinggi" />
          <Bar dataKey="high" stackId="a" fill="#F2D335" name="Tinggi" />
          <Bar dataKey="medium" stackId="a" fill="#00B0F0" name="Sedang" />
          <Bar dataKey="low" stackId="a" fill="#00B050" name="Rendah" />
          <Bar dataKey="safe" stackId="a" fill="#703CA0" name="Tidak Beresiko" />
          <Bar dataKey="offline" stackId="a" fill="#9CA3AF" name="Offline" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

BarChartCondition.displayName = 'BarChartCondition';

export default BarChartCondition;
