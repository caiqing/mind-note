/**
 * 图片优化工具
 */

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  crop?: boolean;
  sharpen?: boolean;
}

export interface OptimizedImageResult {
  src: string;
  srcSet?: string;
  sizes?: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export class ImageOptimizer {
  private cdnUrl: string;
  private defaultOptions: ImageOptimizationOptions;

  constructor(
    cdnUrl: string = '',
    defaultOptions: ImageOptimizationOptions = {},
  ) {
    this.cdnUrl = cdnUrl.replace(/\/$/, ''); // 移除尾部斜杠
    this.defaultOptions = {
      quality: 80,
      format: 'webp',
      ...defaultOptions,
    };
  }

  /**
   * 生成优化后的图片URL
   */
  generateOptimizedUrl(
    originalUrl: string,
    options: ImageOptimizationOptions = {},
  ): string {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const url = new URL(originalUrl, window.location.origin);

    // 如果配置了CDN，使用CDN域名
    if (this.cdnUrl) {
      const pathParts = url.pathname.split('/');
      const fileName = pathParts.pop();
      const path = pathParts.join('/');

      // 构建CDN URL
      const cdnUrl = new URL(`${this.cdnUrl}${path}/${fileName}`);

      // 添加优化参数
      this.addOptimizationParams(cdnUrl, mergedOptions);

      return cdnUrl.toString();
    }

    // 本地优化（使用next/image的参数格式）
    this.addOptimizationParams(url, mergedOptions);
    return url.toString();
  }

  /**
   * 生成响应式图片srcset
   */
  generateResponsiveSrcSet(
    originalUrl: string,
    breakpoints: number[] = [320, 640, 768, 1024, 1280, 1536],
    options: ImageOptimizationOptions = {},
  ): string {
    const srcSetItems = breakpoints.map(width => {
      const optimizedUrl = this.generateOptimizedUrl(originalUrl, {
        ...options,
        width,
      });
      return `${optimizedUrl} ${width}w`;
    });

    return srcSetItems.join(', ');
  }

  /**
   * 生成完整的响应式图片配置
   */
  generateResponsiveImage(
    originalUrl: string,
    alt: string,
    options: ImageOptimizationOptions & {
      widths?: number[];
      sizes?: string;
      loading?: 'lazy' | 'eager';
      priority?: boolean;
    } = {},
  ): OptimizedImageResult & {
    alt: string;
    srcSet: string;
    sizes: string;
    loading: string;
  } {
    const {
      widths = [320, 640, 768, 1024, 1280, 1536],
      sizes = '100vw',
      loading = 'lazy',
      priority = false,
      ...optimizationOptions
    } = options;

    const srcSet = this.generateResponsiveSrcSet(
      originalUrl,
      widths,
      optimizationOptions,
    );
    const src = this.generateOptimizedUrl(originalUrl, optimizationOptions);

    return {
      src,
      srcSet,
      sizes,
      width: optimizationOptions.width || widths[widths.length - 1],
      height: optimizationOptions.height || 400,
      format:
        optimizationOptions.format || this.defaultOptions.format || 'webp',
      size: 0, // 实际大小需要从服务器获取
      alt,
      loading,
      priority,
    };
  }

  /**
   * 预加载优化图片
   */
  async preloadOptimizedImage(
    originalUrl: string,
    options: ImageOptimizationOptions = {},
  ): Promise<HTMLImageElement> {
    const optimizedUrl = this.generateOptimizedUrl(originalUrl, options);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = optimizedUrl;
    });
  }

  /**
   * 批量预加载图片
   */
  async preloadImages(
    images: Array<{ url: string; options?: ImageOptimizationOptions }>,
  ): Promise<HTMLImageElement[]> {
    const promises = images.map(({ url, options }) =>
      this.preloadOptimizedImage(url, options),
    );

    return Promise.allSettled(promises).then(results =>
      results
        .filter(
          (result): result is PromiseFulfilledResult<HTMLImageElement> =>
            result.status === 'fulfilled',
        )
        .map(result => result.value),
    );
  }

  /**
   * 生成图片占位符
   */
  generatePlaceholder(
    width: number,
    height: number,
    options: {
      format?: 'svg' | 'blur' | 'pixel';
      backgroundColor?: string;
      textColor?: string;
      text?: string;
    } = {},
  ): string {
    const {
      format = 'svg',
      backgroundColor = '#f3f4f6',
      textColor = '#9ca3af',
      text = `${width}×${height}`,
    } = options;

    if (format === 'svg') {
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${backgroundColor}"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
                fill="${textColor}" font-family="system-ui, sans-serif" font-size="14">
            ${text}
          </text>
        </svg>
      `.trim();

      return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    if (format === 'blur') {
      // 生成模糊占位符（base64编码的1x1像素图片）
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, 1, 1);

      return canvas.toDataURL('image/jpeg', 0.1);
    }

    // 默认返回简单颜色
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }

  /**
   * 计算图片优化后的大小估算
   */
  estimateOptimizedSize(
    originalSize: number,
    originalFormat: string,
    options: ImageOptimizationOptions = {},
  ): number {
    const { quality = 80, format = 'webp', width, height } = options;

    let estimatedSize = originalSize;

    // 格式压缩率
    const compressionRates: Record<string, number> = {
      webp: 0.75,
      avif: 0.65,
      jpeg: 0.85,
      png: 0.9,
    };

    if (compressionRates[format]) {
      estimatedSize *= compressionRates[format];
    }

    // 质量调整
    estimatedSize *= quality / 100;

    // 尺寸调整（如果提供了新尺寸）
    if (width && height) {
      // 假设原图尺寸（这里应该从实际图片元数据获取）
      const estimatedOriginalWidth = 1920;
      const estimatedOriginalHeight = 1080;
      const sizeRatio =
        (width * height) / (estimatedOriginalWidth * estimatedOriginalHeight);
      estimatedSize *= sizeRatio;
    }

    return Math.round(estimatedSize);
  }

  /**
   * 检查浏览器支持的图片格式
   */
  getSupportedFormats(): string[] {
    const formats = [];

    // 检查WebP支持
    if (this.supportsFormat('webp')) {
      formats.push('webp');
    }

    // 检查AVIF支持
    if (this.supportsFormat('avif')) {
      formats.push('avif');
    }

    // 总是支持JPEG和PNG
    formats.push('jpeg', 'png');

    return formats;
  }

  /**
   * 获取最佳图片格式
   */
  getBestFormat(): string {
    const supportedFormats = this.getSupportedFormats();

    if (supportedFormats.includes('avif')) {
      return 'avif';
    }

    if (supportedFormats.includes('webp')) {
      return 'webp';
    }

    return 'jpeg';
  }

  /**
   * 添加优化参数到URL
   */
  private addOptimizationParams(
    url: URL,
    options: ImageOptimizationOptions,
  ): void {
    const params = url.searchParams;

    if (options.quality !== undefined) {
      params.set('q', options.quality.toString());
    }

    if (options.format) {
      params.set('f', options.format);
    }

    if (options.width) {
      params.set('w', options.width.toString());
    }

    if (options.height) {
      params.set('h', options.height.toString());
    }

    if (options.crop) {
      params.set('c', '1');
    }

    if (options.sharpen) {
      params.set('s', '1');
    }
  }

  /**
   * 检查浏览器是否支持特定格式
   */
  private supportsFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return false;
    }

    const dataUrl = `data:image/${format};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;

    return (
      canvas.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0
    );
  }
}

// 全局图片优化器实例
export const imageOptimizer = new ImageOptimizer(
  process.env.NEXT_PUBLIC_CDN_URL || '',
  {
    quality: 80,
    format: 'webp',
  },
);

// React Hook for image optimization
export function useOptimizedImage(
  src: string,
  options: ImageOptimizationOptions = {},
) {
  const optimizedSrc = imageOptimizer.generateOptimizedUrl(src, options);
  const srcSet = imageOptimizer.generateResponsiveSrcSet(
    src,
    [640, 768, 1024, 1280],
    options,
  );

  return {
    src: optimizedSrc,
    srcSet,
    sizes: options.width ? `${options.width}px` : '100vw',
    width: options.width,
    height: options.height,
    loading: 'lazy' as const,
  };
}
