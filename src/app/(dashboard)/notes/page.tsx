/**
 * Notes List Page
 *
 * Displays all notes in a grid or list view with search and filtering capabilities.
 * This page integrates our NoteList and SearchBar components.
 *
 * Reference: specs/003-ui-ux/tasks.md - T029
 */

'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoteList } from '@/components/note/note-list-new';
import { SearchBar } from '@/components/search/search-bar';
import { NoteEditor } from '@/components/note/note-editor-new';
import type { Note } from '@/types/note';

// Mock data for demonstration
const mockNotes: Note[] = [
  {
    id: '1',
    title: 'React Hooks最佳实践指南',
    content: '本文档介绍了React Hooks的最佳实践，包括useState、useEffect、useContext等常用Hooks的使用方法和注意事项。通过实际案例展示了如何正确使用Hooks来构建高效、可维护的React应用。',
    summary: '详细介绍React Hooks的最佳实践和使用技巧',
    tags: ['react', 'javascript', 'hooks'],
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-22')
  },
  {
    id: '2',
    title: 'TypeScript高级类型系统',
    content: 'TypeScript的类型系统非常强大，本文档深入探讨了泛型、条件类型、映射类型等高级特性。通过实际项目示例展示了如何利用TypeScript的类型系统来提升代码质量和开发效率。',
    summary: '深入理解TypeScript的高级类型系统和应用',
    tags: ['typescript', 'javascript', 'types'],
    createdAt: new Date('2025-01-19'),
    updatedAt: new Date('2025-01-21')
  },
  {
    id: '3',
    title: 'CSS Grid布局完全指南',
    content: 'CSS Grid是一个强大的二维布局系统，本文档全面介绍了Grid布局的各种属性和使用场景。从基础概念到高级技巧，帮助开发者掌握现代CSS布局技术。',
    summary: 'CSS Grid布局系统的完整使用指南',
    tags: ['css', 'html', 'layout'],
    createdAt: new Date('2025-01-18'),
    updatedAt: new Date('2025-01-20')
  },
  {
    id: '4',
    title: 'Node.js性能优化技巧',
    content: 'Node.js应用性能优化是一个重要话题，本文档介绍了内存管理、异步处理、缓存策略等优化技巧。通过实际案例展示了如何诊断和解决常见的性能问题。',
    summary: 'Node.js应用性能优化的实用技巧和最佳实践',
    tags: ['node.js', 'performance', 'backend'],
    createdAt: new Date('2025-01-17'),
    updatedAt: new Date('2025-01-19')
  },
  {
    id: '5',
    title: 'AI驱动的智能搜索实现',
    content: '现代搜索引擎越来越多地使用AI技术来提升搜索结果的相关性和用户体验。本文档探讨了自然语言处理、向量搜索、推荐算法等AI技术在搜索系统中的应用。',
    summary: 'AI技术在搜索引擎中的应用和实现方法',
    tags: ['ai', 'search', 'machine-learning'],
    createdAt: new Date('2025-01-16'),
    updatedAt: new Date('2025-01-18')
  },
  {
    id: '6',
    title: '前端性能监控方案',
    content: '本文档介绍了完整的前端性能监控方案，包括性能指标收集、实时监控、性能分析工具等。通过建立完善的性能监控体系，帮助团队及时发现和解决性能问题。',
    summary: '前端性能监控的完整解决方案和实施指南',
    tags: ['performance', 'frontend', 'monitoring'],
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-17')
  },
  {
    id: '7',
    title: '微服务架构设计模式',
    content: '微服务架构是现代分布式系统的重要设计模式。本文档详细介绍了微服务的设计原则、通信机制、数据管理、服务发现等核心概念，以及常见的架构模式和最佳实践。',
    summary: '微服务架构的设计模式和实施策略',
    tags: ['architecture', 'microservices', 'backend'],
    createdAt: new Date('2025-01-14'),
    updatedAt: new Date('2025-01-16')
  },
  {
    id: '8',
    title: '数据库查询优化实践',
    content: '数据库性能优化是后端开发的重要技能。本文档从索引设计、查询优化、执行计划分析等方面，详细介绍了数据库性能优化的各种技巧和工具。',
    summary: '数据库查询优化的实用技巧和工具',
    tags: ['database', 'optimization', 'backend'],
    createdAt: new Date('2025-01-13'),
    updatedAt: new Date('2025-01-15')
  }
];

export default function NotesPage() {
  // State management
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(mockNotes);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Event handlers
  const handleCreateNote = useCallback(() => {
    setSelectedNote(null);
    setShowNoteEditor(true);
  }, []);

  const handleEditNote = useCallback((note: Note) => {
    setSelectedNote(note);
    setShowNoteEditor(true);
  }, []);

  const handleSaveNote = useCallback(async (data: any) => {
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (selectedNote) {
      // Update existing note
      setNotes(prev => prev.map(note =>
        note.id === selectedNote.id
          ? { ...note, ...data, updatedAt: new Date() }
          : note
      ));
    } else {
      // Create new note
      const newNote: Note = {
        id: Date.now().toString(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setNotes(prev => [newNote, ...prev]);
    }

    setLoading(false);
    setShowNoteEditor(false);
    setSelectedNote(null);
  }, [selectedNote]);

  const handleCancelEdit = useCallback(() => {
    setShowNoteEditor(false);
    setSelectedNote(null);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (query.trim() === '') {
      setFilteredNotes(notes);
    } else {
      const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredNotes(filtered);
    }
  }, [notes]);

  const handleDeleteNote = useCallback(async (note: Note) => {
    if (confirm('确定要删除这篇笔记吗？')) {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setNotes(prev => prev.filter(n => n.id !== note.id));
      setFilteredNotes(prev => prev.filter(n => n.id !== note.id));

      setLoading(false);
    }
  }, []);

  // Show Note Editor if in edit mode
  if (showNoteEditor) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <button
            onClick={handleCancelEdit}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 返回笔记列表
          </button>
        </div>

        <NoteEditor
          initialTitle={selectedNote?.title || ''}
          initialContent={selectedNote?.content || ''}
          initialTags={selectedNote?.tags || []}
          onSave={handleSaveNote}
          onCancel={handleCancelEdit}
          autoSave={true}
          enableAI={true}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">我的笔记</h1>
            <p className="text-muted-foreground mt-2">
              管理和浏览您的所有智能笔记
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={handleCreateNote}>
              <Plus className="h-4 w-4 mr-2" />
              新建笔记
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          onSearch={handleSearch}
          placeholder="搜索笔记标题、内容或标签..."
          searchHistory={['react hooks', 'typescript', 'css grid', 'node.js']}
          showAdvancedSearch={true}
        />
      </div>

      {/* Notes List */}
      <div className="min-h-[400px]">
        {filteredNotes.length > 0 ? (
          <NoteList
            notes={filteredNotes}
            viewMode="grid"
            selectable={true}
            onNoteClick={handleEditNote}
            onNoteEdit={handleEditNote}
            onNoteDelete={handleDeleteNote}
            loading={loading}
          />
        ) : (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <p className="text-lg mb-4">
                {searchQuery ? '没有找到匹配的笔记' : '还没有笔记'}
              </p>
              <p className="text-sm mb-6">
                {searchQuery
                  ? '尝试使用其他关键词搜索'
                  : '创建您的第一篇笔记开始使用智能笔记功能'
                }
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateNote}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建笔记
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Search Results Summary */}
        {searchQuery && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            找到 {filteredNotes.length} 篇关于 "{searchQuery}" 的笔记
          </div>
        )}
      </div>
    </div>
  );
}
