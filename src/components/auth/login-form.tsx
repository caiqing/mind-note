/**
 * Login Form Component
 *
 * User login form with validation and error handling
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon, UserIcon } from 'lucide-react'
import { useLoginForm } from '@/hooks/use-auth'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
  className?: string
}

export function LoginForm({ onSuccess, onSwitchToRegister, className = '' }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const {
    credentials,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
  } = useLoginForm()

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await handleSubmit()
    if (success && onSuccess) {
      onSuccess()
    }
  }

  return (
    <div className={`login-form ${className}`}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">欢迎回来</CardTitle>
          <CardDescription>
            登录您的 MindNote 账户
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="请输入邮箱地址"
                  value={credentials.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={credentials.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="remember" className="text-sm text-gray-600">
                  记住我
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => {
                  // TODO: Implement forgot password functionality
                  console.log('Forgot password')
                }}
              >
                忘记密码？
              </button>
            </div>

            {/* Error Alert */}
            {errors.email || errors.password ? (
              <Alert variant="destructive">
                <AlertDescription>
                  请检查您的邮箱和密码，然后重试。
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? '登录中...' : '登录'}
            </Button>
          </form>

          {/* Switch to Register */}
          {onSwitchToRegister && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                还没有账户？{' '}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  立即注册
                </button>
              </p>
            </div>
          )}

          {/* Demo Account */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 text-center mb-2">
              演示账户
            </p>
            <div className="text-xs text-gray-400 text-center">
              <p>邮箱: demo@mindnote.com</p>
              <p>密码: demo123456</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginForm