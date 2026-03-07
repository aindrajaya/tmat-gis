import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface TMATTrendChartProps {
  data: any[];
}

const TMATTrendChart = forwardRef<HTMLDivElement, TMATTrendChartProps>(({ data }, ref) => {
  const { t } = useTranslation();

  return (
    <div ref={ref} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-80">
      <h3 className="font-semibold text-slate-700 mb-4">{t('dashboard:charts.tmatTrend')}</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" fontSize={12} />
          <YAxis fontSize={12} />
          <RechartsTooltip />
          <Line type="monotone" dataKey="tmat" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

TMATTrendChart.displayName = 'TMATTrendChart';

export default TMATTrendChart;
