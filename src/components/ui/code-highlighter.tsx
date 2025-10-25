/**
 * Safe Code Highlighter Component
 *
 * Lightweight and secure code syntax highlighting
 */

'use client'

import { useState } from 'react'

interface CodeHighlighterProps {
  language?: string
  children: string
  className?: string
  showLineNumbers?: boolean
  maxHeight?: number
}

export function CodeHighlighter({
  language = '',
  children,
  className = '',
  showLineNumbers = true,
  maxHeight = 400
}: CodeHighlighterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Parse code into tokens safely
  const parseCodeTokens = (code: string, lang: string) => {
    const lines = code.split('\n')
    return lines.map(line => {
      // Simple tokenization for basic syntax highlighting
      const tokens: Array<{
        type: 'keyword' | 'string' | 'number' | 'comment' | 'identifier' | 'operator' | 'text'
        value: string
        className: string
      }> = []

      let currentIndex = 0
      const lineLength = line.length

      while (currentIndex < lineLength) {
        const remaining = line.slice(currentIndex)

        // Check for comments first
        if (remaining.startsWith('//') || remaining.startsWith('#')) {
          tokens.push({
            type: 'comment',
            value: remaining,
            className: 'text-gray-500 italic'
          })
          break
        }

        // Check for strings
        const stringMatch = remaining.match(/^["']([^"']*)["']/)
        if (stringMatch) {
          tokens.push({
            type: 'string',
            value: stringMatch[0],
            className: 'text-green-500'
          })
          currentIndex += stringMatch[0].length
          continue
        }

        // Check for numbers
        const numberMatch = remaining.match(/^\d+\.?\d*/)
        if (numberMatch) {
          tokens.push({
            type: 'number',
            value: numberMatch[0],
            className: 'text-green-600'
          })
          currentIndex += numberMatch[0].length
          continue
        }

        // Check for keywords (simplified)
        const keywordMatch = remaining.match(/^(function|const|let|var|if|else|for|while|return|class|extends|import|export|from|default|async|await|try|catch|finally|throw|new|this|super|def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|yield|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|JOIN|INNER|LEFT|RIGHT|OUTER|GROUP|ORDER|BY|HAVING|AS|AND|OR|NOT|NULL|IS|IN|EXISTS|BETWEEN|LIKE|DISTINCT|COUNT|SUM|AVG|MAX|MIN|LIMIT|OFFSET|true|false|null)\b/)
        if (keywordMatch) {
          tokens.push({
            type: 'keyword',
            value: keywordMatch[0],
            className: 'text-blue-600 font-semibold'
          })
          currentIndex += keywordMatch[0].length
          continue
        }

        // Check for identifiers
        const identifierMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)
        if (identifierMatch) {
          tokens.push({
            type: 'identifier',
            value: identifierMatch[0],
            className: 'text-gray-300'
          })
          currentIndex += identifierMatch[0].length
          continue
        }

        // Check for operators
        const operatorMatch = remaining.match(/^[+\-*/=<>!&|]+/)
        if (operatorMatch) {
          tokens.push({
            type: 'operator',
            value: operatorMatch[0],
            className: 'text-purple-400'
          })
          currentIndex += operatorMatch[0].length
          continue
        }

        // Add remaining as text
        if (currentIndex < lineLength) {
          tokens.push({
            type: 'text',
            value: line[currentIndex],
            className: 'text-gray-100'
          })
          currentIndex++
        }
      }

      return tokens
    })
  }

  const lines = children.split('\n')
  const displayLines = isExpanded ? lines : lines.slice(0, Math.min(20, lines.length))
  const showExpandButton = lines.length > 20

  return (
    <div className={`code-highlighter relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-sm font-mono rounded-t-lg">
        <div className="flex items-center space-x-2">
          {language && (
            <span className="text-gray-400">
              {language.toUpperCase()}
            </span>
          )}
          <span className="text-gray-500">
            {lines.length} lines
          </span>
        </div>
        {showExpandButton && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded"
            aria-label={isExpanded ? 'Collapse code' : 'Expand code'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Code content */}
      <div
        className="bg-gray-900 text-gray-100 font-mono text-sm overflow-x-auto"
        style={{
          maxHeight: isExpanded ? 'none' : `${maxHeight}px`,
          overflowY: isExpanded ? 'auto' : 'auto'
        }}
      >
        <table className="w-full">
          <tbody>
            {displayLines.map((line, index) => {
              const tokens = parseCodeTokens(line, language)
              const isEmpty = tokens.length === 0 || tokens.every(t => t.value === '')

              return (
                <tr key={index} className="hover:bg-gray-800">
                  {showLineNumbers && (
                    <td className="text-gray-500 text-right px-4 py-1 select-none border-r border-gray-700" style={{ minWidth: '3rem' }}>
                      {index + 1}
                    </td>
                  )}
                  <td className="px-4 py-1">
                    {isEmpty ? (
                      <span className="text-gray-500">&nbsp;</span>
                    ) : (
                      <span>
                        {tokens.map((token, tokenIndex) => (
                          <span key={tokenIndex} className={token.className}>
                            {token.value}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer for truncated code */}
      {!isExpanded && lines.length > 20 && (
        <div className="bg-gray-800 text-gray-400 text-center px-4 py-2 text-sm rounded-b-lg">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Show all {lines.length} lines
          </button>
        </div>
      )}

      <style jsx>{`
        .code-highlighter {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .code-highlighter table {
          border-collapse: collapse;
        }

        .code-highlighter td {
          vertical-align: top;
        }
      `}</style>
    </div>
  )
}

export default CodeHighlighter