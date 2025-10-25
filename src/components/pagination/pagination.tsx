/**
 * Pagination Component
 *
 * Customizable pagination component for navigating through pages of content
 */

'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  MoreHorizontalIcon
} from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  showPageSizeSelector?: boolean
  showTotalCount?: boolean
  className?: string
  pageSizeOptions?: number[]
}

const DEFAULT_PAGE_SIZE_OPTIONS = [6, 12, 24, 48]

export default function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showTotalCount = true,
  className = '',
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS
}: PaginationProps) {
  // Calculate page range to display
  const getVisiblePages = () => {
    const delta = 2 // Number of pages to show around current page
    const range = []
    const rangeWithDots = []
    let l

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i)
      }
    }

    range.forEach((i, index) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1)
        } else if (i - l !== 1) {
          rangeWithDots.push('...')
        }
      }
      rangeWithDots.push(i)
      l = i
    })

    return rangeWithDots
  }

  const visiblePages = getVisiblePages()
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalCount)
  const endItem = Math.min(currentPage * pageSize, totalCount)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
    }
  }

  const handlePageSizeChange = (newPageSize: string) => {
    const size = parseInt(newPageSize)
    if (onPageSizeChange && size !== pageSize) {
      onPageSizeChange(size)
    }
  }

  return (
    <div className={`pagination flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 ${className}`}>
      {/* Page Size Selector and Count Info */}
      <div className="flex items-center space-x-4">
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">每页显示</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-700">条</span>
          </div>
        )}

        {showTotalCount && (
          <div className="text-sm text-gray-700">
            共 <span className="font-medium">{totalCount}</span> 条记录
            {totalCount > 0 && (
              <span className="text-gray-500">
                ，显示第 <span className="font-medium">{startItem}</span> 至{' '}
                <span className="font-medium">{endItem}</span> 条
              </span>
            )}
          </div>
        )}
      </div>

      {/* Page Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-1">
          {/* First Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>

          {/* Previous Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {visiblePages.map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <div className="flex items-center justify-center h-8 w-8">
                    <MoreHorizontalIcon className="h-4 w-4 text-gray-400" />
                  </div>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page as number)}
                    className="h-8 w-8 p-0"
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Next Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          {/* Last Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}