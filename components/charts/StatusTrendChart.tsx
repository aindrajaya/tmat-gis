import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatusTrendChartProps {
  data: any[];
}

const StatusTrendChart = forwardRef<HTMLDivElement, StatusTrendChartProps>(({ data }, ref) => {
  const { t } = useTranslation();

  const CustomTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-slate-700 mb-2">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
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
            angle={-90}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ dy: -5 }}
          />
          <YAxis fontSize={12} />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="safe" stroke="#703CA0" strokeWidth={2} dot={false} name="Tidak Beresiko" />
          <Line type="monotone" dataKey="low" stroke="#00B050" strokeWidth={2} dot={false} name="Rendah" />
          <Line type="monotone" dataKey="medium" stroke="#00B0F0" strokeWidth={2} dot={false} name="Sedang" />
          <Line type="monotone" dataKey="high" stroke="#FFFF00" strokeWidth={2} dot={false} name="Tinggi" />
          <Line type="monotone" dataKey="veryhigh" stroke="#FFC000" strokeWidth={2} dot={false} name="Sangat Tinggi" />
          <Line type="monotone" dataKey="extreme" stroke="#EE0000" strokeWidth={2} dot={false} name="Ekstrim" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

StatusTrendChart.displayName = 'StatusTrendChart';

export default StatusTrendChart;
