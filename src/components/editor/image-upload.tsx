/**
 * Image Upload Component
 *
 * Handles image upload for the rich text editor
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { ImageIcon, UploadIcon, XIcon, AlertCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ImageUploadProps {
  onImageInsert: (imageUrl: string) => void
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
}

export function ImageUpload({
  onImageInsert,
  maxFileSize = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `不支持的文件类型: ${file.type}。支持的格式: ${acceptedTypes.join(', ')}`
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxFileSize) {
      return `文件大小超过限制: ${fileSizeMB.toFixed(2)}MB > ${maxFileSize}MB`
    }

    return null
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || '上传失败')
      }

      return data.url
    } catch (error) {
      throw new Error(`图片上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 100)

      const imageUrl = await uploadImage(file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Insert image into editor
      onImageInsert(imageUrl)

      // Reset state after delay
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
      }, 500)
    } catch (error) {
      setUploading(false)
      setUploadProgress(0)
      setError(error instanceof Error ? error.message : '上传失败')
    }
  }, [onImageInsert, maxFileSize, acceptedTypes])

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await handleFileSelect(file)
    }
  }

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)

    const file = event.dataTransfer.files[0]
    if (file) {
      await handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)
  }, [])

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          await handleFileSelect(file)
        }
        break
      }
    }
  }, [handleFileSelect])

  // Register paste event listener
  useState(() => {
    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  })

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : uploading
              ? 'border-gray-300 bg-gray-50'
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">正在上传图片...</p>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-gray-500">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                拖拽图片到此处，或点击选择文件
              </p>
              <p className="text-xs text-gray-500">
                支持 {acceptedTypes.join(', ')} 格式，最大 {maxFileSize}MB
              </p>
              <p className="text-xs text-gray-500">
                也可以直接粘贴图片
              </p>
            </div>
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                选择文件
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick tips */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>提示:</strong>
          您可以直接从剪贴板粘贴截图，或者拖拽图片文件到上传区域。
        </p>
      </div>
    </div>
  )
}

export default ImageUpload