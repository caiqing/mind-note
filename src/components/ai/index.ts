/**
 * AI组件索引文件
 *
 * 导出所有AI相关的UI组件
 */

// AI分析仪表板
export { AIAnalysisDashboard } from './ai-analysis-dashboard';
export type { AIAnalysisDashboardProps } from './ai-analysis-dashboard';

// AI摘要卡片
export { AISummaryCard } from './ai-summary-card';
export type { AISummaryCardProps } from './ai-summary-card';

// 智能标签管理器
export { SmartTagManager } from './smart-tag-manager';
export type { SmartTagManagerProps, SmartTag } from './smart-tag-manager';

// 相关笔记推荐
export { RelatedNotesRecommendation } from './related-notes-recommendation';
export type { RelatedNotesRecommendationProps, RelatedNote, RecommendationReason } from './related-notes-recommendation';

// 重新导出类型以便在其他组件中使用
export type {
  AIAnalysisData,
} from './ai-analysis-dashboard';