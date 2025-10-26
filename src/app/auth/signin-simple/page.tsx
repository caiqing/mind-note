'use client';

import { useState } from 'react';

export default function SimpleSignInPage() {
  const [email, setEmail] = useState('demo@mindnote.com');
  const [password, setPassword] = useState('demo');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 模拟登录过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 简单的模拟验证
      if (email === 'demo@mindnote.com' && password === 'demo') {
        // 登录成功，重定向到笔记页面
        window.location.href = '/notes';
      } else {
        setError('邮箱或密码错误，请重试');
      }
    } catch (error) {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem',
            }}
          >
            登录 MindNote
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            使用演示账号体验智能笔记功能
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow:
              '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ space: '1rem' }}>
            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.375rem',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem',
                }}
              >
                邮箱
              </label>
              <input
                type='email'
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='demo@mindnote.com'
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem',
                }}
              >
                密码
              </label>
              <input
                type='password'
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='demo'
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <button
              type='submit'
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
                color: 'white',
                fontWeight: '500',
                borderRadius: '0.375rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                transition: 'background-color 0.2s',
              }}
            >
              {isLoading ? '登录中...' : '登录'}
            </button>

            <div
              style={{
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#6b7280',
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.375rem',
              }}
            >
              <p style={{ marginBottom: '0.5rem', fontWeight: '500' }}>
                演示账号信息：
              </p>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                }}
              >
                邮箱: demo@mindnote.com
                <br />
                密码: demo
              </p>
            </div>
          </form>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
          }}
        >
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              color: '#6b7280',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
