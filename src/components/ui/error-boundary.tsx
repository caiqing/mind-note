/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays fallback UI
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangleIcon, RefreshCwIcon, BugIcon } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  enableReset?: boolean
  showErrorDetails?: boolean
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
}

class ErrorBoundary extends Component<Props, State> {
  private errorId: string

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
    this.errorId = this.generateErrorId()
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // In production, send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateErrorId(): string {
    return ErrorBoundary.generateErrorId()
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Implementation for external error logging service
    // e.g., Sentry, LogRocket, etc.
    try {
      const errorData = {
        errorId: this.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      // Send to error logging service
      console.warn('Error logged to service:', errorData)
    } catch (logError) {
      console.error('Failed to log error to service:', logError)
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleReportError = () => {
    const { error, errorInfo } = this.state
    if (!error) return

    const errorReport = {
      errorId: this.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // Create a formatted error report
    const reportText = `
Error ID: ${errorId}
Timestamp: ${errorReport.timestamp}
Message: ${errorReport.message}
User Agent: ${errorReport.userAgent}
URL: ${errorReport.url}

Stack Trace:
${errorReport.stack || 'No stack trace available'}

Component Stack:
${errorReport.componentStack || 'No component stack available'}
`.trim()

    // Copy error report to clipboard
    navigator.clipboard.writeText(reportText).then(() => {
      alert('错误报告已复制到剪贴板，请发送给开发团队')
    }).catch(() => {
      // Fallback: create a textarea for manual copying
      const textarea = document.createElement('textarea')
      textarea.value = reportText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('错误报告已复制到剪贴板，请发送给开发团队')
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo } = this.state
      const { enableReset = true, showErrorDetails = false } = this.props

      return (
        <Card className="w-full max-w-md mx-auto mt-8 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangleIcon className="h-5 w-5 mr-2" />
              出现了错误
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              很抱歉，应用遇到了意外错误。请尝试刷新页面或联系技术支持。
            </div>

            {error && (
              <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                <div className="font-medium">错误信息:</div>
                <div className="mt-1">{error.message}</div>
              </div>
            )}

            {showErrorDetails && error && (
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 mb-2">
                  查看详细错误信息
                </summary>
                <div className="mt-2 space-y-2">
                  {error.stack && (
                    <div>
                      <div className="font-medium text-gray-700">堆栈跟踪:</div>
                      <pre className="bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <div className="font-medium text-gray-700">组件堆栈:</div>
                      <pre className="bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col space-y-2">
              {enableReset && (
                <Button
                  onClick={this.handleReset}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  重试
                </Button>
              )}

              <Button
                onClick={this.handleReportError}
                className="w-full"
                variant="outline"
                size="sm"
              >
                <BugIcon className="h-4 w-4 mr-2" />
                报告错误
              </Button>

              <Button
                onClick={() => window.location.reload()}
                className="w-full"
                variant="ghost"
                size="sm"
              >
                刷新页面
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-400 text-center pt-2 border-t">
                错误ID: {this.errorId}
              </div>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary