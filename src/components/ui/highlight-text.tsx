/**
 * 安全的高亮文本组件
 *
 * 安全地高亮显示匹配的文本，避免XSS攻击
 */

'use client';

import * as React from 'react';

interface HighlightTextProps {
  text: string;
  highlight?: string;
  className?: string;
}

export function HighlightText({
  text,
  highlight,
  className,
}: HighlightTextProps) {
  if (!highlight || !text.toLowerCase().includes(highlight.toLowerCase())) {
    return <span className={className}>{text}</span>;
  }

  // 安全的正则表达式转义
  const escapeRegex = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 创建高亮正则表达式（不区分大小写）
  const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi');

  // 分割文本并标记匹配项
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // 检查是否是匹配的文本（不区分大小写）
        const isMatch = part.toLowerCase() === highlight.toLowerCase();

        if (isMatch) {
          return (
            <mark
              key={index}
              className='bg-yellow-200 text-yellow-900 rounded px-0.5'
            >
              {part}
            </mark>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
