/**
 * VersionHistory Component
 *
 * Shows the version history of a note with restore functionality
 * 使用纯CSS实现，无UI组件库依赖
 */

'use client';

import { useState } from 'react';

interface NoteVersion {
  id: string;
  versionNumber: number;
  title: string;
  content: string;
  changeSummary: string;
  changeType: 'create' | 'edit' | 'restore';
  changedFields: string[];
  createdAt: string;
  author: string;
}

interface VersionHistoryProps {
  noteId: string;
  currentVersion: number;
}

export function VersionHistory({
  noteId,
  currentVersion,
}: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock version history data (will be replaced with real API call)
  const [versions] = useState<NoteVersion[]>([
    {
      id: `${noteId}-v1`,
      versionNumber: 1,
      title: '示例笔记标题',
      content:
        '<h2>这是一个示例笔记</h2><p>这里是一些示例内容，支持<strong>富文本</strong>格式化。</p>',
      changeSummary: '创建笔记',
      changeType: 'create',
      changedFields: ['title', 'content'],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      author: '用户',
    },
  ]);

  const handleRestore = async (version: NoteVersion) => {
    if (version.versionNumber === currentVersion) {
      return; // Already current version
    }

    setLoading(true);
    try {
      // Mock restore operation
      console.log('Restoring to version:', version.versionNumber);

      // In real implementation, this would call the API to restore the note
      // const response = await fetch(`/api/notes/${noteId}/versions/${version.id}/restore`, {
      //   method: 'POST'
      // })

      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert(`已恢复到版本 ${version.versionNumber}`);

      // In real implementation, you would update the note content and refresh the page
    } catch (error) {
      console.error('Failed to restore version:', error);
      alert('恢复失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return '🆕';
      case 'edit':
        return '✏️';
      case 'restore':
        return '↩️';
      default:
        return '📝';
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'edit':
        return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
      case 'restore':
        return { backgroundColor: '#fed7aa', color: '#9a3412' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.5rem',
          cursor: 'pointer',
          borderBottom: isOpen ? '1px solid #e5e7eb' : 'none',
          transition: 'background-color 0.2s',
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseOver={e => {
          e.currentTarget.style.backgroundColor = '#f9fafb';
        }}
        onMouseOut={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1rem' }}>📚</span>
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0,
              }}
            >
              版本历史
            </h3>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: '500',
              }}
            >
              {versions.length} 个版本
            </span>
            <span
              style={{
                fontSize: '1rem',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                display: 'inline-block',
              }}
            >
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem 0',
              }}
            >
              <span
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                }}
              >
                加载中...
              </span>
            </div>
          ) : (
            <div
              style={{
                maxHeight: '16rem',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
            >
              <div style={{ padding: '0.75rem' }}>
                {versions.map(version => (
                  <div
                    key={version.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      marginBottom: versions.length > 1 ? '0.75rem' : '0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.25rem',
                          }}
                        >
                          <span
                            style={{
                              ...getChangeTypeColor(version.changeType),
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <span>{getChangeTypeIcon(version.changeType)}</span>
                            版本 {version.versionNumber}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                            }}
                          >
                            {new Date(version.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <h4
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#111827',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {version.title}
                        </h4>
                      </div>
                      {version.versionNumber !== currentVersion && (
                        <button
                          onClick={() => handleRestore(version)}
                          disabled={loading}
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            padding: '0.25rem 0.75rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                          onMouseOver={e => {
                            if (!loading) {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.backgroundColor = 'white';
                          }}
                        >
                          <span style={{ fontSize: '0.75rem' }}>↻</span>
                          恢复
                        </button>
                      )}
                      {version.versionNumber === currentVersion && (
                        <span
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <span style={{ fontSize: '0.75rem' }}>👁</span>
                          当前
                        </span>
                      )}
                    </div>

                    {version.changeSummary && (
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: '#4b5563',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {version.changeSummary}
                      </div>
                    )}

                    {version.changedFields.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.25rem',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {version.changedFields.map(field => (
                          <span
                            key={field}
                            style={{
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                            }}
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginBottom: '0.75rem',
                      }}
                    >
                      作者: {version.author}
                    </div>

                    <div
                      style={{
                        height: '1px',
                        backgroundColor: '#e5e7eb',
                        margin: '0.75rem 0',
                      }}
                    />

                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: '#374151',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {version.content
                        .replace(/<[^>]*>/g, '')
                        .substring(0, 200)}
                      {version.content.length > 200 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
