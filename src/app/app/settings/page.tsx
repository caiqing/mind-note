/**
 * Settings Page
 *
 * Comprehensive user settings and preferences management
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  UserIcon,
  MailIcon,
  KeyIcon,
  ShieldIcon,
  BellIcon,
  GlobeIcon,
  MoonIcon,
  SunIcon,
  MonitorIcon,
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  SmartphoneIcon,
  TabletIcon,
  LaptopIcon
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface UserSettings {
  displayName: string;
  email: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  defaultNoteVisibility: 'private' | 'public';
  dataExportFormat: 'json' | 'markdown' | 'pdf';
  twoFactorEnabled: boolean;
}

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings state
  const [settings, setSettings] = useState<UserSettings>({
    displayName: '',
    email: '',
    theme: 'system',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    emailNotifications: true,
    pushNotifications: false,
    autoSave: true,
    autoSaveInterval: 30,
    defaultNoteVisibility: 'private',
    dataExportFormat: 'json',
    twoFactorEnabled: false
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Initialize settings
  useEffect(() => {
    if (isAuthenticated && user) {
      setSettings(prev => ({
        ...prev,
        displayName: user.name || '',
        email: user.email || ''
      }));
    }
  }, [isAuthenticated, user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载设置...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>需要登录</CardTitle>
            <CardDescription>请先登录以访问设置页面</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/auth-demo'} className="w-full">
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveSettings = async (section: string) => {
    setLoading(true);
    try {
      // TODO: 实现设置保存API
      console.log(`保存设置 - ${section}:`, settings);
      setMessage({ type: 'success', text: `${section}设置已保存` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setMessage({ type: 'error', text: '保存失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: '新密码和确认密码不匹配' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: '新密码至少需要8个字符' });
      return;
    }

    setLoading(true);
    try {
      // TODO: 实现密码修改API
      console.log('修改密码:', passwordData);
      setMessage({ type: 'success', text: '密码修改成功' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to change password:', err);
      setMessage({ type: 'error', text: '密码修改失败，请检查当前密码是否正确' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      // TODO: 实现数据导出API
      console.log('导出数据格式:', settings.dataExportFormat);
      setMessage({ type: 'success', text: '数据导出已开始，稍后将发送到您的邮箱' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export data:', err);
      setMessage({ type: 'error', text: '数据导出失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt('请输入 "DELETE" 确认删除账户（此操作不可撤销）:');
    if (confirmText !== 'DELETE') {
      return;
    }

    setLoading(true);
    try {
      // TODO: 实现账户删除API
      console.log('删除账户:', user?.id);
      setMessage({ type: 'success', text: '账户删除请求已提交，我们将在24小时内处理' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete account:', err);
      setMessage({ type: 'error', text: '账户删除失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: '个人资料', icon: UserIcon },
    { id: 'security', label: '安全设置', icon: ShieldIcon },
    { id: 'preferences', label: '偏好设置', icon: GlobeIcon },
    { id: 'notifications', label: '通知设置', icon: BellIcon },
    { id: 'data', label: '数据管理', icon: DownloadIcon },
    { id: 'danger', label: '危险区域', icon: AlertTriangleIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center space-x-2"
              >
                <UserIcon className="h-4 w-4" />
                <span>返回</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-xl font-bold text-gray-900">设置</h1>
            </div>
            {message && (
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message.type === 'success' ? <CheckIcon className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
                <span className="text-sm">{message.text}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserIcon className="h-5 w-5" />
                    <span>个人资料</span>
                  </CardTitle>
                  <CardDescription>
                    管理您的个人信息和账户基本设置
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="text-xl">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm">
                        更换头像
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        支持 JPG, PNG 格式，最大 2MB
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">显示名称</label>
                      <input
                        type="text"
                        value={settings.displayName}
                        onChange={(e) => setSettings(prev => ({ ...prev, displayName: e.target.value }))}
                        className="w-full p-2 border rounded-lg"
                        placeholder="输入您的显示名称"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">邮箱地址</label>
                      <input
                        type="email"
                        value={settings.email}
                        disabled
                        className="w-full p-2 border rounded-lg bg-gray-50 text-gray-500"
                      />
                      <p className="text-xs text-gray-500">邮箱地址无法修改</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSettings('个人资料')} disabled={loading}>
                      {loading ? '保存中...' : '保存更改'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <KeyIcon className="h-5 w-5" />
                      <span>密码设置</span>
                    </CardTitle>
                    <CardDescription>
                      修改您的账户密码
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">当前密码</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full p-2 border rounded-lg pr-10"
                          placeholder="输入当前密码"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.current ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">新密码</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full p-2 border rounded-lg pr-10"
                          placeholder="输入新密码（至少8个字符）"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.new ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">确认新密码</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full p-2 border rounded-lg pr-10"
                          placeholder="再次输入新密码"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handlePasswordChange} disabled={loading}>
                        {loading ? '修改中...' : '修改密码'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <ShieldIcon className="h-5 w-5" />
                      <span>两步验证</span>
                    </CardTitle>
                    <CardDescription>
                      增强您的账户安全性
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">两步验证</p>
                        <p className="text-sm text-gray-500">
                          {settings.twoFactorEnabled ? '已启用两步验证' : '未启用两步验证'}
                        </p>
                      </div>
                      <Button variant={settings.twoFactorEnabled ? "destructive" : "default"}>
                        {settings.twoFactorEnabled ? '禁用' : '启用'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Preferences Settings */}
            {activeTab === 'preferences' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GlobeIcon className="h-5 w-5" />
                    <span>偏好设置</span>
                  </CardTitle>
                  <CardDescription>
                    自定义您的应用体验
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">主题设置</label>
                    <div className="flex space-x-2">
                      <Button
                        variant={settings.theme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
                      >
                        <SunIcon className="h-4 w-4 mr-2" />
                        浅色
                      </Button>
                      <Button
                        variant={settings.theme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
                      >
                        <MoonIcon className="h-4 w-4 mr-2" />
                        深色
                      </Button>
                      <Button
                        variant={settings.theme === 'system' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSettings(prev => ({ ...prev, theme: 'system' }))}
                      >
                        <MonitorIcon className="h-4 w-4 mr-2" />
                        跟随系统
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">语言设置</label>
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="zh-TW">繁體中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">时区设置</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="Asia/Shanghai">北京时间 (UTC+8)</option>
                      <option value="Asia/Tokyo">东京时间 (UTC+9)</option>
                      <option value="America/New_York">纽约时间 (UTC-5)</option>
                      <option value="Europe/London">伦敦时间 (UTC+0)</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">默认笔记可见性</label>
                    <div className="flex space-x-2">
                      <Button
                        variant={settings.defaultNoteVisibility === 'private' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSettings(prev => ({ ...prev, defaultNoteVisibility: 'private' }))}
                      >
                        私密
                      </Button>
                      <Button
                        variant={settings.defaultNoteVisibility === 'public' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSettings(prev => ({ ...prev, defaultNoteVisibility: 'public' }))}
                      >
                        公开
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">自动保存</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.autoSave}
                        onChange={(e) => setSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">启用自动保存</span>
                    </div>
                    {settings.autoSave && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">自动保存间隔（秒）</label>
                        <input
                          type="number"
                          min="10"
                          max="300"
                          value={settings.autoSaveInterval}
                          onChange={(e) => setSettings(prev => ({ ...prev, autoSaveInterval: parseInt(e.target.value) }))}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSettings('偏好设置')} disabled={loading}>
                      {loading ? '保存中...' : '保存设置'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BellIcon className="h-5 w-5" />
                    <span>通知设置</span>
                  </CardTitle>
                  <CardDescription>
                    管理您的通知偏好
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">邮件通知</p>
                        <p className="text-sm text-gray-500">接收重要更新和活动通知</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">推送通知</p>
                        <p className="text-sm text-gray-500">在浏览器中接收实时通知</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.pushNotifications}
                        onChange={(e) => setSettings(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSaveSettings('通知设置')} disabled={loading}>
                      {loading ? '保存中...' : '保存设置'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data Management */}
            {activeTab === 'data' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DownloadIcon className="h-5 w-5" />
                    <span>数据管理</span>
                  </CardTitle>
                  <CardDescription>
                    导出和管理您的数据
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">导出格式</label>
                    <select
                      value={settings.dataExportFormat}
                      onChange={(e) => setSettings(prev => ({ ...prev, dataExportFormat: e.target.value as any }))}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="json">JSON 格式</option>
                      <option value="markdown">Markdown 格式</option>
                      <option value="pdf">PDF 格式</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={handleExportData} disabled={loading} className="w-full">
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      {loading ? '导出中...' : '导出所有数据'}
                    </Button>
                    <p className="text-xs text-gray-500">
                      导出包含您的所有笔记、标签和设置信息
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-red-600">设备管理</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <LaptopIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Chrome - macOS</p>
                            <p className="text-xs text-gray-500">最后活动：2小时前</p>
                          </div>
                        </div>
                        <Badge variant="secondary">当前设备</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <SmartphoneIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Safari - iPhone</p>
                            <p className="text-xs text-gray-500">最后活动：昨天</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          移除
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone */}
            {activeTab === 'danger' && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-600">
                    <AlertTriangleIcon className="h-5 w-5" />
                    <span>危险区域</span>
                  </CardTitle>
                  <CardDescription>
                    这些操作是不可逆的，请谨慎操作
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="font-medium text-red-800 mb-2">删除账户</h3>
                    <p className="text-sm text-red-700 mb-4">
                      删除账户将永久移除您的所有数据，包括笔记、标签、设置等。此操作无法撤销。
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={loading}
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      {loading ? '处理中...' : '删除账户'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}