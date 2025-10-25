/**
 * Search Autocomplete Component
 *
 * Provides intelligent search suggestions and autocomplete functionality
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  SearchIcon,
  ClockIcon,
  TrendingUpIcon,
  HashIcon,
  TagIcon,
  FolderIcon,
  ChevronRightIcon,
  SparklesIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'

interface SearchSuggestion {
  type: 'query' | 'category' | 'tag' | 'recent'
  value: string
  label: string
  count?: number
  color?: string
  icon?: React.ReactNode
}

interface SearchAutocompleteProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
}

export function SearchAutocomplete({
  onSearch,
  placeholder = '搜索笔记内容、标题或标签...',
  className = ''
}: SearchAutocompleteProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mock search history (would come from localStorage or API)
  const [searchHistory] = useState([
    '人工智能',
    '项目管理',
    '学习笔记',
    'React开发',
    '产品设计',
    '会议记录',
    '技术文档',
    '个人成长'
  ])

  // Mock popular searches (would come from analytics)
  const [popularSearches] = useState([
    { query: '人工智能', count: 156 },
    { query: 'React', count: 142 },
    { query: '设计模式', count: 98 },
    { query: '项目管理', count: 87 },
    { query: '技术文档', count: 76 }
  ])

  // Mock categories and tags (would come from API)
  const [categories] = useState([
    { name: '工作', color: '#3B82F6', count: 45 },
    { name: '学习', color: '#10B981', count: 38 },
    { name: '生活', color: '#F59E0B', count: 27 },
    { name: '项目', color: '#8B5CF6', count: 32 }
  ])

  const [tags] = useState([
    { name: '重要', color: '#EF4444', count: 23 },
    { name: '紧急', color: '#F59E0B', count: 18 },
    { name: '想法', color: '#8B5CF6', count: 35 },
    { name: '资料', color: '#10B981', count: 41 },
    { name: '待办', color: '#6B7280', count: 29 }
  ])

  // Debounced search for suggestions
  const debouncedGetSuggestions = useDebounce(
    useCallback(async (query: string) => {
      if (!query.trim()) {
        setSuggestions(getDefaultSuggestions())
        return
      }

      setLoading(true)
      try {
        // Simulate API call to get suggestions
        await new Promise(resolve => setTimeout(resolve, 300))

        const newSuggestions: SearchSuggestion[] = []

        // Add matching search history
        const matchingHistory = searchHistory.filter(item =>
          item.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3)

        matchingHistory.forEach(item => {
          newSuggestions.push({
            type: 'recent',
            value: item,
            label: item,
            icon: <ClockIcon className=\"h-4 w-4 text-gray-500\" />
          })
        })

        // Add matching popular searches
        const matchingPopular = popularSearches.filter(item =>
          item.query.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3)

        matchingPopular.forEach(item => {
          newSuggestions.push({
            type: 'query',
            value: item.query,
            label: `${item.query} (${item.count})`,
            count: item.count,
            icon: <TrendingUpIcon className=\"h-4 w-4 text-blue-500\" />
          })
        })

        // Add matching categories
        const matchingCategories = categories.filter(item =>
          item.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 2)

        matchingCategories.forEach(item => {
          newSuggestions.push({
            type: 'category',
            value: item.name,
            label: `${item.name} (${item.count})`,
            count: item.count,
            color: item.color,
            icon: <FolderIcon className=\"h-4 w-4\" style={{ color: item.color }} />
          })
        })

        // Add matching tags
        const matchingTags = tags.filter(item =>
          item.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3)

        matchingTags.forEach(item => {
          newSuggestions.push({
            type: 'tag',
            value: item.name,
            label: `${item.name} (${item.count})`,
            count: item.count,
            color: item.color,
            icon: <TagIcon className=\"h-4 w-4\" style={{ color: item.color }} />
          })
        })

        // Add AI-powered suggestions if query is long enough
        if (query.length >= 3) {
          const aiSuggestions = await getAISuggestions(query)
          newSuggestions.push(...aiSuggestions)
        }

        setSuggestions(newSuggestions)

      } catch (error) {
        console.error('Failed to get suggestions:', error)
        toast({
          title: '获取建议失败',
          description: '无法加载搜索建议',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }, [searchHistory, popularSearches, categories, tags, toast]),
    400
  )

  // Get default suggestions when input is empty
  const getDefaultSuggestions = useCallback((): SearchSuggestion[] => {
    const defaultSuggestions: SearchSuggestion[] = []

    // Add recent searches
    searchHistory.slice(0, 4).forEach(item => {
      defaultSuggestions.push({
        type: 'recent',
        value: item,
        label: item,
        icon: <ClockIcon className=\"h-4 w-4 text-gray-500\" />
      })
    })

    // Add popular searches
    popularSearches.slice(0, 3).forEach(item => {
      defaultSuggestions.push({
        type: 'query',
        value: item.query,
        label: `${item.query} (${item.count})`,
        count: item.count,
        icon: <TrendingUpIcon className=\"h-4 w-4 text-blue-500\" />
      })
    })

    return defaultSuggestions
  }, [searchHistory, popularSearches])

  // Simulate AI-powered suggestions
  const getAISuggestions = async (query: string): Promise<SearchSuggestion[]> => {
    // In a real implementation, this would call an AI service
    const aiSuggestions = [
      {
        type: 'query' as const,
        value: `${query} 最佳实践`,
        label: `${query} 最佳实践`,
        icon: <SparklesIcon className=\"h-4 w-4 text-purple-500\" />
      },
      {
        type: 'query' as const,
        value: `${query} 入门指南`,
        label: `${query} 入门指南`,
        icon: <SparklesIcon className=\"h-4 w-4 text-purple-500\" />
      }
    ]

    return aiSuggestions
  }

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
    debouncedGetSuggestions(value)
  }, [debouncedGetSuggestions])

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: SearchSuggestion) => {
    let searchQuery = suggestion.value

    // Add prefix for category and tag searches
    if (suggestion.type === 'category') {
      searchQuery = `category:\"${suggestion.value}\"`
    } else if (suggestion.type === 'tag') {
      searchQuery = `tag:\"${suggestion.value}\"`
    }

    setInputValue(searchQuery)
    setOpen(false)
    onSearch(searchQuery)

    // Save to search history (in real app)
    console.log('Saving to search history:', searchQuery)
  }, [onSearch])

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setOpen(false)
      onSearch(inputValue.trim())
      // Save to search history (in real app)
      console.log('Saving to search history:', inputValue.trim())
    }
  }, [inputValue, onSearch])

  // Initialize suggestions
  useEffect(() => {
    setSuggestions(getDefaultSuggestions())
  }, [getDefaultSuggestions])

  // Group suggestions by type
  const groupedSuggestions = suggestions.reduce((groups, suggestion) => {
    if (!groups[suggestion.type]) {
      groups[suggestion.type] = []
    }
    groups[suggestion.type].push(suggestion)
    return groups
  }, {} as Record<string, SearchSuggestion[]>)

  const getGroupLabel = (type: string) => {
    const labels = {
      recent: '最近搜索',
      query: '热门搜索',
      category: '分类',
      tag: '标签'
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <div className={`relative ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <form onSubmit={handleSubmit} className=\"relative\">
            <SearchIcon className=\"absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400\" />
            <input
              ref={inputRef}
              type=\"text\"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className=\"w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent\"
            />
            {inputValue && (
              <Button
                type=\"button\"
                variant=\"ghost\"
                size=\"sm\"
                onClick={() => {
                  setInputValue('')
                  setSuggestions(getDefaultSuggestions())
                }}
                className=\"absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600\"
              >
                ×
              </Button>
            )}
          </form>
        </PopoverTrigger>

        <PopoverContent className=\"w-full p-0\" align=\"start\" sideOffset={4}>
          <Command className=\"w-full\">
            <CommandList className=\"max-h-80\">
              {loading && (
                <div className=\"flex items-center justify-center py-6 text-sm text-gray-500\">
                  <div className=\"flex items-center space-x-2\">
                    <div className=\"animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600\"></div>
                    <span>获取建议中...</span>
                  </div>
                </div>
              )}

              {!loading && Object.keys(groupedSuggestions).length === 0 && (
                <CommandEmpty>无相关建议</CommandEmpty>
              )}

              {!loading && Object.entries(groupedSuggestions).map(([type, items], index) => (
                <div key={type}>
                  <CommandGroup heading={getGroupLabel(type)}>
                    {items.map((suggestion, itemIndex) => (
                      <CommandItem
                        key={`${type}-${itemIndex}`}
                        onSelect={() => handleSelectSuggestion(suggestion)}
                        className=\"flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-gray-50\"
                      >
                        {suggestion.icon && (
                          <span className=\"flex-shrink-0\">{suggestion.icon}</span>
                        )}
                        <span className=\"flex-1 text-sm\">{suggestion.label}</span>
                        {suggestion.color && (
                          <div
                            className=\"w-2 h-2 rounded-full flex-shrink-0\"
                            style={{ backgroundColor: suggestion.color }}
                          />
                        )}
                        {suggestion.count && (
                          <Badge variant=\"secondary\" className=\"text-xs ml-2\">
                            {suggestion.count}
                          </Badge>
                        )}
                        <ChevronRightIcon className=\"h-4 w-4 text-gray-400 flex-shrink-0\" />
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  {index < Object.keys(groupedSuggestions).length - 1 && (
                    <CommandSeparator />
                  )}
                </div>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default SearchAutocomplete