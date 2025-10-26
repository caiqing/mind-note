'use client';

export default function SimpleTestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔧 简化测试页面</h1>
      <p>这是一个简化的测试页面，用于检查基本渲染功能。</p>

      <div
        style={{
          background: '#f0f0f0',
          padding: '15px',
          margin: '10px 0',
          borderRadius: '5px',
        }}
      >
        <h2>✅ 基本功能检查</h2>
        <ul>
          <li>✅ 页面渲染正常</li>
          <li>✅ CSS样式应用</li>
          <li>✅ JavaScript执行</li>
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
        <h2>🎯 测试按钮</h2>
        <button
          onClick={() => alert('JavaScript 正常工作!')}
          style={{
            padding: '10px 20px',
            margin: '5px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          点击测试 JavaScript
        </button>
        <button
          onClick={() => (window.location.href = '/')}
          style={{
            padding: '10px 20px',
            margin: '5px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          返回首页
        </button>
      </div>

      <div
        style={{
          background: '#fff3cd',
          padding: '15px',
          margin: '10px 0',
          borderRadius: '5px',
        }}
      >
        <h2>🔍 页面信息</h2>
        <p>
          <strong>当前URL:</strong>{' '}
          {typeof window !== 'undefined'
            ? window.location.href
            : '服务器端渲染'}
        </p>
        <p>
          <strong>用户代理:</strong>{' '}
          {typeof navigator !== 'undefined'
            ? navigator.userAgent
            : '服务器端渲染'}
        </p>
        <p>
          <strong>当前时间:</strong> {new Date().toLocaleString('zh-CN')}
        </p>
      </div>

      <div
        style={{
          background: '#d4edda',
          padding: '15px',
          margin: '10px 0',
          borderRadius: '5px',
        }}
      >
        <h2>📝 调试信息</h2>
        <p>如果这个页面显示正常，说明基础的React渲染功能没问题。</p>
        <p>如果原始登录页面有问题，可能是由于以下原因：</p>
        <ul>
          <li>useAuth hook 导入错误</li>
          <li>UI组件库问题</li>
          <li>CSS样式冲突</li>
          <li>TypeScript类型错误</li>
        </ul>
      </div>
    </div>
  );
}
