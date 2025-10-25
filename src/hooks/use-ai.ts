/**
 * AI服务React Hook
 * 提供便捷的AI功能调用和状态管理
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import AIClient, { ConversationHistory } from '@/lib/api/ai-client'
import { AIServiceRequest, AIServiceResponse } from '@/lib/api/ai-service'

export interface UseAIOptions {
  userId?: string
  defaultPreferences?: {
    quality?: 'basic' | 'good' | 'excellent'
    speed?: 'fast' | 'medium' | 'slow'
    cost?: 'low' | 'medium' | 'high'
  }
  onError?: (error: Error) => void
  onSuccess?: (response: AIServiceResponse) => void
}

export interface UseAIState {
  loading: boolean
  error: string | null
  response: AIServiceResponse | null
  conversationHistory: ConversationHistory | null
}

export interface UseAIActions {
  generateText: (prompt: string, options?: Partial<AIServiceRequest>) => Promise<string>
  generateTextConcurrent: (prompt: string, maxConcurrency?: number) => Promise<string>
  continueChat: (conversationId: string, message: string) => Promise<string>
  getChatHistory: (conversationId: string) => Promise<ConversationHistory | null>
  clearChat: (conversationId: string) => Promise<boolean>
  analyzeText: (text: string, analysisType: 'summary' | 'sentiment' | 'keywords' | 'topics') => Promise<string>
  translateText: (text: string, targetLanguage: string, sourceLanguage?: string) => Promise<string>
  rewriteText: (text: string, style: 'formal' | 'casual' | 'professional' | 'creative' | 'simple') => Promise<string>
  streamText: (prompt: string, options?: {
    onChunk?: (chunk: any) => void
    onComplete?: (fullText: string) => void
    onError?: (error: Error) => void
  }) => Promise<void>
  reset: () => void
}

export function useAI(options: UseAIOptions = {}): UseAIState & UseAIActions {
  const clientRef = useRef<AIClient>()
  const [state, setState] = useState<UseAIState>({
    loading: false,
    error: null,
    response: null,
    conversationHistory: null
  })

  // 初始化客户端
  useEffect(() => {
    clientRef.current = AIClient.getInstance()
  }, [])

  // 更新状态的辅助函数
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false }))
    if (error && options.onError) {
      options.onError(new Error(error))
    }
  }, [options.onError])

  const setResponse = useCallback((response: AIServiceResponse | null) => {
    setState(prev => ({ ...prev, response, loading: false, error: null }))
    if (response && options.onSuccess) {
      options.onSuccess(response)
    }
  }, [options.onSuccess])

  // 生成文本
  const generateText = useCallback(async (
    prompt: string,
    requestOptions?: Partial<AIServiceRequest>
  ): Promise<string> => {
    if (!clientRef.current) {
      throw new Error('AI client not initialized')
    }

    setLoading(true)
    setError(null)

    try {
      const request: Partial<AIServiceRequest> = {
        prompt,
        userId: options.userId || 'anonymous',
        preferences: {
          ...options.defaultPreferences,
          ...requestOptions?.preferences
        },
        ...requestOptions
      }

      const response = await clientRef.current.generateText(request)

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate text')
      }

      setResponse(response)
      return response.content

    } catch (error) {
      setError(error.message)
      throw error
    }
  }, [options.userId, options.defaultPreferences, setLoading, setError, setResponse])

  // 并发生成文本
  const generateTextConcurrent = useCallback(async (
    prompt: string,
    maxConcurrency: number = 2
  ): Promise<string> => {
    if (!clientRef.current) {
      throw new Error('AI client not initialized')
    }

    setLoading(true)
    setError(null)

    try {
      const response = await clientRef.current.generateTextConcurrent({
        prompt,
        userId: options.userId || 'anonymous',
        preferences: options.defaultPreferences
      }, maxConcurrency)

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate text concurrently')
      }

      setResponse(response)
      return response.content

    } catch (error) {
      setError(error.message)
      throw error
    }
  }, [options.userId, options.defaultPreferences, setLoading, setError, setResponse])

  // 继续对话
  const continueChat = useCallback(async (
    conversationId: string,
    message: string
  ): Promise<string> => {
    if (!clientRef.current) {
      throw new Error('AI client not initialized')
    }

    setLoading(true)
    setError(null)

    try {
      const response = await clientRef.current.continueChat(
        conversationId,
        message,
        options.userId,
        {
          preferences: options.defaultPreferences
        }
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to continue chat')
      }

      setResponse(response)
      return response.content

    } catch (error) {
      setError(error.message)
      throw error
    }
  }, [options.userId, options.defaultPreferences, setLoading, setError, setResponse])

  // 获取对话历史
  const getChatHistory = useCallback(async (
    conversationId: string
  ): Promise<ConversationHistory | null> => {
    if (!clientRef.current) {
      throw new Error('AI client not initialized')
    }

    try {
      const history = await clientRef.current.getChatHistory(conversationId, options.userId)
      setState(prev => ({ ...prev, conversationHistory: history }))
      return history

    } catch (error) {
      setError(error.message)
      return null
    }
  }, [options.userId, setError])

  // 清除对话
  const clearChat = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!clientRef.current) {
      throw new Error('AI client not initialized')
    }

    try {
      const result = await clientRef.current.clearChat(conversationId, options.userId)

      if (result.success) {
        setState(prev => ({ ...prev, conversationHistory: null }))
      }

      return result.success

    } catch (error) {
      setError(error.message)
      return false
    }
  }, [options.userId, setError])

  // 文本分析
  const analyzeText = useCallback(async (
    text: string,
    analysisType: 'summary' | 'sentiment' | 'keywords' | 'topics'
  ): Promise<string> => {
    if (!clientRef.current) {
      throw new Error('AI client not initialized')
    }

    setLoading(true)
    setError(null)

    try {
      const result = await clientRef.current.analyzeText(text, analysisType)

      setResponse({
        success: true,
        requestId: `analysis_${Date.now()}`,
        provider: 'analysis',
        model: 'analysis',
        content: result,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        responseTime: 0,
        timestamp: new Date(),
        metadata: {
          routingDecision: null,
          fallbackUsed: false,
          performanceScore: 1,
          costEfficiency: 1,
          qualityScore: 1
        }
      })

      return result

    } catch (error) {
      setError(error.message)
      throw error
    }
  }, [setLoading, setError, setResponse])

  // 文本翻译
  const translateText = useCallback(async (
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> => {
    if (!clientRef.current) {
      throw new Error('AI client not initialized')
    }

    setLoading(true)
    setError(null)

    try {
      const result = await clientRef.current.translateText(text, targetLanguage, sourceLanguage)

      setResponse({
        success: true,
        requestId: `translate_${Date.now()}`,
        provider: 'translation',
        model: 'translation',
        content: result,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        responseTime: 0,
        timestamp: new Date(),
        metadata: {
          routingDecision: null,
          fallbackUsed: false,
          performanceScore: 1,
          costEfficiency: 1,
          qualityScore: 1
        }
      })

      return result

    } catch (error) {
      setError(error.message)
      throw error
    }
  }, [setLoading, setError, setResponse])

  // 文本重写
  const rewriteText = useCallback(async (
    text: string,
    style: 'formal' | 'casual' | 'professional' | 'creative' | 'simple',
    rewriteOptions?: {
      length?: 'shorter' | 'same' | 'longer'
      targetAudience?: string
    }
  ): Promise<string> => {
    if (!clientRef.current) {
      throw new Error('AI client not initialized')
    }

    setLoading(true)
    setError(null)

    try {
      const result = await clientRef.current.rewriteText(text, style, rewriteOptions)

      setResponse({
        success: true,
        requestId: `rewrite_${Date.now()}`,
        provider: 'rewriting',
        model: 'rewriting',
        content: result,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
        responseTime: 0,
        timestamp: new Date(),
        metadata: {
          routingDecision: null,
          fallbackUsed: false,
          performanceScore: 1,
          costEfficiency: 1,
          qualityScore: 1
        }
      })

      return result

    } catch (error) {
      setError(error.message)
      throw error
    }
  }, [setLoading, setError, setResponse])

  // 流式文本生成
  const streamText = useCallback(async (
    prompt: string,
    streamOptions?: {
      onChunk?: (chunk: any) => void
      onComplete?: (fullText: string) => void
      onError?: (error: Error) => void
    }
  ): Promise<void> => {
    if (!clientRef.current) {
      throw new Error('AI client not initialized')
    }

    setLoading(true)
    setError(null)

    try {
      let fullText = ''

      for await (const chunk of clientRef.current.generateTextStream({
        prompt,
        userId: options.userId || 'anonymous',
        preferences: options.defaultPreferences
      })) {
        if (chunk.type === 'chunk' && chunk.content) {
          fullText += chunk.content
          streamOptions?.onChunk?.(chunk)
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error || 'Stream error')
        } else if (chunk.type === 'end') {
          setResponse({
            success: true,
            requestId: chunk.requestId,
            provider: chunk.metadata?.provider || 'stream',
            model: chunk.metadata?.model || 'stream',
            content: fullText,
            usage: chunk.metadata?.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 },
            responseTime: 0,
            timestamp: new Date(),
            metadata: {
              routingDecision: null,
              fallbackUsed: false,
              performanceScore: 1,
              costEfficiency: 1,
              qualityScore: 1
            }
          })

          streamOptions?.onComplete?.(fullText)
          break
        }
      }

    } catch (error) {
      setError(error.message)
      streamOptions?.onError?.(error as Error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [options.userId, options.defaultPreferences, setLoading, setError, setResponse])

  // 重置状态
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      response: null,
      conversationHistory: null
    })
  }, [])

  return {
    ...state,
    generateText,
    generateTextConcurrent,
    continueChat,
    getChatHistory,
    clearChat,
    analyzeText,
    translateText,
    rewriteText,
    streamText,
    reset
  }
}

// 便捷的聊天Hook
export function useChat(conversationId: string, options: UseAIOptions = {}) {
  const ai = useAI(options)
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>>([])

  // 加载对话历史
  useEffect(() => {
    if (conversationId) {
      ai.getChatHistory(conversationId).then(history => {
        if (history) {
          setMessages(history.messages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.timestamp
          })))
        }
      })
    }
  }, [conversationId, ai])

  const sendMessage = useCallback(async (message: string): Promise<string> => {
    // 添加用户消息
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const response = await ai.continueChat(conversationId, message)

      // 添加AI回复
      const assistantMessage = {
        role: 'assistant' as const,
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      return response

    } catch (error) {
      // 移除用户消息（如果发送失败）
      setMessages(prev => prev.slice(0, -1))
      throw error
    }
  }, [conversationId, ai])

  const clearMessages = useCallback(async (): Promise<boolean> => {
    const success = await ai.clearChat(conversationId)
    if (success) {
      setMessages([])
    }
    return success
  }, [conversationId, ai])

  return {
    ...ai,
    messages,
    sendMessage,
    clearMessages
  }
}

export default useAI