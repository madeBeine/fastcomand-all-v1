import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyMRU } from '@/utils/format';

interface ChartDataPoint {
  label: string;
  value: number;
  color: string;
  percentage?: number;
}

interface InvestmentChartProps {
  data: ChartDataPoint[];
  title: string;
  type?: 'bar' | 'pie' | 'line';
  height?: string;
  showPercentages?: boolean;
}

export const InvestmentChart: React.FC<InvestmentChartProps> = ({
  data,
  title,
  type = 'bar',
  height = 'h-64',
  showPercentages = false
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const safeMax = maxValue > 0 ? maxValue : 1; // prevent division by zero
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const safeTotal = total > 0 ? total : 1; // prevent division by zero

  const BarChart = () => (
    <div className={`${height} flex items-end gap-3 px-4 pb-4`}>
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div className="relative w-full">
            <div
              className={`w-full ${item.color} rounded-t-lg transition-all duration-500 hover:opacity-80 flex items-end justify-center text-white text-xs font-medium pb-2`}
              style={{
                height: `${maxValue > 0 ? (item.value / safeMax) * 80 : 0}%`,
                minHeight: '20px'
              }}
            >
              {item.value > 0 && formatCurrencyMRU(item.value)}
            </div>
          </div>
          <div className="text-xs text-center font-medium text-gray-600 dark:text-gray-400">
            {item.label}
          </div>
          {showPercentages && (
            <div className="text-xs text-gray-500">
              {total > 0 ? ((item.value / safeTotal) * 100).toFixed(1) : '0.0'}%
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const PieChart = () => {
    if (total === 0) {
      return (
        <div className={`${height} flex items-center justify-center`}>
          <div className="text-sm text-gray-500">لا توجد بيانات لعرض المخطط الدائري</div>
        </div>
      );
    }

    let currentAngle = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    return (
      <div className={`${height} flex items-center justify-center`} style={{height: '361px', marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 400}}>
        <div className="relative">
          <svg width="200" height="200" style={{display: 'block', fontWeight: 400, height: '200px', overflowClipMargin: 'content-box', overflowX: 'hidden', overflowY: 'hidden', width: '200px', transform: 'matrix(0, -1, 1, 0, 0, 0)'}}>
            {data.map((item, index) => {
              const percentage = (item.value / safeTotal) * 100;
              const angle = (percentage / 100) * 360;
              const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
              const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180);
              const x2 = centerX + radius * Math.cos(((currentAngle + angle) * Math.PI) / 180);
              const y2 = centerY + radius * Math.sin(((currentAngle + angle) * Math.PI) / 180);

              const largeArcFlag = angle > 180 ? 1 : 0;

              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');

              const fill = item.color.replace('bg-', '').includes('blue') ? '#3B82F6' :
                item.color.replace('bg-', '').includes('green') ? '#10B981' :
                item.color.replace('bg-', '').includes('purple') ? '#8B5CF6' :
                item.color.replace('bg-', '').includes('orange') ? '#F59E0B' :
                item.color.replace('bg-', '').includes('red') ? '#EF4444' : '#6B7280';

              const result = (
                <path
                  key={index}
                  d={pathData}
                  fill={fill}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  stroke="white"
                  strokeWidth="2"
                />
              );

              currentAngle += angle;
              return result;
            })}
          </svg>

          {/* Legend */}
          <div style={{fontWeight: 400, left: '50%', marginTop: '16px', position: 'absolute', top: '-138px', transform: 'matrix(1, 0, 0, 1, -89.9115, 0)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
            {data.map((item, index) => (
              <div key={index} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', lineHeight: '20px', justifyContent: 'flex-start'}}>
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                <span className="font-medium">{formatCurrencyMRU(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const LineChart = () => {
    const denom = data.length > 1 ? data.length - 1 : 1;

    const points = data.map((item, index) => {
      const x = data.length > 1 ? (index / denom) * 100 : 50;
      const y = 100 - (item.value / safeMax) * 80;
      // Ensure numeric values for SVG points
      const nx = Number.isFinite(x) ? x : 0;
      const ny = Number.isFinite(y) ? y : 100;
      return `${nx},${ny}`;
    }).join(' ');

    return (
      <div className={`${height} p-4`}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="border-b border-l border-gray-200 dark:border-gray-700">
          <polyline
            points={points}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          {data.map((item, index) => {
            const x = data.length > 1 ? (index / denom) * 100 : 50;
            const y = 100 - (item.value / safeMax) * 80;
            const cx = Number.isFinite(x) ? x : 50;
            const cy = Number.isFinite(y) ? y : 100;
            return (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r="3"
                fill="#3B82F6"
                className="hover:r-4 transition-all cursor-pointer"
              />
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {data.map((item, index) => (
            <div key={index} className="text-center">
              {item.label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'pie':
        return <PieChart />;
      case 'line':
        return <LineChart />;
      default:
        return <BarChart />;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default InvestmentChart;
