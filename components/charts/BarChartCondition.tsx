import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartConditionProps {
  data: any[];
  chartView: 'daily' | 'weekly';
}

const BarChartCondition: React.FC<BarChartConditionProps> = ({ data, chartView }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-80">
      <h3 className="font-semibold text-slate-700 mb-4">
        {chartView === 'daily' 
          ? t('dashboard:charts.dailyTmatCondition')
          : t('dashboard:charts.weeklyTmatCondition')}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} />
          <RechartsTooltip />
          <Legend />
          <Bar dataKey="safe" stackId="a" fill="#10b981" name={t('dashboard:charts.safe')} />
          <Bar dataKey="warning" stackId="a" fill="#f59e0b" name={t('dashboard:charts.warning')} />
          <Bar dataKey="danger" stackId="a" fill="#ef4444" name={t('dashboard:charts.danger')} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartCondition;
