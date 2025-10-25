/**
 * Authentication Demo Page
 *
 * Demonstrates the authentication system with login and registration
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  UserIcon,
  ShieldIcon,
  KeyIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SettingsIcon,
  LogOutIcon,
  UserPlusIcon,
  LogInIcon
} from 'lucide-react'
import LoginForm from '@/components/auth/login-form'
import RegisterForm from '@/components/auth/register-form'
import { AuthProvider, useAuth } from '@/hooks/use-auth'

function AuthDemoContent() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const handleAuthSuccess = () => {
    setShowSuccessMessage(true)
    setTimeout(() => setShowSuccessMessage(false), 3000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在检查认证状态...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          {/* Success Message */}
          {showSuccessMessage && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800">认证操作成功！</span>
              </div>
            </div>
          )}

          {/* User Info Card */}
          <Card className="max-w-2xl mx-auto mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5" />
                <span>用户信息</span>
                <Badge variant="outline" className="ml-auto">已认证</Badge>
              </CardTitle>
              <CardDescription>
                当前登录用户的基本信息和认证状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">用户ID</label>
                    <p className="text-gray-900 font-mono">{user.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">邮箱地址</label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">用户名</label>
                    <p className="text-gray-900">{user.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">头像</label>
                    <p className="text-gray-900">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt="User avatar"
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-gray-400">未设置</span>
                      )}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <ShieldIcon className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600">认证状态：已认证</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={logout}
                    className="flex items-center space-x-1"
                  >
                    <LogOutIcon className="h-4 w-4" />
                    <span>登出</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Demo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <KeyIcon className="h-5 w-5" />
                  <span>JWT认证</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  使用JSON Web Token进行安全的用户认证，支持访问令牌和刷新令牌机制。
                </p>
                <Badge variant="secondary">已启用</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <ShieldIcon className="h-5 w-5" />
                  <span>密码加密</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  使用bcrypt进行密码哈希，确保用户密码的安全存储。
                </p>
                <Badge variant="secondary">bcrypt 12轮</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <SettingsIcon className="h-5 w-5" />
                  <span>状态管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  React Context提供全局认证状态管理，支持实时状态更新。
                </p>
                <Badge variant="secondary">Context API</Badge>
              </CardContent>
            </Card>
          </div>

          {/* API Endpoints */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-xl">API端点</CardTitle>
              <CardDescription>
                认证系统提供的API端点
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <code className="text-sm font-mono">POST /api/auth/register</code>
                    <p className="text-xs text-gray-600 mt-1">用户注册</p>
                  </div>
                  <Badge variant="outline">POST</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <code className="text-sm font-mono">POST /api/auth/login</code>
                    <p className="text-xs text-gray-600 mt-1">用户登录</p>
                  </div>
                  <Badge variant="outline">POST</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <code className="text-sm font-mono">GET /api/auth/me</code>
                    <p className="text-xs text-gray-600 mt-1">获取当前用户信息</p>
                  </div>
                  <Badge variant="outline">GET</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <code className="text-sm font-mono">DELETE /api/auth/me</code>
                    <p className="text-xs text-gray-600 mt-1">用户登出</p>
                  </div>
                  <Badge variant="outline">DELETE</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MindNote</h1>
          <p className="text-gray-600">智能笔记系统认证演示</p>
        </div>

        {/* Auth Forms */}
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="flex items-center space-x-2">
              <LogInIcon className="h-4 w-4" />
              <span>登录</span>
            </TabsTrigger>
            <TabsTrigger value="register" className="flex items-center space-x-2">
              <UserPlusIcon className="h-4 w-4" />
              <span>注册</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <LoginForm onSuccess={handleAuthSuccess} />
          </TabsContent>

          <TabsContent value="register">
            <RegisterForm onSuccess={handleAuthSuccess} />
          </TabsContent>
        </Tabs>

        {/* Features */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">认证功能特性</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm">JWT令牌认证</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm">密码安全加密</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm">表单验证</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm">实时状态管理</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-sm">速率限制保护</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-2">
            这是一个演示页面，展示了完整的用户认证功能
          </p>
          <div className="flex items-center justify-center space-x-2">
            <AlertCircleIcon className="h-3 w-3 text-yellow-500" />
            <span className="text-xs text-gray-500">
              注意：演示数据不会被持久化存储
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthDemoPage() {
  return (
    <AuthProvider>
      <AuthDemoContent />
    </AuthProvider>
  )
}