/**
 * T108 用户管理API服务
 * 提供完整的用户管理、认证授权、偏好设置和订阅管理功能
 */

import { BaseAPIService } from '../base-service';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  NotificationSettings,
  PrivacySettings,
  AISettings,
  EditorSettings,
  UserSubscription,
  ApiResponse,
  PaginatedResponse
} from '../types';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ForbiddenError
} from '../errors';

export interface UsersServiceConfig {
  baseUrl: string;
  authUrl?: string;
  enableEmailVerification?: boolean;
  enableTwoFactorAuth?: boolean;
  enableOAuth?: boolean[];
  maxLoginAttempts?: number;
  sessionTimeout?: number;
  passwordPolicy?: PasswordPolicy;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number;
  preventCommonPasswords: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
  deviceInfo?: {
    userAgent: string;
    ip: string;
    deviceId: string;
  };
}

export interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
  session: {
    id: string;
    expiresAt: string;
    deviceInfo: any;
  };
}

export interface RegisterRequest {
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
  inviteCode?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  preferences?: Partial<NotificationSettings>;
}

export interface PasswordResetRequest {
  email: string;
  resetToken?: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: any;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastAccessAt: string;
  expiresAt: string;
  isActive: boolean;
}

/**
 * T108 用户管理API服务
 */
export class UsersService extends BaseAPIService {
  private authUrl?: string;
  private enableEmailVerification: boolean;
  private enableTwoFactorAuth: boolean;
  private enableOAuth: string[];
  private maxLoginAttempts: number;
  private sessionTimeout: number;
  private passwordPolicy: PasswordPolicy;

  constructor(config: UsersServiceConfig) {
    super(config);

    this.authUrl = config.authUrl;
    this.enableEmailVerification = config.enableEmailVerification ?? true;
    this.enableTwoFactorAuth = config.enableTwoFactorAuth ?? false;
    this.enableOAuth = config.enableOAuth || [];
    this.maxLoginAttempts = config.maxLoginAttempts ?? 5;
    this.sessionTimeout = config.sessionTimeout ?? 3600000; // 1 hour
    this.passwordPolicy = config.passwordPolicy || {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      preventReuse: 5,
      preventCommonPasswords: true
    };

    // 添加认证拦截器
    this.addRequestInterceptor(this.addAuthHeader.bind(this));
  }

  /**
   * 添加认证头
   */
  private addAuthHeader(request: Request): Request {
    const token = this.getStoredToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  }

  /**
   * 获取存储的token
   */
  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * 存储token
   */
  private storeToken(token: string, rememberMe: boolean = false): void {
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem('auth_token', token);
      } else {
        sessionStorage.setItem('auth_token', token);
      }
    }
  }

  /**
   * 清除token
   */
  private clearStoredToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    }
  }

  /**
   * 验证密码强度
   */
  private validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.passwordPolicy.minLength) {
      errors.push(`Password must be at least ${this.passwordPolicy.minLength} characters long`);
    }

    if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // 检查常见密码
    if (this.passwordPolicy.preventCommonPasswords) {
      const commonPasswords = ['password', '123456', '123456789', 'qwerty', 'abc123', 'password123'];
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common, please choose a stronger password');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证用户数据
   */
  private validateUserData(data: CreateUserRequest | UpdateUserRequest, isUpdate: boolean = false): void {
    const rules: Record<string, any> = {
      email: {
        required: !isUpdate,
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        validate: (value: any) => {
          const email = value.toLowerCase();
          const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
          const domain = email.split('@')[1];
          if (commonDomains.includes(domain)) return 'Please use a work email address';
          return null;
        }
      },
      username: {
        required: !isUpdate,
        type: 'string',
        minLength: 3,
        maxLength: 30,
        pattern: /^[a-zA-Z0-9_-]+$/,
        validate: (value: any) => {
          if (/^\d+$/.test(value)) return 'Username cannot be only numbers';
          if (!/^[a-zA-Z]/.test(value)) return 'Username must start with a letter';
          return null;
        }
      },
      displayName: {
        required: !isUpdate,
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: /^.{1,100}$/
      },
      password: {
        required: !isUpdate,
        type: 'string',
        validate: (value: any) => {
          const validation = this.validatePasswordStrength(value);
          return validation.isValid ? null : validation.errors.join(', ');
        }
      }
    };

    this.validateParams(data, rules);

    // 确认密码验证
    if ((data as RegisterRequest).confirmPassword && data.password) {
      if (data.password !== (data as RegisterRequest).confirmPassword) {
        throw new ValidationError('Passwords do not match');
      }
    }
  }

  /**
   * 用户注册
   */
  async register(request: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      // 验证请求数据
      this.validateUserData(request);

      // 验证条款接受
      if (!request.acceptTerms) {
        throw new ValidationError('You must accept the terms of service');
      }
      if (!request.acceptPrivacy) {
        throw new ValidationError('You must accept the privacy policy');
      }

      this.log('info', 'User registration initiated', {
        email: request.email,
        username: request.username
      });

      // 检查邀请码（如果需要）
      if (request.inviteCode) {
        const inviteValid = await this.validateInviteCode(request.inviteCode);
        if (!inviteValid.data?.valid) {
          throw new ValidationError('Invalid or expired invite code');
        }
      }

      const registerRequest = {
        email: request.email.toLowerCase().trim(),
        username: request.username.trim().toLowerCase(),
        displayName: request.displayName.trim(),
        password: request.password,
        inviteCode: request.inviteCode,
        preferences: request.preferences,
        metadata: {
          registeredAt: new Date().toISOString(),
          registrationIP: await this.getClientIP(),
          userAgent: this.getUserAgent()
        }
      };

      const response = await this.post<LoginResponse>('/auth/register', registerRequest, {
        skipAuth: true
      });

      // 存储token
      if (response.data?.tokens?.accessToken) {
        this.storeToken(response.data.tokens.accessToken, false);
      }

      this.log('info', 'User registration successful', {
        userId: response.data?.user.id,
        email: request.email
      });

      return response;

    } catch (error) {
      this.log('error', 'User registration failed', {
        email: request.email,
        error
      });
      throw error;
    }
  }

  /**
   * 用户登录
   */
  async login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      // 基本验证
      if (!request.email || !request.password) {
        throw new ValidationError('Email and password are required');
      }

      this.log('info', 'User login attempted', {
        email: request.email,
        rememberMe: request.rememberMe
      });

      const loginRequest = {
        email: request.email.toLowerCase().trim(),
        password: request.password,
        twoFactorCode: request.twoFactorCode,
        rememberMe: request.rememberMe || false,
        deviceInfo: {
          userAgent: request.deviceInfo?.userAgent || this.getUserAgent(),
          ip: request.deviceInfo?.ip || await this.getClientIP(),
          deviceId: request.deviceInfo?.deviceId || this.generateDeviceId()
        }
      };

      const response = await this.post<LoginResponse>('/auth/login', loginRequest, {
        skipAuth: true,
        customHeaders: {
          'X-Login-Source': 'web_app'
        }
      });

      // 检查是否需要两步验证
      if (response.data?.user.status === 'pending_2fa') {
        throw new UnauthorizedError('Two-factor authentication required', {
          requiresTwoFactor: true,
          availableMethods: ['totp', 'email']
        });
      }

      // 存储token
      if (response.data?.tokens?.accessToken) {
        this.storeToken(response.data.tokens.accessToken, request.rememberMe);
      }

      this.log('info', 'User login successful', {
        userId: response.data?.user.id,
        email: request.email,
        rememberMe: request.rememberMe
      });

      return response;

    } catch (error) {
      this.log('error', 'User login failed', {
        email: request.email,
        error
      });
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout(allDevices: boolean = false): Promise<ApiResponse<void>> {
    try {
      const response = await this.post<void>('/auth/logout', {
        allDevices
      });

      // 清除本地token
      this.clearStoredToken();

      this.log('info', 'User logged out', { allDevices });

      return response;

    } catch (error) {
      this.log('error', 'Logout failed', { error });
      // 即使API调用失败，也要清除本地token
      this.clearStoredToken();
      throw error;
    }
  }

  /**
   * 刷新token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await this.post<LoginResponse>('/auth/refresh', {
        refreshToken
      }, {
        skipAuth: true
      });

      // 更新存储的token
      if (response.data?.tokens?.accessToken) {
        this.storeToken(response.data.tokens.accessToken, false);
      }

      this.log('info', 'Token refreshed successfully');

      return response;

    } catch (error) {
      this.log('error', 'Token refresh failed', { error });
      this.clearStoredToken();
      throw error;
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await this.get<User>('/users/me');

      this.log('info', 'Retrieved current user info', {
        userId: response.data?.id
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get current user', { error });
      throw error;
    }
  }

  /**
   * 获取用户列表
   */
  async getUsers(
    filters: UserFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    try {
      const params = {
        page: pagination.page || 1,
        limit: Math.min(pagination.limit || 20, 100),
        ...filters
      };

      // 处理数组参数
      if (filters.status) {
        params.status = filters.status.join(',');
      }
      if (filters.roles) {
        params.roles = filters.roles.join(',');
      }

      // 处理日期范围
      if (filters.dateRange) {
        params.dateStart = filters.dateRange.start;
        params.dateEnd = filters.dateRange.end;
      }

      if (filters.activityRange) {
        params.activityStart = filters.activityRange.start;
        params.activityEnd = filters.activityRange.end;
      }

      const response = await this.get<PaginatedResponse<User>>('/users');

      this.log('info', 'Retrieved users list', {
        count: response.data?.items.length,
        page: pagination.page,
        filters: Object.keys(filters).length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to retrieve users', { filters, error });
      throw error;
    }
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.get<User>(`/users/${id}`);

      this.log('info', 'Retrieved user by ID', { userId: id });

      return response;

    } catch (error) {
      if (error instanceof NotFoundError) {
        this.log('warn', 'User not found', { userId: id });
      } else {
        this.log('error', 'Failed to retrieve user', { userId: id, error });
      }
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, request: UpdateUserRequest): Promise<ApiResponse<User>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      // 验证请求数据
      this.validateUserData({ ...request, id }, true);

      // 密码更新特殊验证
      if (request.newPassword) {
        if (!request.currentPassword) {
          throw new ValidationError('Current password is required to change password');
        }

        // 验证当前密码
        await this.verifyCurrentPassword(id, request.currentPassword);

        // 验证新密码强度
        const passwordValidation = this.validatePasswordStrength(request.newPassword);
        if (!passwordValidation.isValid) {
          throw new ValidationError(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
        }
      }

      const response = await this.put<User>(`/users/${id}`, request, {
        customHeaders: {
          'X-Update-Reason': 'user_request'
        }
      });

      this.log('info', 'User updated successfully', {
        userId: id,
        updatedFields: Object.keys(request)
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update user', { userId: id, error });
      throw error;
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string, confirm: boolean = false): Promise<ApiResponse<void>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      if (!confirm) {
        throw new ValidationError('User deletion must be confirmed');
      }

      const response = await this.delete<void>(`/users/${id}`, {
        customHeaders: {
          'X-Delete-Reason': 'user_request',
          'X-Confirmed': 'true'
        }
      });

      this.log('info', 'User deleted', { userId: id });

      return response;

    } catch (error) {
      this.log('error', 'Failed to delete user', { userId: id, error });
      throw error;
    }
  }

  /**
   * 更新用户偏好设置
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationSettings>
  ): Promise<ApiResponse<User>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.patch<User>(`/users/${userId}/preferences`, {
        preferences
      });

      this.log('info', 'User preferences updated', {
        userId,
        updatedPreferences: Object.keys(preferences)
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update user preferences', { userId, error });
      throw error;
    }
  }

  /**
   * 更新隐私设置
   */
  async updatePrivacySettings(
    userId: string,
    settings: PrivacySettings
  ): Promise<ApiResponse<User>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.patch<User>(`/users/${userId}/privacy`, settings);

      this.log('info', 'Privacy settings updated', {
        userId,
        updatedSettings: Object.keys(settings)
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update privacy settings', { userId, error });
      throw error;
    }
  }

  /**
   * 更新AI设置
   */
  async updateAISettings(
    userId: string,
    settings: AISettings
  ): Promise<ApiResponse<User>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.patch<User>(`/users/${userId}/ai-settings`, settings);

      this.log('info', 'AI settings updated', {
        userId,
        updatedSettings: Object.keys(settings)
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update AI settings', { userId, error });
      throw error;
    }
  }

  /**
   * 更新编辑器设置
   */
  async updateEditorSettings(
    userId: string,
    settings: EditorSettings
  ): Promise<ApiResponse<User>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.patch<User>(`/users/${userId}/editor-settings`, settings);

      this.log('info', 'Editor settings updated', {
        userId,
        updatedSettings: Object.keys(settings)
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update editor settings', { userId, error });
      throw error;
    }
  }

  /**
   * 获取用户订阅信息
   */
  async getUserSubscription(userId: string): Promise<ApiResponse<UserSubscription>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.get<UserSubscription>(`/users/${userId}/subscription`);

      this.log('info', 'Retrieved user subscription', { userId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get user subscription', { userId, error });
      throw error;
    }
  }

  /**
   * 更新用户订阅
   */
  async updateUserSubscription(
    userId: string,
    subscription: Partial<UserSubscription>
  ): Promise<ApiResponse<UserSubscription>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.put<UserSubscription>(`/users/${userId}/subscription`, subscription);

      this.log('info', 'User subscription updated', {
        userId,
        updatedFields: Object.keys(subscription)
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update user subscription', { userId, error });
      throw error;
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(userId: string, reason?: string): Promise<ApiResponse<UserSubscription>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.post<UserSubscription>(`/users/${userId}/subscription/cancel`, {
        reason,
        cancelledAt: new Date().toISOString()
      });

      this.log('info', 'Subscription cancelled', { userId, reason });

      return response;

    } catch (error) {
      this.log('error', 'Failed to cancel subscription', { userId, error });
      throw error;
    }
  }

  /**
   * 密码重置请求
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    try {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ValidationError('Valid email is required');
      }

      const response = await this.post<void>('/auth/password-reset/request', {
        email: email.toLowerCase().trim()
      }, {
        skipAuth: true
      });

      this.log('info', 'Password reset requested', { email });

      return response;

    } catch (error) {
      this.log('error', 'Password reset request failed', { email, error });
      throw error;
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(request: PasswordResetRequest): Promise<ApiResponse<void>> {
    try {
      if (!request.resetToken || !request.newPassword || !request.confirmPassword) {
        throw new ValidationError('Reset token, new password and confirmation are required');
      }

      if (request.newPassword !== request.confirmPassword) {
        throw new ValidationError('Passwords do not match');
      }

      // 验证新密码强度
      const passwordValidation = this.validatePasswordStrength(request.newPassword);
      if (!passwordValidation.isValid) {
        throw new ValidationError(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      const response = await this.post<void>('/auth/password-reset/confirm', {
        resetToken: request.resetToken,
        newPassword: request.newPassword,
        resetAt: new Date().toISOString()
      }, {
        skipAuth: true
      });

      this.log('info', 'Password reset successful');

      return response;

    } catch (error) {
      this.log('error', 'Password reset failed', { error });
      throw error;
    }
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    try {
      if (!token) {
        throw new ValidationError('Verification token is required');
      }

      const response = await this.post<void>('/auth/verify-email', {
        token
      }, {
        skipAuth: true
      });

      this.log('info', 'Email verified successfully');

      return response;

    } catch (error) {
      this.log('error', 'Email verification failed', { error });
      throw error;
    }
  }

  /**
   * 重新发送验证邮件
   */
  async resendVerificationEmail(email: string): Promise<ApiResponse<void>> {
    try {
      if (!email) {
        throw new ValidationError('Email is required');
      }

      const response = await this.post<void>('/auth/resend-verification', {
        email: email.toLowerCase().trim()
      }, {
        skipAuth: true
      });

      this.log('info', 'Verification email resent', { email });

      return response;

    } catch (error) {
      this.log('error', 'Failed to resend verification email', { email, error });
      throw error;
    }
  }

  /**
   * 获取用户会话列表
   */
  async getUserSessions(userId: string): Promise<ApiResponse<SessionInfo[]>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.get<SessionInfo[]>(`/users/${userId}/sessions`);

      this.log('info', 'Retrieved user sessions', { userId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get user sessions', { userId, error });
      throw error;
    }
  }

  /**
   * 撤销会话
   */
  async revokeSession(userId: string, sessionId: string): Promise<ApiResponse<void>> {
    try {
      if (!userId || !sessionId) {
        throw new ValidationError('User ID and session ID are required');
      }

      const response = await this.delete<void>(`/users/${userId}/sessions/${sessionId}`);

      this.log('info', 'Session revoked', { userId, sessionId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to revoke session', { userId, sessionId, error });
      throw error;
    }
  }

  /**
   * 撤销所有会话
   */
  async revokeAllSessions(userId: string): Promise<ApiResponse<void>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.delete<void>(`/users/${userId}/sessions`);

      this.log('info', 'All sessions revoked', { userId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to revoke all sessions', { userId, error });
      throw error;
    }
  }

  /**
   * 获取用户统计
   */
  async getUserStatistics(userId: string): Promise<ApiResponse<any>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.get<any>(`/users/${userId}/statistics`);

      this.log('info', 'Retrieved user statistics', { userId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get user statistics', { userId, error });
      throw error;
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(
    query: string,
    filters: Partial<UserFilters> = {},
    options: {
      limit?: number;
      offset?: number;
      includeInactive?: boolean;
    } = {}
  ): Promise<ApiResponse<User[]>> {
    try {
      if (!query || typeof query !== 'string') {
        throw new ValidationError('Search query is required');
      }

      const searchRequest = {
        query: query.trim(),
        filters: {
          ...filters,
          status: options.includeInactive ? undefined : ['active']
        },
        options: {
          limit: options.limit || 20,
          offset: options.offset || 0,
          includeMetadata: true
        }
      };

      const response = await this.post<any>('/users/search', searchRequest);

      const users = response.data?.results?.map((result: any) => result.item) || [];

      this.log('info', 'User search completed', {
        query,
        resultCount: users.length
      });

      return this.createApiResponse(users);

    } catch (error) {
      this.log('error', 'User search failed', { query, error });
      throw error;
    }
  }

  /**
   * 验证邀请码
   */
  private async validateInviteCode(code: string): Promise<ApiResponse<{ valid: boolean; invitedBy?: string }>> {
    try {
      return await this.get<any>(`/auth/invite/${code}`, {
        skipAuth: true
      });
    } catch (error) {
      return this.createApiResponse({ valid: false });
    }
  }

  /**
   * 验证当前密码
   */
  private async verifyCurrentPassword(userId: string, currentPassword: string): Promise<boolean> {
    try {
      const response = await this.post<any>(`/users/${userId}/verify-password`, {
        currentPassword
      });

      return response.data?.valid || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取客户端IP
   */
  private async getClientIP(): Promise<string> {
    try {
      // 在实际实现中，这应该从请求头或服务端获取
      return '127.0.0.1';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 获取用户代理
   */
  private getUserAgent(): string {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent;
    }
    return 'Unknown';
  }

  /**
   * 生成设备ID
   */
  private generateDeviceId(): string {
    if (typeof window !== 'undefined') {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    }
    return 'unknown_device';
  }
}

/**
 * 创建用户服务实例
 */
export function createUsersService(config: UsersServiceConfig): UsersService {
  return new UsersService(config);
}

/**
 * 默认用户服务配置
 */
export const defaultUsersServiceConfig: UsersServiceConfig = {
  baseUrl: '/api/v1',
  authUrl: '/api/v1/auth',
  enableEmailVerification: true,
  enableTwoFactorAuth: false,
  enableOAuth: ['google', 'github', 'microsoft'],
  maxLoginAttempts: 5,
  sessionTimeout: 3600000,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    preventReuse: 5,
    preventCommonPasswords: true
  }
};