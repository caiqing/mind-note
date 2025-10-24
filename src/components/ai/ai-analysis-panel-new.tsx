/**
 * AI分析面板组件 - 新版本
 *
 * 集成AI分析服务，提供完整的AI分析功能
 */

'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  aiAnalysisService,
  type AIAnalysisResult,
  type AIAnalysisProgress,
} from '@/lib/ai-analysis-service';
import {
  Brain,
  Zap,
  Settings,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Target,
  Tag,
  MessageSquare,
  BarChart3,
} from 'lucide-react';

interface AIAnalysisPanelProps {
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  initialData?: {
    aiProcessed?: boolean;
    aiSummary?: string;
    aiKeywords?: string[];
    aiCategory?: string;
    aiSentiment?: 'positive' | 'negative' | 'neutral';
    aiAnalysisDate?: string;
  };
  onAnalysisComplete?: (results: {
    summary?: string;
    keywords?: string[];
    category?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }) => void;
  onNoteUpdate?: (updatedFields: Record<string, any>) => void;
  className?: string;
}

interface AISettings {
  autoAnalyze: boolean;
  preferredProvider: string;
  language: string;
  analysisOperations: string[];
  qualityThreshold: number;
}

export function AIAnalysisPanelNew({
  noteId,
  noteTitle,
  noteContent,
  initialData,
  onAnalysisComplete,
  onNoteUpdate,
  className,
}: AIAnalysisPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AIAnalysisProgress | null>(null);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([
    'categorize',
    'tag',
    'summarize',
    'keywords',
  ]);
  const [settings, setSettings] = useState<AISettings>({
    autoAnalyze: true,
    preferredProvider: 'mock-ai-service',
    language: 'zh',
    analysisOperations: ['categorize', 'tag', 'summarize', 'keywords'],
    qualityThreshold: 0.8,
  });
  const [activeTab, setActiveTab] = useState('results');

  // 自动分析逻辑
  useEffect(() => {
    if (
      settings.autoAnalyze &&
      noteContent &&
      noteContent.length > 50 &&
      !initialData?.aiProcessed &&
      !isProcessing
    ) {
      const timer = setTimeout(() => {
        handleAnalyze();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [noteContent, settings.autoAnalyze, initialData?.aiProcessed]);

  // 处理分析操作选择
  const handleOperationToggle = (operationId: string) => {
    setSelectedOperations(prev =>
      prev.includes(operationId)
        ? prev.filter(op => op !== operationId)
        : [...prev, operationId],
    );
  };

  // 触发AI分析
  const handleAnalyze = async () => {
    if (!noteTitle || !noteContent || selectedOperations.length === 0) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(null);

    try {
      const analysisResult = await aiAnalysisService.analyzeNoteWithProgress(
        {
          noteId,
          title: noteTitle,
          content: noteContent,
          operations: selectedOperations as any,
          options: {
            language: settings.language as 'zh' | 'en',
            quality: 'balanced',
            provider: settings.preferredProvider,
          },
        },
        progressUpdate => {
          setProgress(progressUpdate);
        },
      );

      setResult(analysisResult);

      // 格式化结果并回调
      const formattedResults = {
        summary: analysisResult.results.summary,
        keywords: analysisResult.results.keywords?.map(k => k.word),
        category: analysisResult.results.category?.name,
        sentiment: analysisResult.results.sentiment?.polarity,
      };

      onAnalysisComplete?.(formattedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // 刷新分析结果
  const handleRefresh = async () => {
    await handleAnalyze();
  };

  // 格式化置信度
  const formatConfidence = (confidence?: number) => {
    if (!confidence) {
      return 'N/A';
    }
    return `${Math.round(confidence * 100)}%`;
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) {
      return 'text-gray-500';
    }
    if (confidence >= 0.8) {
      return 'text-green-600';
    }
    if (confidence >= 0.6) {
      return 'text-yellow-600';
    }
    return 'text-red-600';
  };

  // 获取情感显示名称
  const getSentimentName = (sentiment?: string) => {
    const names: Record<string, string> = {
      positive: '积极',
      negative: '消极',
      neutral: '中性',
    };
    return names[sentiment || ''] || sentiment;
  };

  // 获取情感颜色
  const getSentimentColor = (sentiment?: string) => {
    const colors: Record<string, string> = {
      positive: 'text-green-600 bg-green-50 border-green-200',
      negative: 'text-red-600 bg-red-50 border-red-200',
      neutral: 'text-gray-600 bg-gray-50 border-gray-200',
    };
    return colors[sentiment || ''] || colors.neutral;
  };

  // AI状态指示器
  const AIStatusIndicator = ({
    status,
    message,
  }: {
    status: 'idle' | 'processing' | 'success' | 'error';
    message: string;
  }) => {
    const statusConfig = {
      idle: { icon: Brain, color: 'text-gray-500', bgColor: 'bg-gray-50' },
      processing: {
        icon: RefreshCw,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        animate: true,
      },
      success: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
      error: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div
        className={`flex items-center space-x-2 p-3 rounded-lg ${config.bgColor}`}
      >
        <Icon
          className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
        />
        <span className={`text-sm font-medium ${config.color}`}>{message}</span>
      </div>
    );
  };

  // 进度显示组件
  const ProgressDisplay = () => {
    if (!progress) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center text-lg'>
            <Clock className='w-5 h-5 mr-2 text-blue-600' />
            分析进度
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span>{progress.message}</span>
              <span>{Math.round(progress.progress)}%</span>
            </div>
            <Progress value={progress.progress} className='w-full' />
          </div>

          <div
            className={`flex items-center space-x-2 text-sm ${
              progress.status === 'completed'
                ? 'text-green-600'
                : progress.status === 'error'
                  ? 'text-red-600'
                  : 'text-blue-600'
            }`}
          >
            {progress.status === 'processing' && (
              <RefreshCw className='w-4 h-4 animate-spin' />
            )}
            {progress.status === 'completed' && (
              <CheckCircle className='w-4 h-4' />
            )}
            {progress.status === 'error' && <AlertCircle className='w-4 h-4' />}
            <span>
              {progress.status === 'processing'
                ? '处理中...'
                : progress.status === 'completed'
                  ? '已完成'
                  : progress.status === 'error'
                    ? '出错'
                    : '等待中'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 分析结果展示
  const ResultsDisplay = () => {
    // 如果有初始数据且没有新的分析结果，显示初始数据
    if (initialData?.aiProcessed && !result) {
      return (
        <div className='space-y-4'>
          {initialData.aiSummary && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-lg'>
                  <MessageSquare className='w-5 h-5 mr-2 text-blue-600' />
                  智能摘要
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm leading-relaxed'>
                  {initialData.aiSummary}
                </p>
                {initialData.aiAnalysisDate && (
                  <p className='text-xs text-muted-foreground mt-2'>
                    分析时间:{' '}
                    {new Date(initialData.aiAnalysisDate).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {initialData.aiKeywords && initialData.aiKeywords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-lg'>
                  <Tag className='w-5 h-5 mr-2 text-green-600' />
                  关键词
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-2'>
                  {initialData.aiKeywords.map((keyword, index) => (
                    <Badge key={index} variant='secondary'>
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {initialData.aiCategory && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-lg'>
                  <Target className='w-5 h-5 mr-2 text-purple-600' />
                  内容分类
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  className='text-sm px-3 py-1'
                  style={{ backgroundColor: '#8B5CF6' }}
                >
                  {initialData.aiCategory}
                </Badge>
              </CardContent>
            </Card>
          )}

          {initialData.aiSentiment && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-lg'>
                  <BarChart3 className='w-5 h-5 mr-2 text-orange-600' />
                  情感分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getSentimentColor(initialData.aiSentiment)}>
                  {getSentimentName(initialData.aiSentiment)}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    // 显示新的分析结果
    if (result) {
      return (
        <div className='space-y-4'>
          {result.results.summary && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-lg'>
                  <MessageSquare className='w-5 h-5 mr-2 text-blue-600' />
                  智能摘要
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm leading-relaxed'>
                  {result.results.summary}
                </p>
                <div className='flex items-center justify-between mt-3'>
                  <p className='text-xs text-muted-foreground'>
                    处理时间: {Math.round(result.metadata.processingTime)}ms
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    提供商: {result.metadata.provider}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {result.results.keywords && result.results.keywords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-lg'>
                  <Tag className='w-5 h-5 mr-2 text-green-600' />
                  关键词
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-2'>
                  {result.results.keywords.map((keyword, index) => (
                    <div key={index} className='flex items-center space-x-1'>
                      <Badge variant='secondary'>{keyword.word}</Badge>
                      <span
                        className={`text-xs ${getConfidenceColor(keyword.relevance)}`}
                      >
                        {formatConfidence(keyword.relevance)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.results.category && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-lg'>
                  <Target className='w-5 h-5 mr-2 text-purple-600' />
                  内容分类
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-center space-x-3'>
                  <Badge
                    className='text-sm px-3 py-1'
                    style={{ backgroundColor: '#8B5CF6' }}
                  >
                    {result.results.category.name}
                  </Badge>
                  <span
                    className={`text-sm font-medium ${getConfidenceColor(result.results.category.confidence)}`}
                  >
                    {formatConfidence(result.results.category.confidence)}{' '}
                    置信度
                  </span>
                </div>

                {result.results.category.alternatives &&
                  result.results.category.alternatives.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-sm font-medium text-muted-foreground'>
                        其他建议:
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {result.results.category.alternatives.map(
                        (alt, index) => (
                          <Badge
                            key={index}
                            variant='outline'
                            className='text-xs'
                          >
                            {alt.name} ({formatConfidence(alt.confidence)})
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {result.results.sentiment && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-lg'>
                  <BarChart3 className='w-5 h-5 mr-2 text-orange-600' />
                  情感分析
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-center space-x-3'>
                  <Badge
                    className={getSentimentColor(
                      result.results.sentiment.polarity,
                    )}
                  >
                    {getSentimentName(result.results.sentiment.polarity)}
                  </Badge>
                  <span
                    className={`text-sm font-medium ${getConfidenceColor(result.results.sentiment.confidence)}`}
                  >
                    {formatConfidence(result.results.sentiment.confidence)}{' '}
                    置信度
                  </span>
                </div>

                {result.results.sentiment.emotions &&
                  result.results.sentiment.emotions.length > 0 && (
                  <div className='space-y-2'>
                    <p className='text-sm font-medium text-muted-foreground'>
                        情感细节:
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {result.results.sentiment.emotions.map(
                        (emotion, index) => (
                          <Badge
                            key={index}
                            variant='outline'
                            className='text-xs'
                          >
                            {emotion.name} (
                            {formatConfidence(emotion.intensity)})
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {result.results.tags && result.results.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center text-lg'>
                  <Tag className='w-5 h-5 mr-2 text-indigo-600' />
                  自动标签
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-2'>
                  {result.results.tags.map((tag, index) => (
                    <div key={index} className='flex items-center space-x-1'>
                      <Badge variant='outline'>{tag.name}</Badge>
                      <span className='text-xs text-muted-foreground'>
                        {tag.type}
                      </span>
                      <span
                        className={`text-xs ${getConfidenceColor(tag.confidence)}`}
                      >
                        {formatConfidence(tag.confidence)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    // 空状态
    return (
      <Card>
        <CardContent className='pt-6 pb-6 text-center'>
          <Brain className='w-12 h-12 mx-auto text-muted-foreground mb-4' />
          <h3 className='text-lg font-semibold mb-2'>AI分析</h3>
          <p className='text-muted-foreground mb-4'>
            选择要执行的分析操作，AI将为您深入分析笔记内容
          </p>
          <Button onClick={handleAnalyze} disabled={!noteTitle || !noteContent}>
            <Zap className='w-4 h-4 mr-2' />
            开始分析
          </Button>
        </CardContent>
      </Card>
    );
  };

  // 配置面板
  const ConfigurationPanel = () => {
    const supportedOperations = aiAnalysisService.getSupportedOperations();

    return (
      <div className='space-y-6'>
        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center text-lg'>
              <Zap className='w-5 h-5 mr-2 text-blue-600' />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='auto-analyze' className='cursor-pointer'>
                自动分析内容
              </Label>
              <Switch
                id='auto-analyze'
                checked={settings.autoAnalyze}
                onCheckedChange={checked =>
                  setSettings(prev => ({ ...prev, autoAnalyze: checked }))
                }
              />
            </div>

            <Separator />

            <div className='flex space-x-2'>
              <Button
                onClick={handleAnalyze}
                disabled={
                  isProcessing ||
                  !noteTitle ||
                  !noteContent ||
                  selectedOperations.length === 0
                }
                className='flex-1'
              >
                <Play className='w-4 h-4 mr-2' />
                {isProcessing ? '分析中...' : '开始分析'}
              </Button>

              <Button
                variant='outline'
                onClick={handleRefresh}
                disabled={isProcessing || !result}
              >
                <RefreshCw className='w-4 h-4 mr-2' />
                刷新
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 分析操作选择 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center text-lg'>
              <Settings className='w-5 h-5 mr-2' />
              分析操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {supportedOperations.map(operation => (
                <div key={operation.id} className='flex items-start space-x-3'>
                  <input
                    type='checkbox'
                    id={operation.id}
                    checked={selectedOperations.includes(operation.id)}
                    onChange={() => handleOperationToggle(operation.id)}
                    className='mt-1'
                  />
                  <div className='flex-1'>
                    <Label
                      htmlFor={operation.id}
                      className='cursor-pointer font-medium'
                    >
                      {operation.name}
                    </Label>
                    <p className='text-sm text-muted-foreground mt-1'>
                      {operation.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 设置选项 */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>高级设置</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label htmlFor='provider'>AI提供商</Label>
              <Select
                value={settings.preferredProvider}
                onValueChange={value =>
                  setSettings(prev => ({ ...prev, preferredProvider: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='mock-ai-service'>模拟AI服务</SelectItem>
                  <SelectItem value='zhipu'>智谱AI</SelectItem>
                  <SelectItem value='openai'>OpenAI</SelectItem>
                  <SelectItem value='deepseek'>DeepSeek</SelectItem>
                  <SelectItem value='kimi'>Kimi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='language'>分析语言</Label>
              <Select
                value={settings.language}
                onValueChange={value =>
                  setSettings(prev => ({ ...prev, language: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='zh'>中文</SelectItem>
                  <SelectItem value='en'>English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='threshold'>
                质量阈值: {Math.round(settings.qualityThreshold * 100)}%
              </Label>
              <input
                type='range'
                id='threshold'
                min='0.5'
                max='1.0'
                step='0.05'
                value={settings.qualityThreshold}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    qualityThreshold: parseFloat(e.target.value),
                  }))
                }
                className='w-full mt-2'
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 状态指示器 */}
      <AIStatusIndicator
        status={
          isProcessing
            ? 'processing'
            : error
              ? 'error'
              : result
                ? 'success'
                : 'idle'
        }
        message={
          isProcessing
            ? 'AI正在分析内容...'
            : error
              ? `分析失败: ${error}`
              : result
                ? '分析完成'
                : '等待开始分析'
        }
      />

      {/* 进度显示 */}
      {progress && <ProgressDisplay />}

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='results'>分析结果</TabsTrigger>
          <TabsTrigger value='config'>配置设置</TabsTrigger>
        </TabsList>

        <TabsContent value='results' className='space-y-4'>
          <ResultsDisplay />
        </TabsContent>

        <TabsContent value='config' className='space-y-4'>
          <ConfigurationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
