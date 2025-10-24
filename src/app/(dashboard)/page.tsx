/**
 * Dashboard Home Page
 *
 * Main dashboard page that provides an overview of user's notes,
 * statistics, quick actions, and recent activity.
 *
 * This page integrates all the UI components we've created:
 * - Dashboard component for overview
 * - NoteEditor for creating/editing notes
 * - NoteList for displaying notes
 * - SearchBar for search functionality
 * - BaseChart for data visualization
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */

'use client';

import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { NoteEditor } from '@/components/note/note-editor-new';
import type { DashboardStats, ActivityItem } from '@/components/dashboard/dashboard';
import type { Note } from '@/types/note';

// Mock data for demonstration - in real app this would come from API
const mockDashboardStats: DashboardStats = {
  totalNotes: 150,
  recentNotes: 25,
  totalTags: 45,
  storageUsed: '2.3 GB',
  storageLimit: '5 GB',
  popularTags: ['react', 'typescript', 'javascript', 'css', 'html', 'node.js', 'python', 'ai'],
  quickStats: {
    thisWeek: 12,
    thisMonth: 48,
    lastMonth: 35
  }
};

const mockRecentNotes: Note[] = [
  {
    id: '1',
    title: 'React Hooks最佳实践指南',
    content: '本文档介绍了React Hooks的最佳实践，包括useState、useEffect、useContext等常用Hooks的使用方法和注意事项...',
    summary: '详细介绍React Hooks的最佳实践和使用技巧',
    tags: ['react', 'javascript', 'hooks'],
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-22')
  },
  {
    id: '2',
    title: 'TypeScript高级类型系统',
    content: 'TypeScript的类型系统非常强大，本文档深入探讨了泛型、条件类型、映射类型等高级特性...',
    summary: '深入理解TypeScript的高级类型系统和应用',
    tags: ['typescript', 'javascript', 'types'],
    createdAt: new Date('2025-01-19'),
    updatedAt: new Date('2025-01-21')
  },
  {
    id: '3',
    title: 'CSS Grid布局完全指南',
    content: 'CSS Grid是一个强大的二维布局系统，本文档全面介绍了Grid布局的各种属性和使用场景...',
    summary: 'CSS Grid布局系统的完整使用指南',
    tags: ['css', 'html', 'layout'],
    createdAt: new Date('2025-01-18'),
    updatedAt: new Date('2025-01-20')
  },
  {
    id: '4',
    title: 'Node.js性能优化技巧',
    content: 'Node.js应用性能优化是一个重要话题，本文档介绍了内存管理、异步处理、缓存策略等优化技巧...',
    summary: 'Node.js应用性能优化的实用技巧和最佳实践',
    tags: ['node.js', 'performance', 'backend'],
    createdAt: new Date('2025-01-17'),
    updatedAt: new Date('2025-01-19')
  },
  {
    id: '5',
    title: 'AI驱动的智能搜索实现',
    content: '现代搜索引擎越来越多地使用AI技术来提升搜索结果的相关性和用户体验...',
    summary: 'AI技术在搜索引擎中的应用和实现方法',
    tags: ['ai', 'search', 'machine-learning'],
    createdAt: new Date('2025-01-16'),
    updatedAt: new Date('2025-01-18')
  }
];

const mockRecentActivity: ActivityItem[] = [
  {
    id: '1',
    action: 'created',
    target: 'React Hooks最佳实践指南',
    timestamp: new Date('2025-01-22T10:30:00')
  },
  {
    id: '2',
    action: 'updated',
    target: 'TypeScript高级类型系统',
    timestamp: new Date('2025-01-22T09:15:00')
  },
  {
    id: '3',
    action: 'created',
    target: 'AI驱动的智能搜索实现',
    timestamp: new Date('2025-01-21T16:45:00')
  },
  {
    id: '4',
    action: 'updated',
    target: 'CSS Grid布局完全指南',
    timestamp: new Date('2025-01-21T14:20:00')
  },
  {
    id: '5',
    action: 'shared',
    target: 'Node.js性能优化技巧',
    timestamp: new Date('2025-01-21T11:30:00')
  },
  {
    id: '6',
    action: 'created',
    target: '项目总结报告',
    timestamp: new Date('2025-01-20T17:00:00')
  },
  {
    id: '7',
    action: 'updated',
    target: '会议纪要 - Q1规划',
    timestamp: new Date('2025-01-20T13:15:00')
  },
  {
    id: '8',
    action: 'created',
    target: '代码审查清单',
    timestamp: new Date('2025-01-20T10:45:00')
  }
];

export default function DashboardHomePage() {
  // State management
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

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

    console.log('Saving note:', data);
    setLoading(false);
    setShowNoteEditor(false);
    setSelectedNote(null);

    // In real app, would refresh the dashboard data
  }, []);

  const handleCancelEdit = useCallback(() => {
    setShowNoteEditor(false);
    setSelectedNote(null);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    console.log('Searching for:', query);
    // In real app, would perform search and update results
  }, []);

  const handleNoteClick = useCallback((note: Note) => {
    // Navigate to note detail page or open in editor
    console.log('Note clicked:', note);
    handleEditNote(note);
  }, [handleEditNote]);

  const handleImport = useCallback(() => {
    console.log('Import functionality');
    // In real app, would open file picker or import dialog
  }, []);

  const handleExport = useCallback(() => {
    console.log('Export functionality');
    // In real app, would open export dialog
  }, []);

  const handleViewAllNotes = useCallback(() => {
    // Navigate to notes page
    console.log('View all notes');
    // In real app, would use router navigation
  }, []);

  // Simulate loading state on mount
  useEffect(() => {
    setLoading(true);
    setNotesLoading(true);

    // Simulate data loading
    const timer = setTimeout(() => {
      setLoading(false);
      setNotesLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Main Dashboard View */}
      {!showNoteEditor ? (
        <Dashboard
          userName="用户"
          stats={mockDashboardStats}
          recentNotes={mockRecentNotes}
          activity={mockRecentActivity}
          loading={loading}
          notesLoading={notesLoading}
          onCreateNote={handleCreateNote}
          onSearch={handleSearch}
          onNoteClick={handleNoteClick}
          onNoteEdit={handleEditNote}
          onNoteDelete={(note) => console.log('Delete note:', note)}
          onImport={handleImport}
          onExport={handleExport}
          onViewAllNotes={handleViewAllNotes}
        />
      ) : (
        /* Note Editor View */
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <button
              onClick={handleCancelEdit}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 返回仪表板
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
      )}
    </div>
  );
}