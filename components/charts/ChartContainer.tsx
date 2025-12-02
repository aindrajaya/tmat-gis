import React from 'react';
import { useTranslation } from 'react-i18next';
import BarChartCondition from './BarChartCondition';
import StatusTrendChart from './StatusTrendChart';
import TMATTrendChart from './TMATTrendChart';

interface ChartContainerProps {
  chartView: 'daily' | 'weekly';
  setChartView: (view: 'daily' | 'weekly') => void;
  dailyData: any[];
  weeklyData: any[];
  trendData: any[];
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  chartView,
  setChartView,
  dailyData,
  weeklyData,
  trendData,
}) => {
  const { t } = useTranslation();
  const chartData = chartView === 'daily' ? dailyData : weeklyData;

  return (
    <section className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-bold text-slate-800">{t('dashboard:charts.analyticsTitle')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setChartView('daily')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              chartView === 'daily'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('dashboard:charts.daily')}
          </button>
          <button
            onClick={() => setChartView('weekly')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              chartView === 'weekly'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('dashboard:charts.weekly')}
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCondition data={chartData} chartView={chartView} />
        <StatusTrendChart data={chartData} />
      </div>

      {/* TMAT Trend Chart */}
      <TMATTrendChart data={trendData} />
    </section>
  );
};

export default ChartContainer;
