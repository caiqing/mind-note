/**
 * 简化版笔记编辑页面
 *
 * 使用纯CSS实现，无UI组件库依赖
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SimpleEditPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 获取笔记数据
  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      try {
        const response = await fetch(`/api/notes/${noteId}`);
        if (response.ok) {
          const data = await response.json();
          setNote(data);
          setTitle(data.title || '');
          setContent(data.content || '');
          setTags(data.tags || []);
        } else {
          setMessage('笔记不存在');
        }
      } catch (error) {
        console.error('Failed to fetch note:', error);
        setMessage('加载笔记失败');
      }
    };

    fetchNote();
  }, [noteId]);

  // 保存笔记
  const handleSave = useCallback(async () => {
    if (!noteId || !title.trim()) {
      setMessage('标题不能为空');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          tags: tags.filter(tag => tag.trim()),
        }),
      });

      if (response.ok) {
        const updatedNote = await response.json();
        setNote(updatedNote);
        setMessage('保存成功');
        setTimeout(() => setMessage(''), 2000);
      } else {
        const error = await response.json();
        setMessage(error.error || '保存失败');
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  }, [noteId, title, content, tags]);

  // 添加标签
  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  // 移除标签
  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      setTags(tags.filter(tag => tag !== tagToRemove));
    },
    [tags],
  );

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  if (!noteId) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>
            无效的笔记ID
          </h2>
          <button
            onClick={() => router.push('/notes')}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
            }}
          >
            返回笔记列表
          </button>
        </div>
      </div>
    );
  }

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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => router.push('/notes')}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              ← 返回
            </button>
            <h1
              style={{
                fontSize: '1.875rem',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0,
              }}
            >
              编辑笔记
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => router.push(`/notes/${noteId}`)}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
              }}
            >
              👁️ 查看
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: saving ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.75rem 1.5rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}
            >
              {saving ? '保存中...' : '💾 保存'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            style={{
              backgroundColor: message.includes('成功') ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${message.includes('成功') ? '#a7f3d0' : '#fca5a5'}`,
              color: message.includes('成功') ? '#065f46' : '#991b1b',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            {message}
          </div>
        )}

        {/* Main Content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 300px',
            gap: '2rem',
          }}
        >
          {/* Editor */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Title Input */}
            <div
              style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}
            >
              <input
                type='text'
                placeholder='笔记标题...'
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  border: 'none',
                  outline: 'none',
                  color: '#111827',
                }}
              />
            </div>

            {/* Content Textarea */}
            <div style={{ padding: '1.5rem' }}>
              <textarea
                placeholder='开始写作...'
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '400px',
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical',
                  fontSize: '1rem',
                  lineHeight: '1.5',
                  color: '#374151',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Tags */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                marginBottom: '1.5rem',
              }}
            >
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem',
                  marginTop: 0,
                }}
              >
                标签
              </h3>

              {/* Tag Input */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type='text'
                    placeholder='添加标签...'
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>

              {/* Tag List */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#1e40af',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '0.75rem',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Note Info */}
            {note && (
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '1rem',
                    marginTop: 0,
                  }}
                >
                  笔记信息
                </h3>

                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    lineHeight: '1.5',
                  }}
                >
                  <p style={{ margin: '0.5rem 0' }}>
                    <strong>创建时间:</strong>
                    <br />
                    {new Date(note.createdAt).toLocaleString('zh-CN')}
                  </p>
                  <p style={{ margin: '0.5rem 0' }}>
                    <strong>更新时间:</strong>
                    <br />
                    {new Date(note.updatedAt).toLocaleString('zh-CN')}
                  </p>
                  <p style={{ margin: '0.5rem 0' }}>
                    <strong>字数:</strong> {content.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
