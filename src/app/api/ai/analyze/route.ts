import { NextResponse } from 'next/server';
import { z } from 'zod';

const analyzeRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  title: z.string().optional(),
});

// 模拟AI分析功能
function generateSummary(content: string, title?: string): string {
  // 简单的摘要生成逻辑
  const sentences = content
    .split(/[.!?。！？]/)
    .filter(s => s.trim().length > 0);
  const wordCount = content.split(/\s+/).length;

  if (wordCount < 50) {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }

  // 取前几句作为摘要
  const summary = sentences.slice(0, 3).join('。') + '。';
  return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
}

function extractKeywords(content: string): string[] {
  // 简单的关键词提取逻辑
  const words = content
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 移除标点符号，保留中文字符
    .split(/\s+/)
    .filter(word => word.length > 1);

  // 统计词频
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // 排序并取前5个
  const sortedWords = Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);

  return sortedWords;
}

function generateTags(content: string): string[] {
  const keywords = extractKeywords(content);
  const tags = ['技术', '学习', '工作', '生活', '创意', '想法'];

  // 根据内容特征添加标签
  if (content.includes('AI') || content.includes('人工智能')) {
    tags.push('AI', '人工智能');
  }
  if (content.includes('代码') || content.includes('编程')) {
    tags.push('编程', '代码');
  }
  if (content.includes('项目') || content.includes('计划')) {
    tags.push('项目管理');
  }

  // 添加提取的关键词作为标签
  const filteredKeywords = keywords
    .filter(word => word.length > 1 && !tags.includes(word))
    .slice(0, 3);

  return [...tags.slice(0, 4), ...filteredKeywords];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, title } = analyzeRequestSchema.parse(body);

    // 模拟AI处理时间
    await new Promise(resolve => setTimeout(resolve, 1000));

    const analysis = {
      summary: generateSummary(content, title),
      keywords: extractKeywords(content),
      tags: generateTags(content),
      wordCount: content.split(/\s+/).length,
      estimatedReadingTime: Math.ceil(content.split(/\s+/).length / 200), // 假设每分钟200字
      sentiment: content.length > 100 ? 'neutral' : 'positive', // 简单的情感分析
    };

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('AI analysis error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
