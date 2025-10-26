'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: 'demo@mindnote.com',
    password: 'demo',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        router.push('/notes');
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
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem',
            }}
          >
            登录 MindNote
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
            使用演示账号体验智能笔记功能
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.75rem',
            boxShadow:
              '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>⚠️</span>
                {error}
              </div>
            )}

            <div>
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
                value={formData.email}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder='demo@mindnote.com'
                style={{
                  width: '100%',
                  padding: '0.75rem',
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
                  e.target.style.boxShadow =
                    '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
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
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder='demo'
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '2.5rem',
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
                    e.target.style.boxShadow =
                      '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    color: '#6b7280',
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button
              type='submit'
              disabled={isLoading}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                fontWeight: '500',
                borderRadius: '0.5rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.15s ease-in-out',
                border: 'none',
              }}
              onMouseOver={e => {
                if (!isLoading) {
                  e.target.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseOut={e => {
                if (!isLoading) {
                  e.target.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {isLoading ? (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: '0.5rem',
                    }}
                  ></span>
                  登录中...
                </span>
              ) : (
                '登录'
              )}
            </button>

            <div
              style={{
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#6b7280',
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.5rem',
                lineHeight: '1.5',
              }}
            >
              <p style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                演示账号信息：
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
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
            onClick={() => router.push('/')}
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
            onMouseOver={e => {
              e.target.style.textDecoration = 'underline';
            }}
            onMouseOut={e => {
              e.target.style.textDecoration = 'none';
            }}
          >
            ← 返回首页
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
