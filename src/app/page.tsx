/**
 * Landing Page - MindNote
 *
 * Welcome page with navigation to main app features
 */

import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  Brain,
  Search,
  BarChart3,
  Zap,
  Shield,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted/20'>
      {/* Navigation */}
      <header className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='container mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <FileText className='h-6 w-6 text-primary' />
              <h1 className='text-xl font-bold'>MindNote</h1>
            </div>

            <nav className='hidden md:flex items-center space-x-6'>
              <Link
                href='/notes'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                笔记
              </Link>
              <Link
                href='/search'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                搜索
              </Link>
              <Link
                href='/analytics'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                分析
              </Link>
              <Link
                href='/settings'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                设置
              </Link>
            </nav>

            <div className='flex items-center space-x-4'>
              <Link href='/notes/new' className='btn btn-primary'>
                开始使用
                <ArrowRight className='h-4 w-4 ml-2' />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='py-20 md:py-32'>
        <div className='container mx-auto px-4 text-center'>
          <div className='max-w-4xl mx-auto'>
            <h1 className='text-4xl md:text-6xl font-bold tracking-tight mb-6'>
              智能笔记管理
              <span className='block text-primary'>重新定义知识管理</span>
            </h1>

            <p className='text-xl text-muted-foreground mb-8 max-w-2xl mx-auto'>
              基于AI驱动的智能笔记应用，支持自动归类、关联分析、语义搜索，让您的工作和学习效率倍增。
            </p>

            <div className='flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4'>
              <Link href='/notes/new' className='btn btn-primary btn-lg'>
                <Zap className='h-5 w-5 mr-2' />
                立即开始
              </Link>
              <Link href='/notes' className='btn btn-outline btn-lg'>
                浏览示例
                <ArrowRight className='h-5 w-5 ml-2' />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className='py-20'>
        <div className='container mx-auto px-4'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl font-bold mb-4'>强大功能，简单易用</h2>
            <p className='text-muted-foreground text-lg max-w-2xl mx-auto'>
              集成最新的AI技术，为您提供前所未有的笔记管理体验
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {/* Feature 1 */}
            <div className='card card-interactive group'>
              <div className='card-content'>
                <div className='h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  <Brain className='h-6 w-6 text-primary' />
                </div>
                <h3 className='text-xl font-semibold mb-2'>AI 智能分析</h3>
                <p className='text-muted-foreground mb-4'>
                  自动分析笔记内容，智能分类打标签，提供深度洞察和建议
                </p>
                <Link
                  href='/analytics'
                  className='text-primary hover:underline flex items-center'
                >
                  了解更多
                  <ArrowRight className='h-4 w-4 ml-1' />
                </Link>
              </div>
            </div>

            {/* Feature 2 */}
            <div className='card card-interactive group'>
              <div className='card-content'>
                <div className='h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  <Search className='h-6 w-6 text-primary' />
                </div>
                <h3 className='text-xl font-semibold mb-2'>语义搜索</h3>
                <p className='text-muted-foreground mb-4'>
                  基于自然语言的智能搜索，快速找到相关内容，支持复杂查询
                </p>
                <Link
                  href='/search'
                  className='text-primary hover:underline flex items-center'
                >
                  了解更多
                  <ArrowRight className='h-4 w-4 ml-1' />
                </Link>
              </div>
            </div>

            {/* Feature 3 */}
            <div className='card card-interactive group'>
              <div className='card-content'>
                <div className='h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  <BarChart3 className='h-6 w-6 text-primary' />
                </div>
                <h3 className='text-xl font-semibold mb-2'>知识图谱</h3>
                <p className='text-muted-foreground mb-4'>
                  可视化笔记间的关联关系，发现知识网络，促进深度思考
                </p>
                <Link
                  href='/analytics'
                  className='text-primary hover:underline flex items-center'
                >
                  了解更多
                  <ArrowRight className='h-4 w-4 ml-1' />
                </Link>
              </div>
            </div>

            {/* Feature 4 */}
            <div className='card card-interactive group'>
              <div className='card-content'>
                <div className='h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  <FileText className='h-6 w-6 text-primary' />
                </div>
                <h3 className='text-xl font-semibold mb-2'>富文本编辑</h3>
                <p className='text-muted-foreground mb-4'>
                  现代化的编辑器界面，支持Markdown、实时预览、自动保存
                </p>
                <Link
                  href='/notes/new'
                  className='text-primary hover:underline flex items-center'
                >
                  了解更多
                  <ArrowRight className='h-4 w-4 ml-1' />
                </Link>
              </div>
            </div>

            {/* Feature 5 */}
            <div className='card card-interactive group'>
              <div className='card-content'>
                <div className='h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  <Shield className='h-6 w-6 text-primary' />
                </div>
                <h3 className='text-xl font-semibold mb-2'>隐私安全</h3>
                <p className='text-muted-foreground mb-4'>
                  端到端加密，数据本地存储，完全掌控您的知识资产
                </p>
                <Link
                  href='/settings'
                  className='text-primary hover:underline flex items-center'
                >
                  了解更多
                  <ArrowRight className='h-4 w-4 ml-1' />
                </Link>
              </div>
            </div>

            {/* Feature 6 */}
            <div className='card card-interactive group'>
              <div className='card-content'>
                <div className='h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'>
                  <Zap className='h-6 w-6 text-primary' />
                </div>
                <h3 className='text-xl font-semibold mb-2'>快速响应</h3>
                <p className='text-muted-foreground mb-4'>
                  优化的性能表现，离线支持，随时随地记录灵感
                </p>
                <Link
                  href='/notes'
                  className='text-primary hover:underline flex items-center'
                >
                  了解更多
                  <ArrowRight className='h-4 w-4 ml-1' />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-20 bg-muted/30'>
        <div className='container mx-auto px-4 text-center'>
          <div className='max-w-3xl mx-auto'>
            <h2 className='text-3xl font-bold mb-4'>
              准备好提升您的知识管理效率了吗？
            </h2>
            <p className='text-muted-foreground text-lg mb-8'>
              加入数万用户的选择，体验AI驱动的智能笔记管理
            </p>

            <Link href='/notes/new' className='btn btn-primary btn-lg'>
              <Zap className='h-5 w-5 mr-2' />
              免费开始使用
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t py-12'>
        <div className='container mx-auto px-4'>
          <div className='flex flex-col md:flex-row items-center justify-between'>
            <div className='flex items-center space-x-2 mb-4 md:mb-0'>
              <FileText className='h-6 w-6 text-primary' />
              <span className='font-semibold'>MindNote</span>
              <span className='text-muted-foreground'>
                © 2025 智能笔记应用
              </span>
            </div>

            <nav className='flex items-center space-x-6'>
              <Link
                href='/notes'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                笔记
              </Link>
              <Link
                href='/search'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                搜索
              </Link>
              <Link
                href='/analytics'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                分析
              </Link>
              <Link
                href='/settings'
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                设置
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
