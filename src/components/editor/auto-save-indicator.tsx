/**
 * AutoSaveIndicator Component
 *
 * Shows the current auto-save status with visual feedback
 */

'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2Icon, ClockIcon, AlertCircleIcon, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AutoSaveIndicatorProps {
  saving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  error: string | null
}

export function AutoSaveIndicator({
  saving,
  lastSaved,
  hasUnsavedChanges,
  error
}: AutoSaveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('')

  useEffect(() => {
    if (!lastSaved) return

    const updateTimeAgo = () => {
      const now = new Date()
      const diff = now.getTime() - lastSaved.getTime()

      if (diff < 60000) { // Less than 1 minute
        setTimeAgo('刚刚')
      } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000)
        setTimeAgo(`${minutes}分钟前`)
      } else {
        const hours = Math.floor(diff / 3600000)
        setTimeAgo(`${hours}小时前`)
      }
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [lastSaved])

  if (saving) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm text-gray-600">保存中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <AlertCircleIcon className="h-4 w-4 text-red-600" />
        <Badge variant="destructive" className="text-xs">
          保存失败
        </Badge>
      </div>
    )
  }

  if (hasUnsavedChanges) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full" />
        <span className="text-sm text-orange-600">未保存</span>
      </div>
    )
  }

  if (lastSaved) {
    return (
      <div className="flex items-center space-x-2">
        <CheckCircle2Icon className="h-4 w-4 text-green-600" />
        <span className="text-sm text-gray-600">已保存</span>
        <span className="text-xs text-gray-500">({timeAgo})</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="w-2 h-2 bg-gray-400 rounded-full" />
      <span className="text-sm text-gray-500">未修改</span>
    </div>
  )
}