/**
 * Search Page
 *
 * Dedicated page for advanced search functionality
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  SearchIcon,
  ArrowLeftIcon,
  BookmarkIcon,
  TrendingUpIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AdvancedSearch } from '@/components/search/advanced-search'
import { SearchAutocomplete } from '@/components/search/search-autocomplete'
import { SearchAnalytics } from '@/components/search/search-analytics'
import { useAuth } from '@/hooks/use-auth'

interface SearchResult {
  id: string
  title: string
  content: string
  contentSnippet: string
  category?: {
    id: string
    name: string
    color: string
  }
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  score: number
  similarity?: number
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  isArchived: boolean
  searchType: 'fulltext' | 'vector' | 'hybrid'
}

interface SearchStats {
  totalResults: number
  searchTime: number
  searchType: string
  fulltextResults?: number
  vectorResults?: number
  embeddingTime?: number
}

export default function SearchPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  const [searchHistory, setSearchHistory] = useState<string[]>([
    '人工智能',
    '项目管理',
    '学习笔记',
    'React开发',
    '产品设计'
  ])

  const [recentResults, setRecentResults] = useState<SearchResult[]>([])
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'analytics'>('search')

  const handleSearchResults = (results: SearchResult[], stats: SearchStats) => {
    setRecentResults(results)
    setSearchStats(stats)
  }

  const handleSearchHistoryClick = (query: string) => {
    // This would trigger the search with the historical query
    console.log('Search for:', query)
  }

  const clearSearchHistory = () => {
    setSearchHistory([])
  }

  if (!isAuthenticated) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center\">
        <Card className=\"w-full max-w-md\">
          <CardContent className=\"pt-6 text-center\">
            <SearchIcon className=\"h-12 w-12 mx-auto mb-4 text-gray-400\" />
            <h2 className=\"text-xl font-semibold mb-2\">需要登录</h2>
            <p className=\"text-gray-600\">请先登录以使用搜索功能</p>
            <Button
              onClick={() => router.push('/auth/signin')}
              className=\"mt-4\"
            >
              去登录
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className=\"min-h-screen bg-gray-50\">
      {/* Header */}
      <header className=\"bg-white border-b border-gray-200 sticky top-0 z-40\">
        <div className=\"container mx-auto px-4 py-4 max-w-6xl\">
          <div className=\"flex items-center justify-between\">
            <div className=\"flex items-center space-x-4\">
              <Button
                variant=\"ghost\"
                size=\"sm\"
                onClick={() => router.back()}
                className=\"text-gray-600 hover:text-gray-900\"
              >
                <ArrowLeftIcon className=\"h-4 w-4 mr-2\" />
                返回
              </Button>

              <div className=\"flex items-center space-x-2\">
                <SearchIcon className=\"h-6 w-6 text-blue-600\" />
                <h1 className=\"text-xl font-semibold\">智能搜索</h1>
              </div>
            </div>

            <div className=\"flex items-center space-x-2\">
              <Button
                variant=\"outline\"
                size=\"sm\"
                onClick={() => router.push('/notes')}
              >
                <BookmarkIcon className=\"h-4 w-4 mr-2\" />
                所有笔记
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className=\"container mx-auto px-4 py-6 max-w-6xl\">
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'search' | 'analytics')} className=\"mb-6\">
          <TabsList className=\"grid w-full grid-cols-2 max-w-md\">
            <TabsTrigger value=\"search\" className=\"flex items-center\">
              <SearchIcon className=\"h-4 w-4 mr-2\" />
              搜索
            </TabsTrigger>
            <TabsTrigger value=\"analytics\" className=\"flex items-center\">
              <BarChartIcon className=\"h-4 w-4 mr-2\" />
              分析
            </TabsTrigger>
          </TabsList>

          <TabsContent value=\"search\" className=\"mt-6 space-y-6\">
            {/* Quick Search Area */}
            <Card>
              <CardHeader>
                <CardTitle className=\"flex items-center text-lg\">
                  <SearchIcon className=\"h-5 w-5 mr-2 text-blue-600\" />
                  快速搜索
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SearchAutocomplete
                  onSearch={(query) => {
                    console.log('Quick search:', query)
                    // This will trigger the advanced search with the query
                  }}
                  placeholder=\"输入关键词快速搜索...\"
                />
              </CardContent>
            </Card>

            <div className=\"grid grid-cols-1 lg:grid-cols-4 gap-6\">
          {/* Main Search Area */}
          <div className=\"lg:col-span-3\">
            <AdvancedSearch
              onResults={handleSearchResults}
              className=\"mb-6\"
            />

            {/* Search Statistics */}
            {searchStats && (
              <Card className=\"mb-6\">
                <CardHeader>
                  <CardTitle className=\"flex items-center text-lg\">
                    <TrendingUpIcon className=\"h-5 w-5 mr-2 text-green-600\" />
                    搜索统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
                    <div className=\"text-center\">
                      <div className=\"text-2xl font-bold text-blue-600\">
                        {searchStats.totalResults}
                      </div>
                      <div className=\"text-sm text-gray-500\">总结果数</div>
                    </div>
                    <div className=\"text-center\">
                      <div className=\"text-2xl font-bold text-green-600\">
                        {(searchStats.searchTime / 1000).toFixed(2)}s
                      </div>
                      <div className=\"text-sm text-gray-500\">搜索时间</div>
                    </div>
                    {searchStats.fulltextResults !== undefined && (
                      <div className=\"text-center\">
                        <div className=\"text-2xl font-bold text-purple-600\">
                          {searchStats.fulltextResults}
                        </div>
                        <div className=\"text-sm text-gray-500\">全文匹配</div>
                      </div>
                    )}
                    {searchStats.vectorResults !== undefined && (
                      <div className=\"text-center\">
                        <div className=\"text-2xl font-bold text-orange-600\">
                          {searchStats.vectorResults}
                        </div>
                        <div className=\"text-sm text-gray-500\">语义匹配</div>
                      </div>
                    )}
                  </div>

                  {searchStats.embeddingTime && (
                    <div className=\"mt-4 pt-4 border-t text-center text-sm text-gray-500\">
                      AI分析时间: {(searchStats.embeddingTime / 1000).toFixed(2)}秒
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className=\"lg:col-span-1 space-y-6\">
            {/* Search History */}
            {searchHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className=\"flex items-center justify-between text-lg\">
                    <span className=\"flex items-center\">
                      <BookmarkIcon className=\"h-5 w-5 mr-2 text-gray-600\" />
                      搜索历史
                    </span>
                    <Button
                      variant=\"ghost\"
                      size=\"sm\"
                      onClick={clearSearchHistory}
                      className=\"text-xs text-gray-500 hover:text-gray-700\"
                    >
                      清除
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className=\"space-y-2\">
                  {searchHistory.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchHistoryClick(query)}
                      className=\"w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors\"
                    >
                      {query}
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Search Tips */}
            <Card>
              <CardHeader>
                <CardTitle className=\"text-lg\">搜索技巧</CardTitle>
              </CardHeader>
              <CardContent className=\"space-y-3\">
                <div className=\"space-y-2 text-sm text-gray-600\">
                  <div className=\"flex items-start space-x-2\">
                    <span className=\"text-blue-600 font-bold\">•</span>
                    <span>使用具体关键词获得更精确的结果</span>
                  </div>
                  <div className=\"flex items-start space-x-2\">
                    <span className=\"text-blue-600 font-bold\">•</span>
                    <span>混合搜索结合了传统和AI语义搜索</span>
                  </div>
                  <div className=\"flex items-start space-x-2\">
                    <span className=\"text-blue-600 font-bold\">•</span>
                    <span>利用筛选器按分类、标签或状态过滤</span>
                  </div>
                  <div className=\"flex items-start space-x-2\">
                    <span className=\"text-blue-600 font-bold\">•</span>
                    <span>语义搜索能理解相关概念和关系</span>
                  </div>
                  <div className=\"flex items-start space-x-2\">
                    <span className=\"text-blue-600 font-bold\">•</span>
                    <span>使用引号进行精确短语匹配</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Filters */}
            <Card>
              <CardHeader>
                <CardTitle className=\"text-lg\">快速筛选</CardTitle>
              </CardHeader>
              <CardContent className=\"space-y-3\">
                <div className=\"space-y-2\">
                  <h4 className=\"text-sm font-medium text-gray-700\">按状态</h4>
                  <div className=\"flex flex-wrap gap-2\">
                    <Badge variant=\"outline\" className=\"cursor-pointer hover:bg-gray-100\">
                      已收藏
                    </Badge>
                    <Badge variant=\"outline\" className=\"cursor-pointer hover:bg-gray-100\">
                      最近更新
                    </Badge>
                    <Badge variant=\"outline\" className=\"cursor-pointer hover:bg-gray-100\">
                      未归档
                    </Badge>
                  </div>
                </div>

                <div className=\"space-y-2\">
                  <h4 className=\"text-sm font-medium text-gray-700\">按时间</h4>
                  <div className=\"flex flex-wrap gap-2\">
                    <Badge variant=\"outline\" className=\"cursor-pointer hover:bg-gray-100\">
                      今天
                    </Badge>
                    <Badge variant=\"outline\" className=\"cursor-pointer hover:bg-gray-100\">
                      本周
                    </Badge>
                    <Badge variant=\"outline\" className=\"cursor-pointer hover:bg-gray-100\">
                      本月
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          <TabsContent value=\"analytics\" className=\"mt-6\">
            <SearchAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}