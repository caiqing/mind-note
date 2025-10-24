/**
 * 数据分析集成测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import {
  createMockAnalyticsData,
  createMockUserInsights,
} from '../../tests/utils/test-factories';
import { mockAnalyticsService } from '../../tests/utils/test-helpers';

// Mock analytics service
jest.mock('@/lib/services/analytics-service', () => ({
  analyticsService: mockAnalyticsService,
}));

describe('Analytics Integration', () => {
  const mockAnalyticsData = createMockAnalyticsData();
  const mockUserInsights = createMockUserInsights();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load and display analytics dashboard', async () => {
    mockAnalyticsService.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
    mockAnalyticsService.getUserInsights.mockResolvedValue(mockUserInsights);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/数据概览/i)).toBeInTheDocument();
      expect(screen.getByText(/总笔记数/i)).toBeInTheDocument();
      expect(
        screen.getByText(mockAnalyticsData.overview.totalNotes.toString()),
      ).toBeInTheDocument();
    });

    // 验证各个数据板块
    expect(screen.getByText(/发布笔记/i)).toBeInTheDocument();
    expect(screen.getByText(/总浏览量/i)).toBeInTheDocument();
    expect(screen.getByText(/AI处理率/i)).toBeInTheDocument();
    expect(screen.getByText(/用户洞察/i)).toBeInTheDocument();
  });

  it('should handle time range selection', async () => {
    const mock7dData = createMockAnalyticsData({ timeRange: '7d' });
    const mock30dData = createMockAnalyticsData({ timeRange: '30d' });

    mockAnalyticsService.getAnalyticsData
      .mockResolvedValueOnce(mock7dData)
      .mockResolvedValueOnce(mock30dData);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(mockAnalyticsService.getAnalyticsData).toHaveBeenCalledWith('30d'); // 默认30天
    });

    // 切换到7天
    const timeRangeSelect = screen.getByLabelText(/时间范围/i);
    await userEvent.click(timeRangeSelect);
    await userEvent.click(screen.getByText('最近7天'));

    await waitFor(() => {
      expect(mockAnalyticsService.getAnalyticsData).toHaveBeenLastCalledWith(
        '7d',
      );
    });
  });

  it('should display charts with correct data', async () => {
    mockAnalyticsService.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
    mockAnalyticsService.getUserInsights.mockResolvedValue(mockUserInsights);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/时间趋势/i)).toBeInTheDocument();
      expect(screen.getByText(/分类分布/i)).toBeInTheDocument();
      expect(screen.getByText(/标签分析/i)).toBeInTheDocument();
      expect(screen.getByText(/用户活动/i)).toBeInTheDocument();
    });

    // 验证图表容器是否存在
    expect(screen.getByTestId('time-series-chart')).toBeInTheDocument();
    expect(
      screen.getByTestId('category-distribution-chart'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('tag-analysis-chart')).toBeInTheDocument();
    expect(screen.getByTestId('user-activity-chart')).toBeInTheDocument();
  });

  it('should handle AI insights display', async () => {
    mockAnalyticsService.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
    mockAnalyticsService.getUserInsights.mockResolvedValue(mockUserInsights);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/AI洞察/i)).toBeInTheDocument();
    });

    // 验证情感分析
    const { sentimentAnalysis } = mockAnalyticsData.aiInsights;
    expect(screen.getByText(/情感分析/i)).toBeInTheDocument();
    expect(
      screen.getByText(`${Math.round(sentimentAnalysis.positive * 100)}%`),
    ).toBeInTheDocument();

    // 验证内容模式
    expect(screen.getByText(/内容模式/i)).toBeInTheDocument();
    mockAnalyticsData.aiInsights.contentPatterns.forEach((pattern, index) => {
      expect(screen.getByText(pattern.name)).toBeInTheDocument();
    });

    // 验证写作习惯
    expect(screen.getByText(/写作习惯/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        mockAnalyticsData.aiInsights.writingHabits.bestWritingTime,
      ),
    ).toBeInTheDocument();
  });

  it('should display user insights and recommendations', async () => {
    mockAnalyticsService.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
    mockAnalyticsService.getUserInsights.mockResolvedValue(mockUserInsights);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/用户洞察/i)).toBeInTheDocument();
    });

    // 验证分数显示
    expect(screen.getByText(/生产力得分/i)).toBeInTheDocument();
    expect(
      screen.getByText(mockUserInsights.productivityScore.toString()),
    ).toBeInTheDocument();

    expect(screen.getByText(/参与度得分/i)).toBeInTheDocument();
    expect(
      screen.getByText(mockUserInsights.engagementScore.toString()),
    ).toBeInTheDocument();

    expect(screen.getByText(/一致性得分/i)).toBeInTheDocument();
    expect(
      screen.getByText(mockUserInsights.consistencyScore.toString()),
    ).toBeInTheDocument();

    expect(screen.getByText(/成长得分/i)).toBeInTheDocument();
    expect(
      screen.getByText(mockUserInsights.growthScore.toString()),
    ).toBeInTheDocument();

    expect(screen.getByText(/综合得分/i)).toBeInTheDocument();
    expect(
      screen.getByText(mockUserInsights.overallScore.toString()),
    ).toBeInTheDocument();

    // 验证建议
    expect(screen.getByText(/个性化建议/i)).toBeInTheDocument();
    mockUserInsights.recommendations.forEach((recommendation, index) => {
      expect(screen.getByText(recommendation)).toBeInTheDocument();
    });
  });

  it('should handle data refresh', async () => {
    const refreshedData = createMockAnalyticsData({
      overview: {
        ...mockAnalyticsData.overview,
        totalNotes: mockAnalyticsData.overview.totalNotes + 5,
      },
    });

    mockAnalyticsService.getAnalyticsData
      .mockResolvedValueOnce(mockAnalyticsData)
      .mockResolvedValueOnce(refreshedData);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(
        screen.getByText(mockAnalyticsData.overview.totalNotes.toString()),
      ).toBeInTheDocument();
    });

    // 点击刷新按钮
    const refreshButton = screen.getByRole('button', { name: /刷新/i });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockAnalyticsService.getAnalyticsData).toHaveBeenCalledTimes(2);
      expect(
        screen.getByText(refreshedData.overview.totalNotes.toString()),
      ).toBeInTheDocument();
    });
  });

  it('should handle loading states', async () => {
    mockAnalyticsService.getAnalyticsData.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockAnalyticsData), 1000),
        ),
    );

    render(<AnalyticsDashboard />);

    expect(screen.getByText(/正在加载数据/i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.queryByText(/正在加载数据/i)).not.toBeInTheDocument();
        expect(screen.getByText(/数据概览/i)).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('should handle error states', async () => {
    mockAnalyticsService.getAnalyticsData.mockRejectedValue(
      new Error('数据加载失败'),
    );

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/数据加载失败/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
    });

    // 点击重试按钮
    const retryButton = screen.getByRole('button', { name: /重试/i });
    await userEvent.click(retryButton);

    expect(mockAnalyticsService.getAnalyticsData).toHaveBeenCalledTimes(2);
  });

  it('should handle chart interactions', async () => {
    mockAnalyticsService.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
    mockAnalyticsService.getUserInsights.mockResolvedValue(mockUserInsights);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('time-series-chart')).toBeInTheDocument();
    });

    // 模拟图表点击事件
    const timeSeriesChart = screen.getByTestId('time-series-chart');
    await fireEvent.click(timeSeriesChart);

    // 验证图表交互是否触发相应的数据更新
    await waitFor(() => {
      // 这里应该验证点击图表后的响应，比如显示详细信息等
      expect(screen.getByText(/详细信息/i)).toBeInTheDocument();
    });
  });

  it('should handle data export functionality', async () => {
    mockAnalyticsService.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
    mockAnalyticsService.getUserInsights.mockResolvedValue(mockUserInsights);

    // Mock download functionality
    const mockDownload = jest.fn();
    Object.defineProperty(window, 'download', {
      value: mockDownload,
      writable: true,
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/数据概览/i)).toBeInTheDocument();
    });

    // 点击导出按钮
    const exportButton = screen.getByRole('button', { name: /导出数据/i });
    await userEvent.click(exportButton);

    // 验证导出选项
    expect(screen.getByText('导出为CSV')).toBeInTheDocument();
    expect(screen.getByText('导出为JSON')).toBeInTheDocument();

    // 选择导出格式
    await userEvent.click(screen.getByText('导出为CSV'));

    // 验证导出调用
    expect(mockDownload).toHaveBeenCalled();
  });

  it('should handle responsive layout', async () => {
    mockAnalyticsService.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
    mockAnalyticsService.getUserInsights.mockResolvedValue(mockUserInsights);

    // Mock different screen sizes
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/数据概览/i)).toBeInTheDocument();
    });

    // 验证响应式布局
    const dashboard = screen.getByTestId('analytics-dashboard');
    expect(dashboard).toHaveClass('mobile-layout');
  });
});
