/**
 * Safe Mermaid Renderer Component
 *
 * Secure custom renderer for Mermaid diagrams in Markdown
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'

interface MermaidRendererProps {
  chart: string
  id?: string
  className?: string
}

export function MermaidRenderer({ chart, id, className = '' }: MermaidRendererProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize Mermaid configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#1f2937',
        primaryBorderColor: '#e5e7eb',
        lineColor: '#6b7280',
        secondaryColor: '#10b981',
        tertiaryColor: '#f59e0b',
        background: '#ffffff',
        mainBkg: '#f9fafb',
        secondBkg: '#f3f4f6',
        tertiaryBkg: '#e5e7eb'
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      securityLevel: 'loose', // Allow HTML in labels for better customization
      fontFamily: 'system-ui, -apple-system, sans-serif'
    })
  }, [])

  useEffect(() => {
    if (!elementRef.current || !chart) return

    const renderDiagram = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`

        // Clear previous content safely
        if (elementRef.current) {
          elementRef.current.textContent = ''
        }

        // Render the diagram
        const { svg } = await mermaid.render(diagramId, chart)

        // Sanitize SVG before setting it
        const sanitizedSvg = DOMPurify.sanitize(svg, {
          ALLOWED_TAGS: ['svg', 'g', 'path', 'rect', 'text', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'defs', 'marker', 'style'],
          ALLOWED_ATTR: ['class', 'id', 'd', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points', 'viewBox', 'transform', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'text-anchor', 'font-size', 'font-family', 'font-weight', 'opacity'],
          ALLOW_DATA_ATTR: false
        })

        if (elementRef.current) {
          // Use a temporary element to parse HTML safely
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = sanitizedSvg

          // Move nodes to the actual element
          while (tempDiv.firstChild) {
            elementRef.current.appendChild(tempDiv.firstChild)
          }

          // Apply responsive styles
          const svgElement = elementRef.current.querySelector('svg')
          if (svgElement) {
            svgElement.style.maxWidth = '100%'
            svgElement.style.height = 'auto'
            svgElement.style.display = 'block'
            svgElement.style.margin = '0 auto'
          }
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError(err instanceof Error ? err.message : '渲染图表时发生错误')

        // Show error message safely
        if (elementRef.current) {
          const errorDiv = document.createElement('div')
          errorDiv.className = 'flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg'

          const contentDiv = document.createElement('div')
          contentDiv.className = 'text-center'

          const titleDiv = document.createElement('div')
          titleDiv.className = 'text-red-600 font-medium mb-2'
          titleDiv.textContent = '图表渲染失败'

          const messageDiv = document.createElement('div')
          messageDiv.className = 'text-red-500 text-sm'
          messageDiv.textContent = err instanceof Error ? err.message : '未知错误'

          contentDiv.appendChild(titleDiv)
          contentDiv.appendChild(messageDiv)

          // Add details section
          const details = document.createElement('details')
          details.className = 'mt-2 text-left'

          const summary = document.createElement('summary')
          summary.className = 'text-red-400 text-xs cursor-pointer hover:text-red-300'
          summary.textContent = '查看原始代码'

          const pre = document.createElement('pre')
          pre.className = 'mt-2 p-2 bg-red-900 text-red-100 rounded text-xs overflow-x-auto'
          pre.textContent = chart

          details.appendChild(summary)
          details.appendChild(pre)
          contentDiv.appendChild(details)
          errorDiv.appendChild(contentDiv)

          elementRef.current.textContent = ''
          elementRef.current.appendChild(errorDiv)
        }
      } finally {
        setIsLoading(false)
      }
    }

    renderDiagram()
  }, [chart, id])

  if (!chart) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="text-gray-500 text-sm">空的Mermaid图表</div>
      </div>
    )
  }

  return (
    <div className={`mermaid-container ${className}`}>
      {isLoading && (
        <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-blue-600 text-sm">正在渲染图表...</div>
        </div>
      )}
      <div ref={elementRef} className="mermaid-diagram" />

      <style jsx>{`
        .mermaid-container {
          margin: 1rem 0;
          text-align: center;
          overflow-x: auto;
        }

        .mermaid-diagram {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
        }

        .mermaid-diagram svg {
          max-width: 100%;
          height: auto;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .mermaid-diagram :global(.node rect) {
            fill: #1f2937 !important;
            stroke: #374151 !important;
          }

          .mermaid-diagram :global(.node text) {
            fill: #f9fafb !important;
          }

          .mermaid-diagram :global(.edgePath path) {
            stroke: #6b7280 !important;
          }
        }
      `}</style>
    </div>
  )
}

export default MermaidRenderer