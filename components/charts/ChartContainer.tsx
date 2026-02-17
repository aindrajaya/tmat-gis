import React, { useState, useRef, useEffect, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText, Image, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import BarChartCondition from './BarChartCondition';
import StatusTrendChart from './StatusTrendChart';
import TMATTrendChart from './TMATTrendChart';

interface ChartContainerProps {
  chartView: 'daily' | 'weekly';
  setChartView: (view: 'daily' | 'weekly') => void;
  dailyData: any[];
  weeklyData: any[];
  trendData: any[];
  mapRef?: RefObject<HTMLDivElement | null>;
  barChartRef?: RefObject<HTMLDivElement | null>;
  statusTrendRef?: RefObject<HTMLDivElement | null>;
  tmatTrendRef?: RefObject<HTMLDivElement | null>;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  chartView,
  setChartView,
  dailyData,
  weeklyData,
  trendData,
  mapRef,
  barChartRef,
  statusTrendRef,
  tmatTrendRef,
}) => {
  const { t } = useTranslation();
  const chartData = chartView === 'daily' ? dailyData : weeklyData;
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Internal refs for charts if not passed from parent
  const internalBarChartRef = useRef<HTMLDivElement>(null);
  const internalStatusTrendRef = useRef<HTMLDivElement>(null);
  const internalTmatTrendRef = useRef<HTMLDivElement>(null);

  // Use passed refs or internal refs
  const effectiveBarChartRef = barChartRef || internalBarChartRef;
  const effectiveStatusTrendRef = statusTrendRef || internalStatusTrendRef;
  const effectiveTmatTrendRef = tmatTrendRef || internalTmatTrendRef;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Function to convert data to CSV and trigger download
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    // Define headers based on the data structure
    const headers = ['Date', 'Safe', 'Low', 'Medium', 'High', 'Very High', 'Extreme'];

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.date,
        row.safe || 0,
        row.low || 0,
        row.medium || 0,
        row.high || 0,
        row.veryhigh || 0,
        row.extreme || 0
      ].join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const handleDownloadDaily = () => {
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(dailyData, `tmat-analytics-daily-${date}.csv`);
  };

  const handleDownloadWeekly = () => {
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(weeklyData, `tmat-analytics-weekly-${date}.csv`);
  };

  // Function to download PDF in landscape format with table
  const downloadPDF = (data: any[], type: 'daily' | 'weekly') => {
    if (data.length === 0) return;

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const date = new Date().toISOString().split('T')[0];
    const title = type === 'daily'
      ? t('dashboard:charts.dailyTmatCondition')
      : t('dashboard:charts.weeklyTmatCondition');

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`TMAT Analytics - ${title}`, 14, 20);

    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Prepare table data
    const headers = [['Date', 'Safe', 'Low', 'Medium', 'High', 'Very High', 'Extreme', 'Total']];
    const tableData = data.map(row => {
      const total = (row.safe || 0) + (row.low || 0) + (row.medium || 0) +
                    (row.high || 0) + (row.veryhigh || 0) + (row.extreme || 0);
      return [
        row.date,
        row.safe || 0,
        row.low || 0,
        row.medium || 0,
        row.high || 0,
        row.veryhigh || 0,
        row.extreme || 0,
        total
      ];
    });

    // Add totals row
    const totals = data.reduce((acc, row) => ({
      safe: acc.safe + (row.safe || 0),
      low: acc.low + (row.low || 0),
      medium: acc.medium + (row.medium || 0),
      high: acc.high + (row.high || 0),
      veryhigh: acc.veryhigh + (row.veryhigh || 0),
      extreme: acc.extreme + (row.extreme || 0),
    }), { safe: 0, low: 0, medium: 0, high: 0, veryhigh: 0, extreme: 0 });

    const grandTotal = totals.safe + totals.low + totals.medium + totals.high + totals.veryhigh + totals.extreme;
    tableData.push(['TOTAL', totals.safe, totals.low, totals.medium, totals.high, totals.veryhigh, totals.extreme, grandTotal]);

    // Generate table with colors
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // blue-500
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 50 },
        1: { fillColor: [112, 60, 160] }, // Safe - purple
        2: { fillColor: [0, 176, 80] },   // Low - green
        3: { fillColor: [0, 176, 240] },  // Medium - light blue
        4: { fillColor: [255, 255, 0], textColor: [0, 0, 0] },  // High - yellow
        5: { fillColor: [255, 192, 0], textColor: [0, 0, 0] },  // Very High - orange
        6: { fillColor: [238, 0, 0] },    // Extreme - red
        7: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' } // Total
      },
      didParseCell: (data) => {
        // Make last row bold (totals)
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 0) {
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }
      }
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Page ${i} of ${pageCount} | TMAT Monitoring Dashboard`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`tmat-analytics-${type}-${date}.pdf`);
    setShowDownloadMenu(false);
  };

  // Function to download Excel file
  const downloadExcel = (data: any[], type: 'daily' | 'weekly') => {
    if (data.length === 0) return;

    const date = new Date().toISOString().split('T')[0];

    // Prepare data with headers
    const excelData = data.map(row => {
      const total = (row.safe || 0) + (row.low || 0) + (row.medium || 0) +
                    (row.high || 0) + (row.veryhigh || 0) + (row.extreme || 0);
      return {
        'Date': row.date,
        'Safe (>= 0m)': row.safe || 0,
        'Low (-0.2m to 0m)': row.low || 0,
        'Medium (-0.4m to -0.2m)': row.medium || 0,
        'High (-0.5m to -0.4m)': row.high || 0,
        'Very High (-0.6m to -0.5m)': row.veryhigh || 0,
        'Extreme (< -0.6m)': row.extreme || 0,
        'Total': total
      };
    });

    // Add totals row
    const totals = data.reduce((acc, row) => ({
      safe: acc.safe + (row.safe || 0),
      low: acc.low + (row.low || 0),
      medium: acc.medium + (row.medium || 0),
      high: acc.high + (row.high || 0),
      veryhigh: acc.veryhigh + (row.veryhigh || 0),
      extreme: acc.extreme + (row.extreme || 0),
    }), { safe: 0, low: 0, medium: 0, high: 0, veryhigh: 0, extreme: 0 });

    const grandTotal = totals.safe + totals.low + totals.medium + totals.high + totals.veryhigh + totals.extreme;
    excelData.push({
      'Date': 'TOTAL',
      'Safe (>= 0m)': totals.safe,
      'Low (-0.2m to 0m)': totals.low,
      'Medium (-0.4m to -0.2m)': totals.medium,
      'High (-0.5m to -0.4m)': totals.high,
      'Very High (-0.6m to -0.5m)': totals.veryhigh,
      'Extreme (< -0.6m)': totals.extreme,
      'Total': grandTotal
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Date
      { wch: 15 }, // Safe
      { wch: 18 }, // Low
      { wch: 22 }, // Medium
      { wch: 20 }, // High
      { wch: 24 }, // Very High
      { wch: 18 }, // Extreme
      { wch: 10 }, // Total
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, type === 'daily' ? 'Daily Data' : 'Weekly Data');

    // Save file
    XLSX.writeFile(workbook, `tmat-analytics-${type}-${date}.xlsx`);
    setShowDownloadMenu(false);
  };

  const handleDownloadDailyPDF = () => downloadPDF(dailyData, 'daily');
  const handleDownloadWeeklyPDF = () => downloadPDF(weeklyData, 'weekly');
  const handleDownloadDailyExcel = () => downloadExcel(dailyData, 'daily');
  const handleDownloadWeeklyExcel = () => downloadExcel(weeklyData, 'weekly');

  // Function to capture element as image
  const captureElement = async (element: HTMLElement | null): Promise<string | null> => {
    if (!element) return null;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing element:', error);
      return null;
    }
  };

  // Function to capture map with exact aspect ratio and dimensions
  const captureMapElement = async (element: HTMLElement | null): Promise<{ dataUrl: string; width: number; height: number } | null> => {
    if (!element) return null;
    try {
      // Add slight delay to ensure map is fully rendered
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.offsetWidth,
        windowHeight: element.offsetHeight,
      });
      
      return {
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height
      };
    } catch (error) {
      console.error('Error capturing map element:', error);
      return null;
    }
  };

  // Function to download PDF with graphics (map + charts + table)
  // Page 1: Map only, Page 2: Charts only, Page 3: Data Table
  const downloadPDFWithGraphics = async (data: any[], type: 'daily' | 'weekly') => {
    if (data.length === 0) return;

    setIsExporting(true);
    setShowDownloadMenu(false);

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const date = new Date().toISOString().split('T')[0];
      const title = type === 'daily'
        ? t('dashboard:charts.dailyTmatCondition')
        : t('dashboard:charts.weeklyTmatCondition');

      // ===== PAGE 1: Map Only =====
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(`TMAT Analytics Report - ${title}`, margin, 15);

      // Add generation date
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 22);

      // Add section title
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Station Distribution Map', margin, 32);

      // Capture and add map image (full width, height follows exact aspect ratio)
      if (mapRef?.current) {
        const mapImage = await captureMapElement(mapRef.current);
        if (mapImage) {
          // Use full available width
          const mapWidth = pageWidth - (margin * 2);
          
          // Calculate height from exact aspect ratio of captured image
          const aspectRatio = mapImage.width / mapImage.height;
          const mapHeight = mapWidth / aspectRatio;
          
          doc.addImage(mapImage.dataUrl, 'PNG', margin, 38, mapWidth, mapHeight);
        }
      }

      // ===== PAGE 2: Charts Only =====
      doc.addPage();

      // Add title for charts page
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`Analytics Charts - ${title}`, margin, 15);

      // Capture charts
      const barChartImage = await captureElement(effectiveBarChartRef.current);
      const statusTrendImage = await captureElement(effectiveStatusTrendRef.current);
      const tmatTrendImage = await captureElement(effectiveTmatTrendRef.current);

      // Add bar chart and status trend side by side (larger on dedicated page)
      const chartWidth = (pageWidth - (margin * 3)) / 2;
      const chartHeight = 75;
      let currentY = 22;

      if (barChartImage) {
        doc.addImage(barChartImage, 'PNG', margin, currentY, chartWidth, chartHeight);
      }
      if (statusTrendImage) {
        doc.addImage(statusTrendImage, 'PNG', margin + chartWidth + margin, currentY, chartWidth, chartHeight);
      }
      currentY += chartHeight + 8;

      // Add TMAT trend chart (full width)
      if (tmatTrendImage) {
        const trendWidth = pageWidth - (margin * 2);
        const trendHeight = 70;
        doc.addImage(tmatTrendImage, 'PNG', margin, currentY, trendWidth, trendHeight);
      }

      // ===== PAGE 3: Data Table =====
      doc.addPage();

      // Add title for data page
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(`Detailed Data - ${title}`, margin, 15);

      // Prepare table data
      const headers = [['Date', 'Safe', 'Low', 'Medium', 'High', 'Very High', 'Extreme', 'Total']];
      const tableData = data.map(row => {
        const total = (row.safe || 0) + (row.low || 0) + (row.medium || 0) +
                      (row.high || 0) + (row.veryhigh || 0) + (row.extreme || 0);
        return [
          row.date,
          row.safe || 0,
          row.low || 0,
          row.medium || 0,
          row.high || 0,
          row.veryhigh || 0,
          row.extreme || 0,
          total
        ];
      });

      // Add totals row
      const totals = data.reduce((acc, row) => ({
        safe: acc.safe + (row.safe || 0),
        low: acc.low + (row.low || 0),
        medium: acc.medium + (row.medium || 0),
        high: acc.high + (row.high || 0),
        veryhigh: acc.veryhigh + (row.veryhigh || 0),
        extreme: acc.extreme + (row.extreme || 0),
      }), { safe: 0, low: 0, medium: 0, high: 0, veryhigh: 0, extreme: 0 });

      const grandTotal = totals.safe + totals.low + totals.medium + totals.high + totals.veryhigh + totals.extreme;
      tableData.push(['TOTAL', totals.safe, totals.low, totals.medium, totals.high, totals.veryhigh, totals.extreme, grandTotal]);

      // Generate table with colors
      autoTable(doc, {
        head: headers,
        body: tableData,
        startY: 22,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 50 },
          1: { fillColor: [112, 60, 160] },
          2: { fillColor: [0, 176, 80] },
          3: { fillColor: [0, 176, 240] },
          4: { fillColor: [255, 255, 0], textColor: [0, 0, 0] },
          5: { fillColor: [255, 192, 0], textColor: [0, 0, 0] },
          6: { fillColor: [238, 0, 0] },
          7: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' }
        },
        didParseCell: (cellData) => {
          if (cellData.row.index === tableData.length - 1) {
            cellData.cell.styles.fontStyle = 'bold';
            if (cellData.column.index === 0) {
              cellData.cell.styles.fillColor = [241, 245, 249];
            }
          }
        }
      });

      // Add footer to all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${i} of ${pageCount} | TMAT Monitoring Dashboard`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      doc.save(`tmat-analytics-${type}-with-graphics-${date}.pdf`);
    } catch (error) {
      console.error('Error generating PDF with graphics:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDailyPDFWithGraphics = () => downloadPDFWithGraphics(dailyData, 'daily');
  const handleDownloadWeeklyPDFWithGraphics = () => downloadPDFWithGraphics(weeklyData, 'weekly');

  return (
    <section className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-bold text-slate-800">{t('dashboard:charts.analyticsTitle')}</h2>
        <div className="flex gap-2 items-center">
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

          {/* Download Button with Dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg font-medium transition bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-400 flex items-center gap-2"
              title={t('dashboard:charts.downloadData')}
            >
              {isExporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('dashboard:charts.exporting')}
                </>
              ) : (
                <>
                  <Download size={18} />
                  {t('dashboard:charts.download')}
                </>
              )}
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 max-h-96 overflow-y-auto">
                {/* Daily Section */}
                <div className="px-3 py-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {t('dashboard:charts.daily')}
                  </p>
                </div>
                <button
                  onClick={handleDownloadDailyPDFWithGraphics}
                  disabled={dailyData.length === 0 || isExporting}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Image size={16} className="text-purple-500" />
                  {t('dashboard:charts.downloadDailyPDFGraphics')}
                </button>
                <button
                  onClick={handleDownloadDailyPDF}
                  disabled={dailyData.length === 0}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileText size={16} className="text-red-500" />
                  {t('dashboard:charts.downloadDailyPDF')}
                </button>
                <button
                  onClick={handleDownloadDailyExcel}
                  disabled={dailyData.length === 0}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileSpreadsheet size={16} className="text-green-600" />
                  {t('dashboard:charts.downloadDailyExcel')}
                </button>

                <div className="border-t border-slate-200 my-2"></div>

                {/* Weekly Section */}
                <div className="px-3 py-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {t('dashboard:charts.weekly')}
                  </p>
                </div>
                <button
                  onClick={handleDownloadWeeklyPDFWithGraphics}
                  disabled={weeklyData.length === 0 || isExporting}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Image size={16} className="text-purple-500" />
                  {t('dashboard:charts.downloadWeeklyPDFGraphics')}
                </button>
                <button
                  onClick={handleDownloadWeeklyPDF}
                  disabled={weeklyData.length === 0}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileText size={16} className="text-red-500" />
                  {t('dashboard:charts.downloadWeeklyPDF')}
                </button>
                <button
                  onClick={handleDownloadWeeklyExcel}
                  disabled={weeklyData.length === 0}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileSpreadsheet size={16} className="text-green-600" />
                  {t('dashboard:charts.downloadWeeklyExcel')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCondition ref={effectiveBarChartRef} data={chartData} chartView={chartView} />
        <StatusTrendChart ref={effectiveStatusTrendRef} data={chartData} chartView={chartView} />
      </div>

      {/* TMAT Trend Chart */}
      {/* <TMATTrendChart ref={effectiveTmatTrendRef} data={trendData} /> */}
    </section>
  );
};

export default ChartContainer;
