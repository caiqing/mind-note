/**
 * Settings Page
 *
 * User preferences and application configuration interface.
 *
 * Reference: specs/003-ui-ux/tasks.md - T070
 */

import { Suspense } from 'react';
import {
  User,
  Palette,
  Globe,
  Shield,
  Bell,
  Database,
  HelpCircle,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '设置 - MindNote',
  description: '管理您的应用偏好和配置，个性化您的笔记体验',
};

export default function SettingsPage() {
  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>设置</h1>
        <p className='text-muted-foreground mt-2'>管理您的应用偏好和配置</p>
      </div>

      {/* Settings Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
        {/* Navigation Sidebar */}
        <div className='lg:col-span-1'>
          <nav className='space-y-1'>
            <button className='w-full text-left px-3 py-2 rounded-md bg-primary text-primary-foreground'>
              <User className='h-4 w-4 mr-2 inline' />
              个人资料
            </button>
            <button className='w-full text-left px-3 py-2 rounded-md hover:bg-accent'>
              <Palette className='h-4 w-4 mr-2 inline' />
              外观
            </button>
            <button className='w-full text-left px-3 py-2 rounded-md hover:bg-accent'>
              <Globe className='h-4 w-4 mr-2 inline' />
              语言和地区
            </button>
            <button className='w-full text-left px-3 py-2 rounded-md hover:bg-accent'>
              <Bell className='h-4 w-4 mr-2 inline' />
              通知
            </button>
            <button className='w-full text-left px-3 py-2 rounded-md hover:bg-accent'>
              <Shield className='h-4 w-4 mr-2 inline' />
              隐私和安全
            </button>
            <button className='w-full text-left px-3 py-2 rounded-md hover:bg-accent'>
              <Database className='h-4 w-4 mr-2 inline' />
              数据和存储
            </button>
            <button className='w-full text-left px-3 py-2 rounded-md hover:bg-accent'>
              <HelpCircle className='h-4 w-4 mr-2 inline' />
              帮助和支持
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className='lg:col-span-3'>
          <Suspense
            fallback={<div className='text-center py-12'>加载设置中...</div>}
          >
            <div className='space-y-6'>
              {/* Profile Settings */}
              <div className='card'>
                <div className='card-header'>
                  <div className='card-title'>个人资料</div>
                  <p className='card-description'>管理您的个人信息和账户设置</p>
                </div>
                <div className='card-content'>
                  <div className='space-y-4'>
                    <div className='flex items-center space-x-4'>
                      <div className='h-16 w-16 rounded-full bg-muted flex items-center justify-center'>
                        <User className='h-8 w-8 text-muted-foreground' />
                      </div>
                      <div>
                        <h3 className='font-medium'>用户名</h3>
                        <p className='text-sm text-muted-foreground'>
                          user@example.com
                        </p>
                      </div>
                      <button className='btn btn-outline ml-auto'>
                        更换头像
                      </button>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div>
                        <label className='form-label'>显示名称</label>
                        <input
                          type='text'
                          className='input'
                          placeholder='输入显示名称'
                        />
                      </div>
                      <div>
                        <label className='form-label'>邮箱地址</label>
                        <input
                          type='email'
                          className='input'
                          placeholder='输入邮箱地址'
                        />
                      </div>
                    </div>

                    <div>
                      <label className='form-label'>个人简介</label>
                      <textarea
                        className='textarea'
                        rows={3}
                        placeholder='简单介绍一下自己...'
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Appearance Settings */}
              <div className='card'>
                <div className='card-header'>
                  <div className='card-title'>外观设置</div>
                  <p className='card-description'>自定义应用的外观和主题</p>
                </div>
                <div className='card-content'>
                  <div className='space-y-4'>
                    <div>
                      <label className='form-label'>主题模式</label>
                      <div className='flex items-center space-x-4 mt-2'>
                        <label className='flex items-center space-x-2'>
                          <input type='radio' name='theme' className='radio' />
                          <span>浅色</span>
                        </label>
                        <label className='flex items-center space-x-2'>
                          <input
                            type='radio'
                            name='theme'
                            className='radio'
                            defaultChecked
                          />
                          <span>深色</span>
                        </label>
                        <label className='flex items-center space-x-2'>
                          <input type='radio' name='theme' className='radio' />
                          <span>跟随系统</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className='form-label'>字体大小</label>
                      <select className='input'>
                        <option>小</option>
                        <option selected>中</option>
                        <option>大</option>
                      </select>
                    </div>

                    <div>
                      <label className='form-label'>布局密度</label>
                      <select className='input'>
                        <option>紧凑</option>
                        <option selected>舒适</option>
                        <option>宽松</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className='card'>
                <div className='card-header'>
                  <div className='card-title'>通知设置</div>
                  <p className='card-description'>管理应用通知和提醒</p>
                </div>
                <div className='card-content'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <h4 className='font-medium'>邮件通知</h4>
                        <p className='text-sm text-muted-foreground'>
                          接收重要更新的邮件通知
                        </p>
                      </div>
                      <button className='theme-switcher' data-state='checked'>
                        <span className='theme-switcher-thumb' />
                      </button>
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <h4 className='font-medium'>桌面通知</h4>
                        <p className='text-sm text-muted-foreground'>
                          在浏览器中显示桌面通知
                        </p>
                      </div>
                      <button className='theme-switcher' data-state='unchecked'>
                        <span className='theme-switcher-thumb' />
                      </button>
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <h4 className='font-medium'>AI 洞察报告</h4>
                        <p className='text-sm text-muted-foreground'>
                          定期接收AI分析报告
                        </p>
                      </div>
                      <button className='theme-switcher' data-state='checked'>
                        <span className='theme-switcher-thumb' />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className='flex justify-end'>
                <button className='btn btn-primary'>保存设置</button>
              </div>
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
