/**
 * 向量搜索API
 * 提供基于向量嵌入的语义搜索功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/vector/embedding-service';
import { Logger } from '@/lib/utils/logger';

interface VectorSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: {
    userId?: string;
    categoryId?: string;
    tags?: string[];
    status?: string;
  };
  includeMetadata?: boolean;
}

interface VectorSearchResponse {
  success: boolean;
  data?: {
    results: Array<{
      noteId: string;
      title: string;
      content: string;
      similarity: number;
      metadata?: any;
    }>;
    query: string;
    totalResults: number;
    searchTime: number;
    threshold: number;
  };
  message: string;
  timestamp: string;
  error?: {
    code: string;
    message: string;
  };
}

// 向量搜索
export async function POST(request: NextRequest) {
  try {
    const body: VectorSearchRequest = await request.json();

    // 验证请求参数
    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: '查询参数无效',
          error: {
            code: 'INVALID_QUERY',
            message: 'query参数是必需的，且必须是字符串',
          },
        },
        { status: 400 },
      );
    }

    if (body.query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: '查询文本过短',
          error: {
            code: 'QUERY_TOO_SHORT',
            message: '查询文本至少需要2个字符',
          },
        },
        { status: 400 },
      );
    }

    const startTime = Date.now();

    // 执行向量搜索
    const results = await embeddingService.vectorSearch({
      query: body.query,
      limit: Math.min(body.limit || 10, 50),
      threshold: body.threshold || 0.7,
      filters: body.filters,
      includeMetadata: body.includeMetadata || false,
    });

    const searchTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        results,
        query: body.query,
        totalResults: results.length,
        searchTime,
        threshold: body.threshold || 0.7,
      },
      message: '向量搜索完成',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    Logger.error('向量搜索API错误:', error);

    return NextResponse.json(
      {
        success: false,
        message: '向量搜索失败',
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
