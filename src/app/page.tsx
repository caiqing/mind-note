import Link from 'next/link';

export default function Home() {
  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>MindNote</h1>
          <p className='text-xl text-gray-600 mb-8'>
            智能记录、自动归类、关联分析的下一代笔记应用
          </p>

          {/* Quick Actions */}
          <div className='mb-12'>
            <h2 className='text-2xl font-semibold text-gray-900 mb-6'>
              快速开始
            </h2>
            <div className='flex justify-center gap-4'>
              <Link href='/auth/signin'>
                <button className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow'>
                  登录应用
                </button>
              </Link>
              <Link href='/notes'>
                <button className='bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow'>
                  查看笔记
                </button>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto'>
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-2xl font-semibold mb-4 text-blue-600'>
                智能记录
              </h2>
              <p className='text-gray-700'>
                随手记录各种类型的信息，系统自动识别和分类
              </p>
            </div>

            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-2xl font-semibold mb-4 text-green-600'>
                自动归类
              </h2>
              <p className='text-gray-700'>
                AI自动打标签进行内容标注，让信息井井有条
              </p>
            </div>

            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-2xl font-semibold mb-4 text-purple-600'>
                关联分析
              </h2>
              <p className='text-gray-700'>
                后台定期对所有笔记进行关联性分析，发现知识联系
              </p>
            </div>

            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-2xl font-semibold mb-4 text-orange-600'>
                关系图谱
              </h2>
              <p className='text-gray-700'>
                可视化展现笔记关联关系，构建知识网络
              </p>
            </div>

            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-2xl font-semibold mb-4 text-pink-600'>
                AI对话
              </h2>
              <p className='text-gray-700'>基于相关笔记内容与AI进行深入讨论</p>
            </div>

            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-2xl font-semibold mb-4 text-indigo-600'>
                播客生成
              </h2>
              <p className='text-gray-700'>
                一键基于相关对话报告生成在线播客并分享
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
