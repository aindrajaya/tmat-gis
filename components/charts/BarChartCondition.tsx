import React, { useMemo, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartConditionProps {
  data: any[];
  chartView: 'daily' | 'weekly';
}

const BarChartCondition = forwardRef<HTMLDivElement, BarChartConditionProps>(({ data, chartView }, ref) => {
  const { t } = useTranslation();

  // Convert counts to percentages
  const percentageData = useMemo(() => {
    return data.map(item => {
      const total = (item.safe || 0) + (item.low || 0) + (item.medium || 0) + (item.high || 0) + (item.veryhigh || 0) + (item.extreme || 0);
      if (total === 0) {
        return {
          ...item,
          safe: 0,
          low: 0,
          medium: 0,
          high: 0,
          veryhigh: 0,
          extreme: 0,
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
      };
    });
  }, [data]);

  const CustomTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-slate-700 mb-2">{payload[0].payload.date}</p>
          {payload.reverse().map((entry: any, index: number) => (
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
            angle={-90}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ dy: -5 }}
          />
          <YAxis fontSize={12} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="safe" stackId="a" fill="#703CA0" name="Tidak Beresiko" />
          <Bar dataKey="low" stackId="a" fill="#00B050" name="Rendah" />
          <Bar dataKey="medium" stackId="a" fill="#00B0F0" name="Sedang" />
          <Bar dataKey="high" stackId="a" fill="#FFFF00" name="Tinggi" />
          <Bar dataKey="veryhigh" stackId="a" fill="#FFC000" name="Sangat Tinggi" />
          <Bar dataKey="extreme" stackId="a" fill="#EE0000" name="Ekstrim" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

BarChartCondition.displayName = 'BarChartCondition';

export default BarChartCondition;
