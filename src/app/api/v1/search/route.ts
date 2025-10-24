/**
 * 笔记搜索API路由
 *
 * POST /api/v1/search - 搜索笔记
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  searchService,
  type SearchRequest as ServiceSearchRequest,
  type SearchFilters,
  type SearchOptions,
} from '@/lib/services/search-service';
import { NoteService } from '@/lib/services/note-service';
import { PrismaClient } from '@prisma/client';
import { type SearchRequest, NoteError } from '@/types/note';

// 创建服务实例
const prisma = new PrismaClient();
const noteService = new NoteService(prisma);

/**
 * 搜索笔记
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 },
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const { query, searchType = 'keyword', filters, options } = body;

    // 3. 验证必需字段
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Search query is required and must be a non-empty string',
          },
        },
        { status: 400 },
      );
    }

    // 4. 构建搜索过滤器
    const searchFilters: SearchFilters = {
      categories: filters?.categories,
      status: filters?.status,
      sentiment: filters?.sentiment,
      isPublic: filters?.isPublic,
      aiProcessed: filters?.aiProcessed,
      dateRange: filters?.dateRange,
      wordCountRange: filters?.wordCountRange,
    };

    // 5. 构建搜索选项
    const searchOptions: SearchOptions = {
      limit: options?.limit || 20,
      offset: options?.offset || 0,
      sortBy: options?.sortBy || 'relevance',
      sortOrder: options?.sortOrder || 'desc',
    };

    // 验证搜索选项
    if (searchOptions.limit! < 1 || searchOptions.limit! > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LIMIT',
            message: 'Limit must be between 1 and 100',
          },
        },
        { status: 400 },
      );
    }

    if (searchOptions.offset! < 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OFFSET',
            message: 'Offset must be non-negative',
          },
        },
        { status: 400 },
      );
    }

    // 6. 构建SearchService请求
    const serviceRequest: ServiceSearchRequest = {
      query: query.trim(),
      searchType,
      filters: searchFilters,
      options: searchOptions,
    };

    // 7. 执行搜索
    const searchResult = await searchService.search(serviceRequest);

    // 8. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        results: searchResult.results,
        analytics: searchResult.analytics,
        suggestions: searchResult.suggestions,
        pagination: {
          total: searchResult.analytics.totalResults,
          limit: searchOptions.limit,
          offset: searchOptions.offset,
          hasMore:
            searchOptions.offset + searchResult.results.length <
            searchResult.analytics.totalResults,
        },
      },
      message: `Found ${searchResult.analytics.totalResults} notes`,
    });
  } catch (error) {
    console.error('Error searching notes:', error);

    // 处理已知错误类型
    if (error instanceof NoteError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.statusCode },
      );
    }

    // 处理未知错误
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during search',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/v1/search - 使用查询参数进行简单搜索
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 },
      );
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Search query parameter "q" is required',
          },
        },
        { status: 400 },
      );
    }

    // 3. 构建搜索过滤器和选项
    const searchFilters: SearchFilters = {
      categories: searchParams.get('categories')
        ? searchParams
          .get('categories')!
          .split(',')
          .map(c => c.trim())
          .filter(Boolean)
        : undefined,
      status: searchParams.get('status')
        ? (searchParams
          .get('status')!
          .split(',')
          .map(s => s.trim())
          .filter(Boolean) as any[])
        : undefined,
      sentiment: searchParams.get('sentiment')
        ? (searchParams
          .get('sentiment')!
          .split(',')
          .map(s => s.trim())
          .filter(Boolean) as any[])
        : undefined,
      isPublic: searchParams.get('isPublic')
        ? searchParams.get('isPublic') === 'true'
        : undefined,
      aiProcessed: searchParams.get('aiProcessed')
        ? searchParams.get('aiProcessed') === 'true'
        : undefined,
    };

    const searchOptions: SearchOptions = {
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
      offset: searchParams.get('offset')
        ? Number(searchParams.get('offset'))
        : 0,
      sortBy: (searchParams.get('sortBy') as any) || 'relevance',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    };

    // 4. 构建SearchService请求
    const serviceRequest: ServiceSearchRequest = {
      query: query.trim(),
      searchType: (searchParams.get('searchType') as any) || 'keyword',
      filters: searchFilters,
      options: searchOptions,
    };

    // 5. 执行搜索
    const searchResult = await searchService.search(serviceRequest);

    // 6. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        results: searchResult.results,
        analytics: searchResult.analytics,
        suggestions: searchResult.suggestions,
        pagination: {
          total: searchResult.analytics.totalResults,
          limit: searchOptions.limit,
          offset: searchOptions.offset,
          hasMore:
            searchOptions.offset + searchResult.results.length <
            searchResult.analytics.totalResults,
        },
      },
      message: `Found ${searchResult.analytics.totalResults} notes`,
    });
  } catch (error) {
    console.error('Error searching notes:', error);

    // 处理已知错误类型
    if (error instanceof NoteError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.statusCode },
      );
    }

    // 处理未知错误
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during search',
        },
      },
      { status: 500 },
    );
  }
}
