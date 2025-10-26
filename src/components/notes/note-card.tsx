/**
 * T026 [US1] Create NoteCard component for note display in src/components/notes/note-card.tsx
 *
 * Simplified Card component for displaying note previews with metadata,
 * using pure CSS instead of UI component library.
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';
import Link from 'next/link';

interface NoteCardProps {
  note: {
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
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
}

export default function NoteCard({
  note,
  onEdit,
  onDelete,
  onToggleFavorite,
  onToggleArchive,
}: NoteCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleEdit = () => {
    if (onEdit) onEdit(note.id);
  };

  const handleDelete = () => {
    if (onDelete && confirm('确定要删除这篇笔记吗？')) {
      onDelete(note.id);
    }
  };

  const handleToggleFavorite = () => {
    if (onToggleFavorite) onToggleFavorite(note.id);
  };

  const handleToggleArchive = () => {
    if (onToggleArchive) onToggleArchive(note.id);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhCN,
      });
    } catch (error) {
      return new Date(dateString).toLocaleDateString('zh-CN');
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        boxShadow:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        marginBottom: '1rem',
        transition: 'box-shadow 0.2s ease-in-out',
        border: note.isArchived ? '1px solid #fca5a5' : '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow =
          '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow =
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: '1.5rem 1.5rem 0',
          borderBottom: '1px solid #f3f4f6',
          backgroundColor: note.isArchived ? '#fef2f2' : 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '0.5rem',
          }}
        >
          <Link
            href={`/notes/${note.id}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              flex: 1,
              marginRight: '1rem',
            }}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: note.isArchived ? '#6b7280' : '#111827',
                margin: 0,
                lineHeight: '1.5rem',
                textDecoration: 'none',
              }}
            >
              {note.title}
            </h3>
          </Link>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleToggleFavorite}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: note.isFavorite ? '#ef4444' : '#9ca3af',
                transition: 'color 0.2s',
                fontSize: '1.25rem',
              }}
              title={note.isFavorite ? '取消收藏' : '收藏'}
            >
              {note.isFavorite ? '❤️' : '🤍'}
            </button>
            <button
              onClick={handleToggleArchive}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: note.isArchived ? '#f59e0b' : '#9ca3af',
                transition: 'color 0.2s',
                fontSize: '1.25rem',
              }}
              title={note.isArchived ? '取消归档' : '归档'}
            >
              {note.isArchived ? '📁' : '📄'}
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: '#6b7280',
                  fontSize: '1.25rem',
                }}
                title='更多操作'
              >
                ⋮
              </button>
              {isMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow:
                      '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    zIndex: 50,
                    minWidth: '8rem',
                  }}
                >
                  <button
                    onClick={() => {
                      handleEdit();
                      setIsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#374151',
                    }}
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    onClick={() => {
                      window.open(`/notes/${note.id}`, '_blank');
                      setIsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#374151',
                    }}
                  >
                    👁️ 查看
                  </button>
                  <hr
                    style={{
                      margin: '0.25rem 0',
                      border: 'none',
                      borderTop: '1px solid #e5e7eb',
                    }}
                  />
                  <button
                    onClick={() => {
                      handleDelete();
                      setIsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#dc2626',
                    }}
                  >
                    🗑️ 删除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: '1.5rem' }}>
        <p
          style={{
            color: '#6b7280',
            lineHeight: '1.5',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {truncateText(note.content, 150)}
        </p>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            {note.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                }}
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                }}
              >
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#9ca3af',
          }}
        >
          <span>{formatDate(note.updatedAt)}</span>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {note.wordCount && <span>{note.wordCount} 字</span>}
            {note.readingTimeMinutes && (
              <span>{note.readingTimeMinutes} 分钟</span>
            )}
            {note.viewCount && <span>{note.viewCount} 次查看</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
