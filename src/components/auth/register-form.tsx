/**
 * Register Form Component
 *
 * User registration form with validation and error handling
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon, UserIcon, CheckCircleIcon } from 'lucide-react'
import { useRegisterForm } from '@/hooks/use-auth'

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
  className?: string
}

export function RegisterForm({ onSuccess, onSwitchToLogin, className = '' }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)

  const {
    credentials,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
  } = useRegisterForm()

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    let strength = 0

    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z\d]/.test(password)) strength++

    return strength
  }

  const handlePasswordChange = (value: string) => {
    handleChange('password', value)
    setPasswordStrength(checkPasswordStrength(value))
  }

  const validateConfirmPassword = () => {
    if (confirmPassword && credentials.password && confirmPassword !== credentials.password) {
      return '密码不匹配'
    }
    return null
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate confirm password
    const confirmPasswordError = validateConfirmPassword()
    if (confirmPasswordError) {
      return
    }

    const success = await handleSubmit()
    if (success && onSuccess) {
      onSuccess()
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500'
    if (passwordStrength <= 2) return 'bg-orange-500'
    if (passwordStrength <= 3) return 'bg-yellow-500'
    if (passwordStrength <= 4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return '弱'
    if (passwordStrength <= 2) return '一般'
    if (passwordStrength <= 3) return '中等'
    if (passwordStrength <= 4) return '强'
    return '非常强'
  }

  return (
    <div className={`register-form ${className}`}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">创建账户</CardTitle>
          <CardDescription>
            注册您的 MindNote 账户，开始智能笔记之旅
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="请输入您的姓名"
                  value={credentials.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

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
                  placeholder="请输入密码（至少8个字符）"
                  value={credentials.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
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

              {/* Password Strength Indicator */}
              {credentials.password && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>密码强度</span>
                    <span className={getPasswordStrengthColor().replace('bg-', 'text-')}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 pr-10 ${
                    confirmPassword && credentials.password && confirmPassword !== credentials.password
                      ? 'border-red-500'
                      : ''
                  }`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword && credentials.password && confirmPassword !== credentials.password && (
                <p className="text-sm text-red-500">密码不匹配</p>
              )}
            </div>

            {/* Terms and Privacy */}
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                required
              />
              <Label htmlFor="terms" className="text-sm text-gray-600">
                我同意{' '}
                <a href="#" className="text-blue-600 hover:text-blue-800">
                  服务条款
                </a>{' '}
                和{' '}
                <a href="#" className="text-blue-600 hover:text-blue-800">
                  隐私政策
                </a>
              </Label>
            </div>

            {/* Error Alert */}
            {(errors.email || errors.password || errors.name) && (
              <Alert variant="destructive">
                <AlertDescription>
                  请检查您的输入信息，然后重试。
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !confirmPassword || confirmPassword !== credentials.password}
            >
              {isSubmitting ? '注册中...' : '创建账户'}
            </Button>
          </form>

          {/* Switch to Login */}
          {onSwitchToLogin && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                已有账户？{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  立即登录
                </button>
              </p>
            </div>
          )}

          {/* Benefits */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-gray-500 text-center mb-2">
              注册后您将获得：
            </p>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-gray-600">
                <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                <span>无限笔记存储空间</span>
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                <span>实时自动保存</span>
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <CheckCircleIcon className="h-3 w-3 text-green-500 mr-1" />
                <span>智能思维导图</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegisterForm