/**
 * 基础图表组件
 *
 * 为各种图表提供统一的基础功能
 */

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BaseChartProps {
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function BaseChart({
  title,
  description,
  isLoading,
  error,
  children,
  className,
  actions,
}: BaseChartProps) {
  if (error) {
    return (
      <Card className={className}>
        <CardContent className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <div className='text-red-500 mb-2'>❌</div>
            <p className='text-sm text-red-600'>加载图表失败</p>
            <p className='text-xs text-muted-foreground mt-1'>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(title || actions) && (
        <CardHeader className='pb-2'>
          <div className='flex items-center justify-between'>
            {title && (
              <div>
                <CardTitle className='text-base'>{title}</CardTitle>
                {description && (
                  <p className='text-sm text-muted-foreground mt-1'>
                    {description}
                  </p>
                )}
              </div>
            )}
            {actions && <div>{actions}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent>
        {isLoading ? <Skeleton className='h-64 w-full' /> : children}
      </CardContent>
    </Card>
  );
}

/**
 * 简单的条形图组件
 */
interface SimpleBarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  orientation?: 'horizontal' | 'vertical';
  showValues?: boolean;
  maxBars?: number;
  className?: string;
}

export function SimpleBarChart({
  data,
  orientation = 'horizontal',
  showValues = true,
  maxBars = 10,
  className,
}: SimpleBarChartProps) {
  const displayData = data.slice(0, maxBars);
  const maxValue = Math.max(...displayData.map(d => d.value));

  if (orientation === 'horizontal') {
    return (
      <div className={`space-y-2 ${className}`}>
        {displayData.map((item, index) => (
          <div key={index} className='flex items-center space-x-3'>
            <div className='flex-shrink-0 w-20 text-sm text-right truncate'>
              {item.label}
            </div>
            <div className='flex-1 relative'>
              <div
                className='h-6 rounded-md transition-all duration-500'
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || '#3B82F6',
                }}
              />
              {showValues && (
                <span className='absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-medium text-white'>
                  {item.value}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-end space-x-2 h-32 ${className}`}>
      {displayData.map((item, index) => (
        <div key={index} className='flex-1 flex flex-col items-center'>
          <div className='relative w-full flex justify-center'>
            <div
              className='w-full rounded-t-md transition-all duration-500'
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || '#3B82F6',
              }}
            />
            {showValues && (
              <span className='absolute -top-6 text-xs font-medium'>
                {item.value}
              </span>
            )}
          </div>
          <div className='text-xs text-center mt-1 truncate w-full'>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 简单的折线图组件
 */
interface SimpleLineChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  color?: string;
  showPoints?: boolean;
  showGrid?: boolean;
  height?: number;
  className?: string;
}

export function SimpleLineChart({
  data,
  color = '#3B82F6',
  showPoints = true,
  showGrid = true,
  height = 200,
  className,
}: SimpleLineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data
    .map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = ((maxValue - item.value) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const pointElements = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((maxValue - item.value) / range) * 100;
    return (
      <circle
        key={index}
        cx={`${x}%`}
        cy={`${y}%`}
        r='4'
        fill={color}
        className='hover:r-6 transition-all cursor-pointer'
      />
    );
  });

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {showGrid && (
        <svg className='absolute inset-0 w-full h-full'>
          {/* 水平网格线 */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1='0'
              y1={`${y}%`}
              x2='100%'
              y2={`${y}%`}
              stroke='#E5E7EB'
              strokeWidth='1'
            />
          ))}
          {/* 垂直网格线 */}
          {[0, 25, 50, 75, 100].map(x => (
            <line
              key={x}
              x1={`${x}%`}
              y1='0'
              x2={`${x}%`}
              y2='100%'
              stroke='#E5E7EB'
              strokeWidth='1'
            />
          ))}
        </svg>
      )}

      <svg className='absolute inset-0 w-full h-full'>
        <polyline
          points={points}
          fill='none'
          stroke={color}
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        {showPoints && pointElements}
      </svg>

      {/* X轴标签 */}
      <div className='absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2'>
        {data.map((item, index) => (
          <div key={index} className='text-center'>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 简单的饼图组件
 */
interface SimplePieChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  showLabels?: boolean;
  showLegend?: boolean;
  size?: number;
  className?: string;
}

export function SimplePieChart({
  data,
  showLabels = true,
  showLegend = true,
  size = 200,
  className,
}: SimplePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const segments = data.map(item => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    currentAngle += angle;

    const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
    const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
    const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
    const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;

    return {
      ...item,
      percentage,
      path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
    };
  });

  return (
    <div className={`flex items-center space-x-6 ${className}`}>
      {/* 饼图 */}
      <div className='relative' style={{ width: size, height: size }}>
        <svg viewBox='0 0 100 100' className='w-full h-full'>
          {segments.map((segment, index) => (
            <g key={index}>
              <path
                d={segment.path}
                fill={segment.color}
                className='hover:opacity-80 transition-opacity cursor-pointer'
              />
              {showLabels && segment.percentage > 5 && (
                <text
                  x='50'
                  y='50'
                  textAnchor='middle'
                  dominantBaseline='middle'
                  className='text-xs font-medium fill-white pointer-events-none'
                >
                  {segment.percentage.toFixed(1)}%
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* 图例 */}
      {showLegend && (
        <div className='space-y-2'>
          {segments.map((segment, index) => (
            <div key={index} className='flex items-center space-x-2'>
              <div
                className='w-3 h-3 rounded'
                style={{ backgroundColor: segment.color }}
              />
              <span className='text-sm'>{segment.label}</span>
              <span className='text-xs text-muted-foreground'>
                ({segment.value})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
