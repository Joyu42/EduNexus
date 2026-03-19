/**
 * 图片优化工具
 * 提供懒加载、响应式图片和占位符功能
 */

'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder'> {
  /**
   * 是否启用懒加载
   */
  lazy?: boolean;
  /**
   * 模糊占位符
   */
  blurDataURL?: string;
  /**
   * 加载失败时的回退图片
   */
  fallbackSrc?: string;
}

/**
 * 优化的图片组件
 * - 自动懒加载
 * - 模糊占位符
 * - 加载失败回退
 * - 响应式尺寸
 */
export function OptimizedImage({
  lazy = true,
  blurDataURL,
  fallbackSrc = '/images/placeholder.png',
  alt,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [lazy]);

  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className="bg-muted animate-pulse"
        style={{
          width: props.width,
          height: props.height,
        }}
      />
    );
  }

  return (
    <Image
      {...props}
      src={error ? fallbackSrc : props.src}
      alt={alt}
      placeholder={blurDataURL ? 'blur' : 'empty'}
      blurDataURL={blurDataURL}
      onError={() => setError(true)}
      loading={lazy ? 'lazy' : 'eager'}
    />
  );
}

/**
 * 生成简单的模糊占位符
 */
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return '';

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 创建渐变背景
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f0f0f0');
  gradient.addColorStop(1, '#e0e0e0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
}

/**
 * 响应式图片尺寸计算
 */
export function getResponsiveImageSizes(breakpoints: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}): string {
  const sizes: string[] = [];

  if (breakpoints.mobile) {
    sizes.push(`(max-width: 640px) ${breakpoints.mobile}px`);
  }
  if (breakpoints.tablet) {
    sizes.push(`(max-width: 1024px) ${breakpoints.tablet}px`);
  }
  if (breakpoints.desktop) {
    sizes.push(`${breakpoints.desktop}px`);
  }

  return sizes.join(', ');
}

/**
 * 预加载关键图片
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 批量预加载图片
 */
export async function preloadImages(srcs: string[]): Promise<void> {
  await Promise.all(srcs.map(preloadImage));
}
