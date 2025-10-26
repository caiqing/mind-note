/**
 * 简化版笔记列表页面
 *
 * 使用纯CSS实现，无UI组件库依赖
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NoteCard from '@/components/notes/note-card';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  tags: string[];
  wordCount?: number;
  readingTimeMinutes?: number;
  viewCount?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_LIMIT = 12;

export default function SimpleNotesPage() {
  const router = useRouter();

  // State
  const [notes, setNotes] = useState<Note[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/notes?page=${pagination.page}&limit=${pagination.limit}&search=${encodeURIComponent(searchTerm)}&sortBy=updatedAt&sortOrder=desc`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setNotes(data.notes || []);
      setPagination({
        ...pagination,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      });
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      alert('获取笔记失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  // Initial data fetch
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  // Handle new note
  const handleNewNote = useCallback(() => {
    router.push('/notes/new');
  }, [router]);

  // Handle note actions
  const handleNoteEdit = useCallback(
    (noteId: string) => {
      router.push(`/notes/${noteId}/edit`);
    },
    [router],
  );

  const handleNoteDelete = useCallback((noteId: string) => {
    if (confirm('确定要删除这篇笔记吗？')) {
      // 模拟删除操作
      setNotes(prev => prev.filter(note => note.id !== noteId));
      console.log(`Delete note ${noteId}`);
    }
  }, []);

  const handleToggleFavorite = useCallback((noteId: string) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === noteId ? { ...note, isFavorite: !note.isFavorite } : note,
      ),
    );
    console.log(`Toggle favorite for note ${noteId}`);
  }, []);

  const handleToggleArchive = useCallback((noteId: string) => {
    setNotes(prev =>
      prev.map(note =>
        note.id === noteId ? { ...note, isArchived: !note.isArchived } : note,
      ),
    );
    console.log(`Toggle archive for note ${noteId}`);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0,
                marginBottom: '0.5rem',
              }}
            >
              我的笔记
            </h1>
            <p
              style={{
                color: '#6b7280',
                margin: 0,
                fontSize: '0.875rem',
              }}
            >
              共 {pagination.total} 篇笔记
            </p>
          </div>

          <button
            onClick={handleNewNote}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            onMouseOver={e => {
              e.target.style.backgroundColor = '#2563eb';
            }}
            onMouseOut={e => {
              e.target.style.backgroundColor = '#3b82f6';
            }}
          >
            <span style={{ fontSize: '1rem' }}>+</span>
            新建笔记
          </button>
        </div>

        {/* Search Bar */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            boxShadow:
              '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '400px',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                fontSize: '1rem',
              }}
            >
              🔍
            </span>
            <input
              type='text'
              placeholder='搜索笔记...'
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#374151',
                backgroundColor: 'white',
                outline: 'none',
                transition:
                  'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Notes Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {loading ? (
            // Loading skeleton
            Array.from({ length: DEFAULT_LIMIT }).map((_, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  boxShadow:
                    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              >
                <div
                  style={{
                    height: '1.5rem',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '0.375rem',
                    marginBottom: '1rem',
                  }}
                ></div>
                <div
                  style={{
                    height: '1rem',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '0.375rem',
                    marginBottom: '0.5rem',
                  }}
                ></div>
                <div
                  style={{
                    height: '1rem',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '0.375rem',
                    width: '80%',
                  }}
                ></div>
              </div>
            ))
          ) : notes.length > 0 ? (
            notes.map(note => (
              <NoteCard
                key={note.id}
                note={{
                  ...note,
                  tags: note.tags || [],
                  wordCount: note.wordCount || note.content.length,
                  readingTimeMinutes:
                    note.readingTimeMinutes ||
                    Math.ceil(note.content.length / 200),
                  viewCount: note.viewCount || 0,
                }}
                onEdit={handleNoteEdit}
                onDelete={handleNoteDelete}
                onToggleFavorite={handleToggleFavorite}
                onToggleArchive={handleToggleArchive}
              />
            ))
          ) : (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '3rem 1rem',
              }}
            >
              <div
                style={{
                  fontSize: '3rem',
                  marginBottom: '1rem',
                  opacity: '0.5',
                }}
              >
                📝
              </div>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: '0.5rem',
                }}
              >
                {searchTerm ? '没有找到匹配的笔记' : '还没有笔记'}
              </h3>
              <p
                style={{
                  color: '#6b7280',
                  marginBottom: '1.5rem',
                }}
              >
                {searchTerm ? '尝试调整搜索条件' : '创建你的第一个笔记吧'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleNewNote}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseOver={e => {
                    e.target.style.backgroundColor = '#2563eb';
                  }}
                  onMouseOut={e => {
                    e.target.style.backgroundColor = '#3b82f6';
                  }}
                >
                  新建笔记
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {notes.length > 0 && pagination.totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                backgroundColor: pagination.page <= 1 ? '#f9fafb' : 'white',
                color: pagination.page <= 1 ? '#9ca3af' : '#374151',
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                if (pagination.page > 1) {
                  e.target.style.backgroundColor = '#f3f4f6';
                }
              }}
              onMouseOut={e => {
                e.target.style.backgroundColor =
                  pagination.page <= 1 ? '#f9fafb' : 'white';
              }}
            >
              上一页
            </button>

            <span
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
              }}
            >
              第 {pagination.page} 页，共 {pagination.totalPages} 页
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                backgroundColor:
                  pagination.page >= pagination.totalPages
                    ? '#f9fafb'
                    : 'white',
                color:
                  pagination.page >= pagination.totalPages
                    ? '#9ca3af'
                    : '#374151',
                cursor:
                  pagination.page >= pagination.totalPages
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                if (pagination.page < pagination.totalPages) {
                  e.target.style.backgroundColor = '#f3f4f6';
                }
              }}
              onMouseOut={e => {
                e.target.style.backgroundColor =
                  pagination.page >= pagination.totalPages
                    ? '#f9fafb'
                    : 'white';
              }}
            >
              下一页
            </button>
          </div>
        )}

        {/* Debug Info */}
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            color: '#6b7280',
          }}
        >
          <p>
            <strong>调试信息:</strong>
          </p>
          <p>当前页码: {pagination.page}</p>
          <p>每页条数: {pagination.limit}</p>
          <p>总条数: {pagination.total}</p>
          <p>总页数: {pagination.totalPages}</p>
          <p>搜索词: "{searchTerm}"</p>
          <p>加载状态: {loading ? '加载中...' : '已完成'}</p>
          <p>笔记数量: {notes.length}</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
