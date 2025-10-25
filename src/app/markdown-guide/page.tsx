/**
 * Markdown Guide Page
 *
 * Comprehensive guide for using the Markdown editor
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CodeIcon,
  CheckCircleIcon,
  StarIcon,
  CopyIcon,
  ExternalLinkIcon
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function MarkdownGuidePage() {
  const { toast } = useToast()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: '复制成功',
        description: '代码已复制到剪贴板'
      })
    })
  }

  const basicSyntax = [
    {
      name: '标题',
      syntax: '# H1\n## H2\n### H3',
      description: '创建不同级别的标题',
      example: '# 这是一级标题\n## 这是二级标题\n### 这是三级标题'
    },
    {
      name: '强调',
      syntax: '**粗体** *斜体* ~~删除线~~',
      description: '强调文本内容',
      example: '**这是粗体文本** *这是斜体文本* ~~这是删除线文本~~'
    },
    {
      name: '列表',
      syntax: '- 项目\n1. 有序项目',
      description: '创建有序和无序列表',
      example: '- 无序列表项1\n- 无序列表项2\n\n1. 有序列表项1\n2. 有序列表项2'
    },
    {
      name: '链接',
      syntax: '[文本](URL)',
      description: '创建超链接',
      example: '[访问OpenAI](https://openai.com)'
    },
    {
      name: '图片',
      syntax: '![alt](URL)',
      description: '插入图片',
      example: '![示例图片](https://via.placeholder.com/300x200)'
    },
    {
      name: '代码',
      syntax: '`行内代码` ```代码块```',
      description: '显示代码',
      example: '`console.log("Hello")`\n\n```javascript\nfunction hello() {\n  console.log("Hello World");\n}\n```'
    }
  ]

  const advancedSyntax = [
    {
      name: '表格',
      syntax: '| 列1 | 列2 |\n|-----|-----|\n| 数据 | 数据 |',
      description: '创建表格',
      example: '| 功能 | 快捷键 |\n|------|--------|\n| 粗体 | Ctrl+B |\n| 斜体 | Ctrl+I |'
    },
    {
      name: '引用',
      syntax: '> 引用文本',
      description: '创建引用块',
      example: '> 这是一段引用文本\n> 可以是多行引用'
    },
    {
      name: '代码块语法高亮',
      syntax: '```javascript\n代码\n```',
      description: '带语法高亮的代码块',
      example: '```javascript\nconst greeting = "Hello World";\nconsole.log(greeting);\n```'
    },
    {
      name: '任务列表',
      syntax: '- [x] 完成\n- [ ] 待办',
      description: '创建任务清单',
      example: '- [x] 学习Markdown基础\n- [ ] 练习高级语法\n- [ ] 创建自己的笔记'
    },
    {
      name: '分割线',
      syntax: '---',
      description: '创建水平分割线',
      example: '上面是内容\n---\n下面是内容'
    },
    {
      name: '脚注',
      syntax: '文本[^1]\n[^1]: 脚注内容',
      description: '添加脚注',
      example: '这里有脚注[^1]\n\n[^1]: 这是脚注的内容'
    }
  ]

  const shortcuts = [
    { key: 'Ctrl+B', action: '粗体', icon: '⚡' },
    { key: 'Ctrl+I', action: '斜体', icon: '⚡' },
    { key: 'Ctrl+K', action: '插入链接', icon: '⚡' },
    { key: 'Tab', action: '缩进', icon: '⚡' },
    { key: 'Shift+Tab', action: '取消缩进', icon: '⚡' }
  ]

  const tips = [
    {
      title: '保持简洁',
      description: 'Markdown的设计理念是让人们专注于写作而不是排版，尽量保持文档结构简洁清晰。',
      icon: '✨'
    },
    {
      title: '预览功能',
      description: '使用实时预览功能来查看最终效果，避免格式错误。',
      icon: '👁️'
    },
    {
      title: '备份重要内容',
      description: '定期备份重要的Markdown文档，防止意外丢失。',
      icon: '💾'
    },
    {
      title: '练习常用语法',
      description: '熟练掌握常用的Markdown语法，可以大大提高写作效率。',
      icon: '📚'
    }
  ]

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <BookOpenIcon className="h-8 w-8 text-blue-600 mr-3" />
          <h1 className="text-4xl font-bold text-gray-900">Markdown 使用指南</h1>
        </div>
        <p className="text-xl text-gray-600 mb-6">
          掌握Markdown语法，提高笔记写作效率
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/markdown-demo">
            <Button>
              <CodeIcon className="h-4 w-4 mr-2" />
              试试编辑器
            </Button>
          </Link>
          <Link href="/notes">
            <Button variant="outline">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              返回笔记
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">🚀</div>
            <div className="text-2xl font-bold text-blue-600">快速</div>
            <div className="text-sm text-gray-600">学习简单</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-green-600">专注</div>
            <div className="text-sm text-gray-600">内容为王</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">🔄</div>
            <div className="text-2xl font-bold text-purple-600">兼容</div>
            <div className="text-sm text-gray-600">随处可用</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold text-orange-600">高效</div>
            <div className="text-sm text-gray-600">写作加速</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Syntax */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <StarIcon className="h-5 w-5 mr-2 text-yellow-500" />
                基础语法
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {basicSyntax.map((item, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(item.syntax)}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-gray-600 mb-2">{item.description}</p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <code className="text-sm text-gray-800">{item.syntax}</code>
                    </div>
                    <div className="mt-2 p-3 bg-white border rounded-lg">
                      <div className="text-sm text-gray-700 whitespace-pre-line">{item.example}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Syntax */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpenIcon className="h-5 w-5 mr-2 text-blue-500" />
                高级语法
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {advancedSyntax.map((item, index) => (
                  <div key={index} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(item.syntax)}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-gray-600 mb-2">{item.description}</p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <code className="text-sm text-gray-800">{item.syntax}</code>
                    </div>
                    <div className="mt-2 p-3 bg-white border rounded-lg">
                      <div className="text-sm text-gray-700 whitespace-pre-line">{item.example}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CodeIcon className="h-5 w-5 mr-2 text-green-500" />
                快捷键
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <span>{shortcut.icon}</span>
                      <span className="text-sm font-medium">{shortcut.action}</span>
                    </div>
                    <Badge variant="outline">{shortcut.key}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2 text-purple-500" />
                使用技巧
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tips.map((tip, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">{tip.icon}</span>
                      <div>
                        <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                        <p className="text-xs text-gray-600">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ExternalLinkIcon className="h-5 w-5 mr-2 text-orange-500" />
                学习资源
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a
                  href="https://www.markdownguide.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm">Markdown 官方指南</span>
                  <ExternalLinkIcon className="h-3 w-3 text-gray-400" />
                </a>
                <a
                  href="https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm">Markdown 速查表</span>
                  <ExternalLinkIcon className="h-3 w-3 text-gray-400" />
                </a>
                <a
                  href="https://commonmark.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm">CommonMark 规范</span>
                  <ExternalLinkIcon className="h-3 w-3 text-gray-400" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">准备好开始了吗？</h2>
            <p className="text-gray-600 mb-6">
              现在你已经了解了Markdown的基础知识，开始创建你的第一个Markdown笔记吧！
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/markdown-demo">
                <Button size="lg">
                  <CodeIcon className="h-4 w-4 mr-2" />
                  开始练习
                </Button>
              </Link>
              <Link href="/notes/new">
                <Button size="lg" variant="outline">
                  <BookOpenIcon className="h-4 w-4 mr-2" />
                  创建笔记
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}