'use client';

import { useEffect, useState } from 'react';

export default function DiagnosticsPage() {
  const [status, setStatus] = useState({
    loading: true,
    error: null,
    info: {},
  });

  useEffect(() => {
    try {
      const info = {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        readyState: document.readyState,
        title: document.title,
        cookies: document.cookie,
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
      };

      setStatus({
        loading: false,
        error: null,
        info,
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message,
        info: {},
      });
    }
  }, []);

  if (status.loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h1>🔍 系统诊断中...</h1>
        <p>正在收集浏览器环境信息...</p>
      </div>
    );
  }

  if (status.error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace', color: 'red' }}>
        <h1>❌ 诊断失败</h1>
        <p>错误: {status.error}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'monospace',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h1>🔍 MindNote 系统诊断</h1>

      <div
        style={{
          background: '#f5f5f5',
          padding: '15px',
          margin: '10px 0',
          borderRadius: '5px',
        }}
      >
        <h2>📊 基本信息</h2>
        <ul>
          <li>
            <strong>时间:</strong> {status.info.timestamp}
          </li>
          <li>
            <strong>URL:</strong> {status.info.url}
          </li>
          <li>
            <strong>页面标题:</strong> {status.info.title}
          </li>
          <li>
            <strong>就绪状态:</strong> {status.info.readyState}
          </li>
        </ul>
      </div>

      <div
        style={{
          background: '#e8f4fd',
          padding: '15px',
          margin: '10px 0',
          borderRadius: '5px',
        }}
      >
        <h2>🌐 浏览器信息</h2>
        <p>
          <strong>User Agent:</strong>
        </p>
        <code
          style={{
            wordBreak: 'break-all',
            background: '#fff',
            padding: '5px',
            display: 'block',
          }}
        >
          {status.info.userAgent}
        </code>
      </div>

      <div
        style={{
          background: '#fff3cd',
          padding: '15px',
          margin: '10px 0',
          borderRadius: '5px',
        }}
      >
        <h2>💾 存储信息</h2>
        <ul>
          <li>
            <strong>LocalStorage:</strong>{' '}
            {status.info.localStorage.length > 0
              ? status.info.localStorage.join(', ')
              : '(空)'}
          </li>
          <li>
            <strong>SessionStorage:</strong>{' '}
            {status.info.sessionStorage.length > 0
              ? status.info.sessionStorage.join(', ')
              : '(空)'}
          </li>
          <li>
            <strong>Cookies:</strong> {status.info.cookies || '(无)'}
          </li>
        </ul>
      </div>

      <div
        style={{
          background: '#d4edda',
          padding: '15px',
          margin: '10px 0',
          borderRadius: '5px',
        }}
      >
        <h2>✅ 功能测试</h2>
        <button
          onClick={() => alert('JavaScript 正常工作!')}
          style={{
            padding: '10px 20px',
            margin: '5px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
          }}
        >
          测试 JavaScript
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          style={{
            padding: '10px 20px',
            margin: '5px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
          }}
        >
          返回首页
        </button>
        <button
          onClick={() => (window.location.href = '/notes')}
          style={{
            padding: '10px 20px',
            margin: '5px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
          }}
        >
          访问笔记
        </button>
      </div>

      <div
        style={{
          background: '#f8d7da',
          padding: '15px',
          margin: '10px 0',
          borderRadius: '5px',
        }}
      >
        <h2>🔧 故障排除建议</h2>
        <ul>
          <li>如果看不到内容，请尝试:</li>
          <li>1. 刷新页面 (F5 或 Cmd+R)</li>
          <li>2. 清除浏览器缓存</li>
          <li>3. 打开浏览器开发者工具查看控制台错误</li>
          <li>4. 尝试无痕/隐私模式</li>
          <li>5. 检查网络连接</li>
        </ul>
      </div>
    </div>
  );
}
