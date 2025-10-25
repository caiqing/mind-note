/**
 * AI功能演示面板
 * 展示AI服务的各种功能和用法
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useAI, useChat } from '@/hooks/use-ai'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface DemoPanelProps {
  userId?: string
}

export default function AIDemoPanel({ userId = 'demo_user' }: DemoPanelProps) {
  // 使用AI基础功能
  const ai = useAI({ userId })

  // 使用聊天功能
  const chat = useChat(`demo_conversation_${Date.now()}`, { userId })

  // 状态管理
  const [activeTab, setActiveTab] = useState<'generate' | 'chat' | 'analyze' | 'translate' | 'stream'>('generate')
  const [prompt, setPrompt] = useState('')
  const [analysisText, setAnalysisText] = useState('')
  const [translateText, setTranslateText] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('English')
  const [streamContent, setStreamContent] = useState('')
  const [results, setResults] = useState<any[]>([])

  // 添加结果到历史记录
  const addResult = (type: string, input: string, output: string, metadata?: any) => {
    const result = {
      id: Date.now().toString(),
      type,
      input,
      output,
      timestamp: new Date(),
      metadata
    }
    setResults(prev => [result, ...prev.slice(0, 9)]) // 保留最新10条
  }

  // 文本生成
  const handleGenerate = async () => {
    if (!prompt.trim()) return

    try {
      const response = await ai.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 500,
        preferences: { quality: 'good', speed: 'medium' }
      })

      addResult('生成文本', prompt, response.content, {
        provider: response.provider,
        model: response.model,
        responseTime: response.responseTime
      })

      setPrompt('')

    } catch (error) {
      console.error('生成失败:', error)
    }
  }

  // 发送聊天消息
  const handleSendMessage = async () => {
    if (!prompt.trim()) return

    try {
      await chat.sendMessage(prompt)
      setPrompt('')
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }

  // 文本分析
  const handleAnalyze = async (type: 'summary' | 'sentiment' | 'keywords' | 'topics') => {
    if (!analysisText.trim()) return

    try {
      const result = await ai.analyzeText(analysisText, type)

      addResult(`文本分析-${type}`, analysisText, result)

    } catch (error) {
      console.error('分析失败:', error)
    }
  }

  // 文本翻译
  const handleTranslate = async () => {
    if (!translateText.trim()) return

    try {
      const result = await ai.translateText(translateText, targetLanguage)

      addResult('翻译', `${translateText} -> ${targetLanguage}`, result)

      setTranslateText('')

    } catch (error) {
      console.error('翻译失败:', error)
    }
  }

  // 流式生成
  const handleStream = async () => {
    if (!prompt.trim()) return

    try {
      setStreamContent('')

      await ai.streamText(prompt, {
        onChunk: (chunk) => {
          if (chunk.type === 'chunk' && chunk.content) {
            setStreamContent(prev => prev + chunk.content)
          }
        },
        onComplete: (fullText) => {
          addResult('流式生成', prompt, fullText)
          setPrompt('')
          setStreamContent('')
        },
        onError: (error) => {
          console.error('流式生成失败:', error)
        }
      })

    } catch (error) {
      console.error('流式生成失败:', error)
    }
  }

  // 清除结果历史
  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">MindNote AI 功能演示</h1>
        <p className="text-gray-600">体验强大的AI功能，包括文本生成、对话、分析和翻译</p>
      </div>

      {/* 状态指示器 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${ai.loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">
                {ai.loading ? '处理中...' : '就绪'}
              </span>
            </div>
            {ai.error && (
              <div className="text-sm text-red-600">
                错误: {ai.error}
              </div>
            )}
          </div>
          <button
            onClick={clearResults}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            清除历史
          </button>
        </div>
      </div>

      {/* 功能标签页 */}
      <div className="flex space-x-1 mb-6 border-b">
        {[
          { id: 'generate', label: '文本生成', icon: '✍️' },
          { id: 'chat', label: '智能对话', icon: '💬' },
          { id: 'analyze', label: '文本分析', icon: '🔍' },
          { id: 'translate', label: '语言翻译', icon: '🌐' },
          { id: 'stream', label: '流式输出', icon: '📡' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 功能面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 输入面板 */}
        <div className="space-y-4">
          {/* 文本生成面板 */}
          {activeTab === 'generate' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">文本生成</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入您想要AI生成内容的提示词..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleGenerate}
                  disabled={ai.loading || !prompt.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {ai.loading ? '生成中...' : '生成文本'}
                </button>
                <button
                  onClick={() => ai.generateTextConcurrent(prompt, 3)}
                  disabled={ai.loading || !prompt.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  并发生成
                </button>
              </div>
            </div>
          )}

          {/* 聊天面板 */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">智能对话</h3>
              <div className="h-64 p-3 border border-gray-300 rounded-lg overflow-y-auto bg-gray-50">
                {chat.messages.length === 0 ? (
                  <div className="text-gray-500 text-center">开始对话吧！</div>
                ) : (
                  <div className="space-y-2">
                    {chat.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-100 ml-8'
                            : 'bg-green-100 mr-8'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          {message.role === 'user' ? '您' : 'AI助手'}
                        </div>
                        <div className="text-gray-800">{message.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入您的消息..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={chat.loading || !prompt.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  发送
                </button>
              </div>
            </div>
          )}

          {/* 文本分析面板 */}
          {activeTab === 'analyze' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">文本分析</h3>
              <textarea
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
                placeholder="输入要分析的文本..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAnalyze('summary')}
                  disabled={ai.loading || !analysisText.trim()}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  摘要
                </button>
                <button
                  onClick={() => handleAnalyze('sentiment')}
                  disabled={ai.loading || !analysisText.trim()}
                  className="px-3 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  情感分析
                </button>
                <button
                  onClick={() => handleAnalyze('keywords')}
                  disabled={ai.loading || !analysisText.trim()}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  关键词
                </button>
                <button
                  onClick={() => handleAnalyze('topics')}
                  disabled={ai.loading || !analysisText.trim()}
                  className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  主题识别
                </button>
              </div>
            </div>
          )}

          {/* 翻译面板 */}
          {activeTab === 'translate' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">语言翻译</h3>
              <textarea
                value={translateText}
                onChange={(e) => setTranslateText(e.target.value)}
                placeholder="输入要翻译的文本..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <div className="flex space-x-2">
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="English">英语</option>
                  <option value="Chinese">中文</option>
                  <option value="Japanese">日语</option>
                  <option value="Korean">韩语</option>
                  <option value="French">法语</option>
                  <option value="German">德语</option>
                  <option value="Spanish">西班牙语</option>
                </select>
                <button
                  onClick={handleTranslate}
                  disabled={ai.loading || !translateText.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  翻译
                </button>
              </div>
            </div>
          )}

          {/* 流式输出面板 */}
          {activeTab === 'stream' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">流式输出</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入提示词，体验实时流式输出..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <button
                onClick={handleStream}
                disabled={ai.loading || !prompt.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {ai.loading ? '流式生成中...' : '开始流式生成'}
              </button>
              {streamContent && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-800 mb-2">流式输出:</div>
                  <div className="text-gray-800">{streamContent}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 结果面板 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">操作历史</h3>
          <div className="h-96 overflow-y-auto space-y-3">
            {results.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                暂无操作记录
              </div>
            ) : (
              results.map((result) => (
                <div
                  key={result.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-600">
                      {result.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>输入:</strong> {result.input.substring(0, 100)}
                    {result.input.length > 100 && '...'}
                  </div>
                  <div className="text-sm text-gray-800">
                    <strong>输出:</strong> {result.output.substring(0, 200)}
                    {result.output.length > 200 && '...'}
                  </div>
                  {result.metadata && (
                    <div className="mt-2 text-xs text-gray-500">
                      {result.metadata.provider && (
                        <span>提供商: {result.metadata.provider} | </span>
                      )}
                      {result.metadata.model && (
                        <span>模型: {result.metadata.model} | </span>
                      )}
                      {result.metadata.responseTime && (
                        <span>响应时间: {result.metadata.responseTime}ms</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-800">
          <div className="font-medium mb-2">会话统计:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>总请求: {results.length}</div>
            <div>聊天消息: {chat.messages.length}</div>
            <div>当前会话ID: {chat.messages.length > 0 ? 'active' : 'none'}</div>
            <div>用户ID: {userId}</div>
          </div>
        </div>
      </div>
    </div>
  )
}