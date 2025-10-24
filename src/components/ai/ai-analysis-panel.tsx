/**
 * AI分析面板组件
 *
 * 展示AI分析状态、结果和配置选项
 */

'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  aiAnalysisService,
  type AIAnalysisResult,
  type AIAnalysisProgress,
} from '@/lib/ai-analysis-service';
import {
  Zap,
  Brain,
  Tag,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Eye,
  Sparkles,
  Target,
  Lightbulb,
  BarChart3,
} from 'lucide-react';

interface AIAnalysisResult {
  categories?: {
    categories: Array<{
      name: string;
      confidence: number;
      reasoning?: string;
    }>;
    primaryCategory?: {
      name: string;
      confidence: number;
    };
    confidence?: number;
  };
  tags?: {
    tags: Array<{
      name: string;
      type: string;
      confidence: number;
      relevance: number;
    }>;
    confidence?: number;
  };
  summary?: {
    summary: string;
    style: string;
    length: number;
    confidence: number;
    keyPoints?: string[];
  };
  keywords?: {
    keywords: Array<{
      word: string;
      score: number;
      type: string;
    }>;
    confidence?: number;
  };
  sentiment?: {
    sentiment: {
      polarity: string;
      score: number;
      magnitude: number;
    };
    emotions?: Array<{
      emotion: string;
      score: number;
    }>;
    confidence?: number;
  };
}

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
  autoCategorize: boolean;
  autoTag: boolean;
  autoSummarize: boolean;
  autoKeywords: boolean;
  autoSentiment: boolean;
}

const availableOperations = [
  {
    id: 'categorize',
    name: '智能分类',
    icon: Target,
    description: '自动分类笔记内容',
  },
  { id: 'tag', name: '标签生成', icon: Tag, description: '生成相关标签' },
  {
    id: 'summarize',
    name: '摘要生成',
    icon: FileText,
    description: '生成内容摘要',
  },
  {
    id: 'extract_keywords',
    name: '关键词提取',
    icon: TrendingUp,
    description: '提取关键概念',
  },
  {
    id: 'analyze_sentiment',
    name: '情感分析',
    icon: Brain,
    description: '分析情感倾向',
  },
];

export function AIAnalysisPanel({
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
    preferredProvider: 'zhipu',
    language: 'zh',
    analysisOperations: ['categorize', 'tag', 'summarize', 'keywords'],
    qualityThreshold: 0.8,
    autoCategorize: true,
    autoTag: true,
    autoSummarize: true,
    autoKeywords: true,
    autoSentiment: false,
  });
  const [activeTab, setActiveTab] = useState('results');

  // 自动分析逻辑
  useEffect(() => {
    if (
      settings.autoAnalyze &&
      noteContent &&
      noteContent.length > 50 &&
      !initialData?.aiProcessed
    ) {
      handleAnalyze();
    }
  }, [noteContent, settings.autoAnalyze]);

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

  // 操作配置面板
  const OperationConfigPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center'>
          <Settings className='w-4 h-4 mr-2' />
          分析配置
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* AI提供商选择 */}
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
              <SelectItem value='zhipu'>智谱AI (推荐)</SelectItem>
              <SelectItem value='openai'>OpenAI</SelectItem>
              <SelectItem value='deepseek'>DeepSeek</SelectItem>
              <SelectItem value='kimi'>Kimi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 语言选择 */}
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

        {/* 质量阈值 */}
        <div>
          <Label htmlFor='threshold'>
            质量阈值: {Math.round(settings.qualityThreshold * 100)}%
          </Label>
          <input
            type='range'
            min='0.5'
            max='1'
            step='0.1'
            value={settings.qualityThreshold}
            onChange={e =>
              setSettings(prev => ({
                ...prev,
                qualityThreshold: parseFloat(e.target.value),
              }))
            }
            className='w-full'
          />
        </div>

        <Separator />

        {/* 自动分析设置 */}
        <div className='space-y-3'>
          <Label>自动分析选项</Label>

          <div className='flex items-center justify-between'>
            <Label htmlFor='autoAnalyze'>启用自动分析</Label>
            <Switch
              id='autoAnalyze'
              checked={settings.autoAnalyze}
              onCheckedChange={checked =>
                setSettings(prev => ({ ...prev, autoAnalyze: checked }))
              }
            />
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='autoCategorize'>自动分类</Label>
            <Switch
              id='autoCategorize'
              checked={settings.autoCategorize}
              onCheckedChange={checked =>
                setSettings(prev => ({ ...prev, autoCategorize: checked }))
              }
              disabled={!settings.autoAnalyze}
            />
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='autoTag'>自动标签</Label>
            <Switch
              id='autoTag'
              checked={settings.autoTag}
              onCheckedChange={checked =>
                setSettings(prev => ({ ...prev, autoTag: checked }))
              }
              disabled={!settings.autoAnalyze}
            />
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='autoSummarize'>自动摘要</Label>
            <Switch
              id='autoSummarize'
              checked={settings.autoSummarize}
              onCheckedChange={checked =>
                setSettings(prev => ({ ...prev, autoSummarize: checked }))
              }
              disabled={!settings.autoAnalyze}
            />
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='autoKeywords'>自动关键词</Label>
            <Switch
              id='autoKeywords'
              checked={settings.autoKeywords}
              onCheckedChange={checked =>
                setSettings(prev => ({ ...prev, autoKeywords: checked }))
              }
              disabled={!settings.autoAnalyze}
            />
          </div>
        </div>

        <Separator />

        {/* 操作选择 */}
        <div>
          <Label>分析操作</Label>
          <div className='space-y-2'>
            {availableOperations.map(operation => (
              <div
                key={operation.id}
                className='flex items-center justify-between'
              >
                <div className='flex items-center space-x-2'>
                  <operation.icon className='w-4 h-4 text-muted-foreground' />
                  <div>
                    <div className='font-medium text-sm'>{operation.name}</div>
                    <div className='text-xs text-muted-foreground'>
                      {operation.description}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={selectedOperations.includes(operation.id)}
                  onCheckedChange={() => handleOperationToggle(operation.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className='flex space-x-2'>
          <Button
            onClick={handleAnalyze}
            disabled={isProcessing || selectedOperations.length === 0}
            className='flex-1'
          >
            <Zap className='w-4 h-4 mr-2' />
            {isProcessing ? '分析中...' : '开始分析'}
          </Button>

          <Button variant='outline' onClick={onRefresh} disabled={isProcessing}>
            <RefreshCw className='w-4 h-4 mr-2' />
            刷新
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // 分类结果展示
  const CategoryResults = () => (
    <div className='space-y-4'>
      {/* 主要分类 */}
      {result?.categories?.primaryCategory && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center text-lg'>
              <Target className='w-5 h-5 mr-2 text-blue-600' />
              主要分类
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-semibold text-lg'>
                  {result.categories.primaryCategory.name}
                </h3>
                <Badge className='ml-2' style={{ backgroundColor: '#3B82F6' }}>
                  {formatConfidence(
                    result.categories.primaryCategory.confidence,
                  )}
                </Badge>
              </div>
              <div className='text-right'>
                <div
                  className={`text-sm font-medium ${getConfidenceColor(result.categories.primaryCategory.confidence)}`}
                >
                  {formatConfidence(
                    result.categories.primaryCategory.confidence,
                  )}{' '}
                  置信度
                </div>
              </div>
            </div>
            {result.categories.primaryCategory.reasoning && (
              <p className='text-sm text-muted-foreground mt-2'>
                {result.categories.primaryCategory.reasoning}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 其他分类 */}
      {result?.categories?.categories &&
        result.categories.categories.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>其他分类建议</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {result.categories.categories
                .filter(
                  cat => cat.name !== result.categories.primaryCategory?.name,
                )
                .map((category, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-3 border rounded-lg'
                  >
                    <div className='flex-1'>
                      <div className='font-medium'>{category.name}</div>
                      {category.reasoning && (
                        <p className='text-sm text-muted-foreground mt-1'>
                          {category.reasoning}
                        </p>
                      )}
                    </div>
                    <div className='flex flex-col items-end space-y-1'>
                      <Badge variant='outline'>
                        {formatConfidence(category.confidence)}
                      </Badge>
                      <div
                        className={`text-xs ${getConfidenceColor(category.confidence)}`}
                      >
                          置信度
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // 标签结果展示
  const TagResults = () => (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center text-lg'>
          <Tag className='w-5 h-5 mr-2 text-purple-600' />
          智能标签
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result?.tags?.tags && result.tags.tags.length > 0 ? (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>
                生成 {result.tags.tags.length} 个标签
              </span>
              <Badge variant='outline'>
                整体置信度: {formatConfidence(result.tags.confidence)}
              </Badge>
            </div>

            <div className='flex flex-wrap gap-2'>
              {result.tags.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant='secondary'
                  className='cursor-help'
                  title={`类型: ${tag.type}, 相关性: ${Math.round(tag.relevance * 100)}%, 置信度: ${formatConfidence(tag.confidence)}`}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>

            {result.tags.reasoning && (
              <p className='text-sm text-muted-foreground bg-muted p-3 rounded'>
                <strong>分析说明:</strong> {result.tags.reasoning}
              </p>
            )}
          </div>
        ) : (
          <div className='text-center py-8 text-muted-foreground'>
            <Tag className='w-8 h-8 mx-auto mb-2 opacity-50' />
            <p>暂无标签生成结果</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 摘要结果展示
  const SummaryResults = () => (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center text-lg'>
          <FileText className='w-5 h-5 mr-2 text-green-600' />
          智能摘要
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result?.summary ? (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <span className='text-sm text-muted-foreground'>风格:</span>
                <Badge variant='outline'>{result.summary.style}</Badge>
                <span className='text-sm text-muted-foreground'>长度:</span>
                <span className='text-sm font-medium'>
                  {result.summary.length} 字
                </span>
              </div>
              <Badge variant='outline'>
                置信度: {formatConfidence(result.summary.confidence)}
              </Badge>
            </div>

            <div className='bg-muted p-4 rounded-lg'>
              <p className='text-sm leading-relaxed'>
                {result.summary.summary}
              </p>
            </div>

            {result.summary.keyPoints &&
              result.summary.keyPoints.length > 0 && (
              <div>
                <h4 className='font-medium mb-2 text-sm'>关键要点</h4>
                <ul className='space-y-1'>
                  {result.summary.keyPoints.map((point, index) => (
                    <li key={index} className='text-sm flex items-start'>
                      <span className='inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 mr-2 flex-shrink-0' />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className='text-center py-8 text-muted-foreground'>
            <FileText className='w-8 h-8 mx-auto mb-2 opacity-50' />
            <p>暂无摘要生成结果</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 关键词结果展示
  const KeywordResults = () => (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center text-lg'>
          <TrendingUp className='w-5 h-5 mr-2 text-orange-600' />
          关键词提取
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result?.keywords?.keywords && result.keywords.keywords.length > 0 ? (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>
                提取 {result.keywords.keywords.length} 个关键词
              </span>
              <Badge variant='outline'>
                置信度: {formatConfidence(result.keywords.confidence)}
              </Badge>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              {result.keywords.keywords
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((keyword, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-2 border rounded'
                  >
                    <div className='flex-1'>
                      <span className='font-medium'>{keyword.word}</span>
                      <Badge variant='outline' className='ml-2 text-xs'>
                        {keyword.type}
                      </Badge>
                    </div>
                    <div className='flex flex-col items-end space-y-1'>
                      <div className='text-xs font-medium'>
                        {Math.round(keyword.score * 100)}%
                      </div>
                      <div className='w-full bg-gray-200 rounded-full h-1'>
                        <div
                          className='bg-orange-500 h-1 rounded-full'
                          style={{ width: `${keyword.score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className='text-center py-8 text-muted-foreground'>
            <TrendingUp className='w-8 h-8 mx-auto mb-2 opacity-50' />
            <p>暂无关键词提取结果</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 情感分析结果展示
  const SentimentResults = () => (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center text-lg'>
          <Brain className='w-5 h-5 mr-2 text-indigo-600' />
          情感分析
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result?.sentiment ? (
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>情感倾向:</span>
              <Badge
                variant={
                  result.sentiment.sentiment.polarity === 'positive'
                    ? 'default'
                    : 'secondary'
                }
              >
                {result.sentiment.sentiment.polarity === 'positive'
                  ? '积极'
                  : result.sentiment.sentiment.polarity === 'negative'
                    ? '消极'
                    : '中性'}
              </Badge>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>情感评分:</span>
                <span
                  className={`font-medium ${getConfidenceColor(result.sentiment.sentiment.score)}`}
                >
                  {result.sentiment.sentiment.score > 0 ? '+' : ''}
                  {result.sentiment.sentiment.score.toFixed(2)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>情感强度:</span>
                <div className='flex items-center space-x-2'>
                  <div className='w-32 bg-gray-200 rounded-full h-2'>
                    <div
                      className='bg-indigo-500 h-2 rounded-full'
                      style={{
                        width: `${result.sentiment.sentiment.magnitude * 100}%`,
                      }}
                    />
                  </div>
                  <span className='text-sm font-medium'>
                    {Math.round(result.sentiment.sentiment.magnitude * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {result.sentiment.emotions &&
              result.sentiment.emotions.length > 0 && (
              <div>
                <h4 className='font-medium mb-3 text-sm'>情绪分析</h4>
                <div className='grid grid-cols-2 gap-3'>
                  {result.sentiment.emotions
                    .sort((a, b) => b.score - a.score)
                    .map((emotion, index) => (
                      <div
                        key={index}
                        className='flex items-center justify-between p-2 border rounded'
                      >
                        <span className='text-sm'>{emotion.emotion}</span>
                        <div className='flex items-center space-x-2'>
                          <div className='w-16 bg-gray-200 rounded-full h-1'>
                            <div
                              className='bg-indigo-500 h-1 rounded-full'
                              style={{ width: `${emotion.score * 100}%` }}
                            />
                          </div>
                          <span className='text-xs font-medium'>
                            {Math.round(emotion.score * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='text-center py-8 text-muted-foreground'>
            <Brain className='w-8 h-8 mx-auto mb-2 opacity-50' />
            <p>暂无情感分析结果</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 分析进度展示
  const AnalysisProgress = () => (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center justify-between'>
          <span className='flex items-center'>
            <Zap className='w-4 h-4 mr-2 text-blue-600' />
            AI分析进度
          </span>
          {isProcessing && (
            <Badge variant='outline' className='text-blue-600'>
              <RefreshCw className='w-3 h-3 mr-1 animate-spin' />
              处理中
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {selectedOperations.map(operation => (
            <div key={operation} className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isProcessing ? 'bg-blue-100' : 'bg-green-100'
                  }`}
                >
                  {isProcessing ? (
                    <RefreshCw className='w-4 h-4 text-blue-600 animate-spin' />
                  ) : (
                    <CheckCircle className='w-4 h-4 text-green-600' />
                  )}
                </div>
                <span className='text-sm font-medium'>
                  {availableOperations.find(op => op.id === operation)?.name}
                </span>
              </div>
              <div className='flex items-center space-x-2'>
                {isProcessing && (
                  <div className='w-24 bg-blue-200 rounded-full h-2'>
                    <div className='bg-blue-500 h-2 rounded-full animate-pulse' />
                  </div>
                )}
                {!isProcessing && (
                  <span className='text-sm text-green-600'>完成</span>
                )}
              </div>
            </div>
          ))}

          {selectedOperations.length === 0 && (
            <div className='text-center py-8 text-muted-foreground'>
              <Lightbulb className='w-8 h-8 mx-auto mb-2 opacity-50' />
              <p>选择要执行的AI分析操作</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI状态指示器 */}
      {isProcessing && (
        <AIStatusIndicator status='processing' message='AI正在分析中...' />
      )}

      {error && (
        <AIStatusIndicator status='error' message={`分析失败: ${error}`} />
      )}

      {!isProcessing && !error && result && (
        <AIStatusIndicator status='success' message='AI分析完成' />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='results'>分析结果</TabsTrigger>
          <TabsTrigger value='config'>分析配置</TabsTrigger>
          <TabsTrigger value='progress'>分析进度</TabsTrigger>
        </TabsList>

        <TabsContent value='results' className='space-y-6'>
          {/* 只在有结果时显示结果 */}
          {result && (
            <>
              {/* 分类结果 */}
              {(result.categories ||
                result.tags ||
                result.summary ||
                result.keywords ||
                result.sentiment) && (
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  {/* 左列 */}
                  <div className='space-y-6'>
                    {result.categories && <CategoryResults />}
                    {result.tags && <TagResults />}
                  </div>

                  {/* 右列 */}
                  <div className='space-y-6'>
                    {result.summary && <SummaryResults />}
                    {result.keywords && <KeywordResults />}
                  </div>
                </div>
              )}

              {/* 情感分析总是显示在最下面 */}
              {result.sentiment && <SentimentResults />}
            </>
          )}

          {/* 没有结果时的提示 */}
          {!result && !isProcessing && !error && (
            <Card>
              <CardContent className='pt-12 pb-12 text-center'>
                <Brain className='w-16 h-16 mx-auto text-muted-foreground mb-4' />
                <h3 className='text-lg font-semibold mb-2'>等待AI分析</h3>
                <p className='text-muted-foreground mb-4'>
                  选择分析操作并点击"开始分析"来启用AI智能分析功能
                </p>
                <Button onClick={() => setActiveTab('config')}>
                  <Settings className='w-4 h-4 mr-2' />
                  配置分析选项
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='config' className='space-y-6'>
          <OperationConfigPanel />
        </TabsContent>

        <TabsContent value='progress' className='space-y-6'>
          <AnalysisProgress />
        </TabsContent>
      </Tabs>
    </div>
  );
}
