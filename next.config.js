/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode
  reactStrictMode: true,

  // Optimize server startup
  serverExternalPackages: ['pg', 'ioredis'],

  // Webpack configuration for better development experience
  webpack: (config, { dev, isServer }) => {
    // Development-specific configurations
    if (dev) {
      // Enable faster hot reload
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };

      // Improve source map generation for debugging
      config.devtool = 'eval-cheap-module-source-map';
    }

    // Add custom aliases for cleaner imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@components': './src/components',
      '@lib': './src/lib',
      '@app': './src/app',
      '@hooks': './src/hooks',
      '@types': './src/types',
      '@utils': './src/lib/utils',
      '@styles': './src/styles',
      '@tests': './tests',
    };

    // Handle file-loader for static assets
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg|webp|ico)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/images/[name].[hash][ext]',
      },
    });

    // Handle font files
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name].[hash][ext]',
      },
    });

    return config;
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '3001',
        pathname: '/api/placeholder/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },

  // Compression for development
  compress: true,

  // Power by header
  poweredByHeader: false,

  // Development server configuration
  ...(process.env.NODE_ENV === 'development' && {
    async rewrites() {
      return [
        // API health check endpoint
        {
          source: '/api/health/:path*',
          destination: '/api/internal/health/:path*',
        },
      ];
    },
  }),

  // Static file configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Redirects for common routes
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/signin',
        destination: '/auth/signin',
        permanent: false,
      },
      {
        source: '/signup',
        destination: '/auth/signup',
        permanent: false,
      },
    ];
  },
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  // Development-only configurations
  nextConfig.compiler = {
    removeConsole: false, // Keep console logs in development
  };
}

module.exports = nextConfig;
