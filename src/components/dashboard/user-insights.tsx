/**
 * 用户洞察组件
 *
 * 提供个性化的用户行为分析和建议
 */

'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api-client';
import {
  Brain,
  Target,
  TrendingUp,
  Lightbulb,
  Award,
  Activity,
  Calendar,
  Clock,
  Zap,
  Star,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface UserInsight {
  type: 'achievement' | 'recommendation' | 'trend' | 'milestone';
  title: string;
  description: string;
  action?: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
}

interface UserInsightsProps {
  className?: string;
}

export function UserInsights({ className }: UserInsightsProps) {
  const [insights, setInsights] = useState<UserInsight[]>([]);
  const [scores, setScores] = useState({
    productivityScore: 0,
    engagementScore: 0,
    consistencyScore: 0,
    growthScore: 0,
    overallScore: 0,
  });
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const userInsights = await api.getUserInsights('30d');

      setScores({
        productivityScore: userInsights.productivityScore,
        engagementScore: userInsights.engagementScore,
        consistencyScore: userInsights.consistencyScore,
        growthScore: userInsights.growthScore,
        overallScore: userInsights.overallScore,
      });

      setRecommendations(userInsights.recommendations);

      // 生成洞察卡片
      const generatedInsights = generateInsights(userInsights);
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Failed to load user insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = (userInsights: any): UserInsight[] => {
    const insightList: UserInsight[] = [];

    // 成就洞察
    if (userInsights.productivityScore > 80) {
      insightList.push({
        type: 'achievement',
        title: '生产力专家',
        description:
          '您在过去一个月中展现了出色的生产力，创建和编辑了大量高质量内容。',
        action: '查看详细报告',
        icon: <Award className='w-5 h-5 text-yellow-600' />,
        priority: 'high',
      });
    }

    if (userInsights.consistencyScore > 85) {
      insightList.push({
        type: 'achievement',
        title: '持之以恒',
        description: '您保持了非常规律的笔记习惯，每天都坚持记录和整理。',
        icon: <Calendar className='w-5 h-5 text-blue-600' />,
        priority: 'medium',
      });
    }

    // 趋势洞察
    if (userInsights.growthScore > 75) {
      insightList.push({
        type: 'trend',
        title: '稳步成长',
        description:
          '您的笔记质量和数量都在稳步提升，继续保持这种良好的发展势头。',
        icon: <TrendingUp className='w-5 h-5 text-green-600' />,
        priority: 'medium',
      });
    }

    // 建议洞察
    if (userInsights.engagementScore < 60) {
      insightList.push({
        type: 'recommendation',
        title: '提升参与度',
        description:
          '建议您更多地回顾和更新笔记，增加标签和分类，提高内容的可发现性。',
        action: '优化笔记结构',
        icon: <AlertCircle className='w-5 h-5 text-orange-600' />,
        priority: 'high',
      });
    }

    if (userInsights.productivityScore < 50) {
      insightList.push({
        type: 'recommendation',
        title: '建立写作习惯',
        description: '尝试每天固定时间进行笔记记录，逐步建立稳定的创作习惯。',
        action: '设置提醒',
        icon: <Clock className='w-5 h-5 text-purple-600' />,
        priority: 'high',
      });
    }

    // 里程碑洞察
    if (userInsights.overallScore > 90) {
      insightList.push({
        type: 'milestone',
        title: '笔记大师',
        description:
          '恭喜您！您的整体得分超过了90%，已成为真正的笔记管理专家。',
        action: '分享成就',
        icon: <Star className='w-5 h-5 text-yellow-500' />,
        priority: 'high',
      });
    }

    return insightList;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) {
      return 'text-green-600';
    }
    if (score >= 60) {
      return 'text-yellow-600';
    }
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) {
      return 'bg-green-50';
    }
    if (score >= 60) {
      return 'bg-yellow-50';
    }
    return 'bg-red-50';
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
    case 'high':
      return 'border-red-200 bg-red-50';
    case 'medium':
      return 'border-yellow-200 bg-yellow-50';
    case 'low':
      return 'border-green-200 bg-green-50';
    default:
      return 'border-gray-200 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-200 rounded w-48 mb-4' />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='h-64 bg-gray-200 rounded' />
            <div className='h-64 bg-gray-200 rounded' />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 总体评分卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Brain className='w-5 h-5 mr-2' />
            AI 洞察分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            {/* 总体评分 */}
            <div className='text-center'>
              <div className='relative inline-flex items-center justify-center w-24 h-24 mb-4'>
                <svg className='w-24 h-24 transform -rotate-90'>
                  <circle
                    cx='48'
                    cy='48'
                    r='36'
                    stroke='currentColor'
                    strokeWidth='8'
                    fill='none'
                    className='text-gray-200'
                  />
                  <circle
                    cx='48'
                    cy='48'
                    r='36'
                    stroke='currentColor'
                    strokeWidth='8'
                    fill='none'
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - scores.overallScore / 100)}`}
                    className={getScoreColor(scores.overallScore)}
                    strokeLinecap='round'
                  />
                </svg>
                <div className='absolute'>
                  <p
                    className={`text-2xl font-bold ${getScoreColor(scores.overallScore)}`}
                  >
                    {scores.overallScore.toFixed(0)}
                  </p>
                  <p className='text-xs text-muted-foreground'>总分</p>
                </div>
              </div>
              <p className='text-sm text-muted-foreground'>
                {scores.overallScore >= 90
                  ? '🏆 优秀'
                  : scores.overallScore >= 75
                    ? '🌟 良好'
                    : scores.overallScore >= 60
                      ? '📈 合格'
                      : '💪 需要努力'}
              </p>
            </div>

            {/* 分项评分 */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='text-center p-3 border rounded-lg'>
                <Activity className='w-5 h-5 mx-auto mb-2 text-blue-600' />
                <p className='text-sm font-medium'>生产力</p>
                <p
                  className={`text-lg font-bold ${getScoreColor(scores.productivityScore)}`}
                >
                  {scores.productivityScore.toFixed(0)}
                </p>
              </div>
              <div className='text-center p-3 border rounded-lg'>
                <Target className='w-5 h-5 mx-auto mb-2 text-green-600' />
                <p className='text-sm font-medium'>参与度</p>
                <p
                  className={`text-lg font-bold ${getScoreColor(scores.engagementScore)}`}
                >
                  {scores.engagementScore.toFixed(0)}
                </p>
              </div>
              <div className='text-center p-3 border rounded-lg'>
                <Calendar className='w-5 h-5 mx-auto mb-2 text-purple-600' />
                <p className='text-sm font-medium'>一致性</p>
                <p
                  className={`text-lg font-bold ${getScoreColor(scores.consistencyScore)}`}
                >
                  {scores.consistencyScore.toFixed(0)}
                </p>
              </div>
              <div className='text-center p-3 border rounded-lg'>
                <TrendingUp className='w-5 h-5 mx-auto mb-2 text-orange-600' />
                <p className='text-sm font-medium'>成长性</p>
                <p
                  className={`text-lg font-bold ${getScoreColor(scores.growthScore)}`}
                >
                  {scores.growthScore.toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 洞察卡片 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {insights.map((insight, index) => (
          <Card
            key={index}
            className={`border-2 ${getPriorityColor(insight.priority)}`}
          >
            <CardContent className='p-6'>
              <div className='flex items-start space-x-4'>
                <div
                  className={`p-2 rounded-lg ${getScoreBgColor(insight.priority === 'high' ? 80 : insight.priority === 'medium' ? 60 : 40)}`}
                >
                  {insight.icon}
                </div>
                <div className='flex-1'>
                  <div className='flex items-center justify-between mb-2'>
                    <h3 className='font-semibold'>{insight.title}</h3>
                    <Badge
                      variant={
                        insight.priority === 'high'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {insight.priority === 'high'
                        ? '重要'
                        : insight.priority === 'medium'
                          ? '一般'
                          : '次要'}
                    </Badge>
                  </div>
                  <p className='text-sm text-muted-foreground mb-3'>
                    {insight.description}
                  </p>
                  {insight.action && (
                    <Button variant='outline' size='sm'>
                      {insight.action}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 改进建议 */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <Lightbulb className='w-5 h-5 mr-2' />
              个性化建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className='flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors'
                >
                  <CheckCircle className='w-5 h-5 text-green-600 mt-0.5 flex-shrink-0' />
                  <p className='text-sm'>{recommendation}</p>
                </div>
              ))}
            </div>
            <div className='mt-4 pt-4 border-t'>
              <Button className='w-full'>
                <Zap className='w-4 h-4 mr-2' />
                生成优化计划
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 行动号召 */}
      <Card className='bg-gradient-to-r from-blue-500 to-purple-600 text-white'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-semibold mb-2'>
                继续提升您的工作效率
              </h3>
              <p className='text-blue-100'>
                基于您的使用模式，我们为您准备了个性化的优化建议和工具推荐。
              </p>
            </div>
            <Button
              variant='secondary'
              className='bg-white text-blue-600 hover:bg-blue-50'
            >
              查看建议
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
