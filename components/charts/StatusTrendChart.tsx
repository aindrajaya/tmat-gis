import React from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatusTrendChartProps {
  data: any[];
}

const StatusTrendChart: React.FC<StatusTrendChartProps> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-80">
      <h3 className="font-semibold text-slate-700 mb-4">{t('dashboard:charts.statusTrend')}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} />
          <RechartsTooltip />
          <Legend />
          <Line type="monotone" dataKey="safe" stroke="#10b981" strokeWidth={2} dot={false} name={t('dashboard:charts.safe')} />
          <Line type="monotone" dataKey="warning" stroke="#f59e0b" strokeWidth={2} dot={false} name={t('dashboard:charts.warning')} />
          <Line type="monotone" dataKey="danger" stroke="#ef4444" strokeWidth={2} dot={false} name={t('dashboard:charts.danger')} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatusTrendChart;
