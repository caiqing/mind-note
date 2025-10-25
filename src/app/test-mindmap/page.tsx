/**
 * Test Mind Map Functionality
 */

'use client'

import { useState } from 'react'
import MindMapBlock from '@/components/markdown/mindmap-block'

export default function TestMindMapPage() {
  const [mindMapData, setMindMapData] = useState({
    nodes: [
      {
        id: '1',
        label: '中心主题',
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: 'bold',
        type: 'default' as const,
        position: { x: 250, y: 100 }
      },
      {
        id: '2',
        label: '分支 1',
        color: '#10b981',
        fontSize: 14,
        fontWeight: 'normal',
        type: 'default' as const,
        position: { x: 100, y: 200 }
      },
      {
        id: '3',
        label: '分支 2',
        color: '#f59e0b',
        fontSize: 14,
        fontWeight: 'normal',
        type: 'default' as const,
        position: { x: 400, y: 200 }
      }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e1-3', source: '1', target: '3' }
    ]
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">思维导图功能测试</h1>

      <MindMapBlock
        data={mindMapData}
        readOnly={false}
        onSave={setMindMapData}
      />

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">当前数据结构：</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
          {JSON.stringify(mindMapData, null, 2)}
        </pre>
      </div>
    </div>
  )
}