/**
 * NextAuth 配置导出
 */

import { NextAuthOptions } from 'next-auth';
import { authConfig } from '@/lib/auth/auth.config';

export const authOptions: NextAuthOptions = {
  ...authConfig,
};

export type { Session, User, Account, Profile } from 'next-auth';
