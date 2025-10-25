/**
 * User Profile Page
 *
 * User personal center for managing account information
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
  CalendarIcon,
  EditIcon,
  SettingsIcon,
  FileTextIcon,
  TagIcon,
  ClockIcon,
  ShieldIcon,
  KeyIcon,
  BellIcon,
  GlobeIcon,
  MoonIcon,
  SunIcon
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { NoteWithRelations } from '@/types/note'

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [language, setLanguage] = useState('zh-CN');

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载用户信息...</p>
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
            <CardDescription>请先登录以访问个人中心</CardDescription>
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

  // Fetch user notes data
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserNotes();
      if (user?.name) {
        setDisplayName(user.name);
      }
    }
  }, [isAuthenticated, user]);

  const fetchUserNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notes');

      if (!response.ok) {
        throw new Error('获取笔记数据失败');
      }

      const result = await response.json();
      if (result.success) {
        setNotes(result.data.notes || []);
      } else {
        setError(result.error || '获取笔记失败');
      }
    } catch (err) {
      console.error('Failed to fetch user notes:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      // TODO: 实现用户信息更新API
      console.log('保存用户信息:', { displayName, theme, language });
      setIsEditing(false);
      // 显示保存成功提示
      alert('个人资料已更新');
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('保存失败，请稍后重试');
    }
  };

  const stats = {
    totalNotes: notes.length,
    totalWords: notes.reduce((total, note) => total + note.content.length, 0),
    totalTags: [...new Set(notes.flatMap(note => note.tags))].length,
    thisWeek: notes.filter(note => {
      const noteDate = new Date(note.updatedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return noteDate > weekAgo;
    }).length
  };

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
                <SettingsIcon className="h-4 w-4" />
                <span>返回应用</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-xl font-bold text-gray-900">个人中心</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {user?.email}
              </Badge>
              <Button variant="outline" size="sm" onClick={logout}>
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="text-2xl">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">
                      {isEditing ? (
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="text-center border rounded px-2 py-1 text-lg"
                          placeholder="输入显示名称"
                        />
                      ) : (
                        displayName || user?.name || '未设置名称'
                      )}
                    </CardTitle>
                    <CardDescription>{user?.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">注册时间</span>
                    </div>
                    <span className="text-sm font-medium">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">账户状态</span>
                    </div>
                    <Badge variant="default" className="text-xs">
                      已验证
                    </Badge>
                  </div>

                  <Separator />

                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <Button onClick={handleSaveProfile} size="sm" className="flex-1">
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                          size="sm"
                          className="flex-1"
                        >
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditing(true)} size="sm" className="flex-1">
                        <EditIcon className="h-4 w-4 mr-2" />
                        编辑资料
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">统计概览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">总笔记数</span>
                    <span className="text-2xl font-bold">{stats.totalNotes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">总字数</span>
                    <span className="text-lg font-semibold">
                      {stats.totalWords.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">标签数量</span>
                    <span className="text-lg font-semibold">{stats.totalTags}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">本周新增</span>
                    <span className="text-lg font-semibold">{stats.thisWeek}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings and Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <SettingsIcon className="h-5 w-5" />
                  <span>偏好设置</span>
                </CardTitle>
                <CardDescription>
                  自定义您的应用体验
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Theme Setting */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      {theme === 'dark' ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
                      <span className="text-sm font-medium">主题设置</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTheme('light')}
                      >
                        <SunIcon className="h-4 w-4 mr-2" />
                        浅色
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTheme('dark')}
                      >
                        <MoonIcon className="h-4 w-4 mr-2" />
                        深色
                      </Button>
                      <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTheme('system')}
                      >
                        跟随系统
                      </Button>
                    </div>
                  </div>

                  {/* Language Setting */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <GlobeIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">语言设置</span>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="zh-TW">繁體中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>

                  {/* Notification Setting */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <BellIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">通知设置</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">邮件通知</span>
                      <Button variant="outline" size="sm">
                        配置
                      </Button>
                    </div>
                  </div>

                  {/* Security Setting */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <KeyIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">安全设置</span>
                    </div>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <KeyIcon className="h-4 w-4 mr-2" />
                        修改密码
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <ShieldIcon className="h-4 w-4 mr-2" />
                        两步验证
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ClockIcon className="h-5 w-5" />
                  <span>最近活动</span>
                </CardTitle>
                <CardDescription>
                  您最近的笔记编辑活动
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-600">正在加载活动记录...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={fetchUserNotes} size="sm">
                      重试
                    </Button>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">还没有任何笔记活动</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...notes]
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                      .slice(0, 10)
                      .map((note, index) => (
                        <div key={note.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                          <div className={`w-2 h-2 rounded-full ${
                            index === 0 ? 'bg-green-500' :
                            index === 1 ? 'bg-blue-500' :
                            index === 2 ? 'bg-purple-500' :
                            'bg-gray-400'
                          }`}></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{note.title}</span>
                              <span className="text-xs text-gray-400">
                                {new Date(note.updatedAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {note.content.length} 字符
                              </span>
                              {note.tags.length > 0 && (
                                <>
                                  <Separator orientation="vertical" className="h-3" />
                                  <div className="flex items-center space-x-1">
                                    <TagIcon className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {note.tags.length} 个标签
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}