/**
 * SEO 优化工具
 * 提供元数据、结构化数据和 Open Graph 标签
 */

import { Metadata } from 'next';

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

/**
 * 生成页面元数据
 */
export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    image = '/og-image.png',
    url,
    type = 'website',
    author,
    publishedTime,
    modifiedTime,
    section,
    tags = [],
  } = config;

  const siteName = 'EduNexus';
  const fullTitle = `${title} | ${siteName}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: author ? [{ name: author }] : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'zh_CN',
      type,
      ...(type === 'article' && {
        publishedTime,
        modifiedTime,
        section,
        tags,
        authors: author ? [author] : undefined,
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: author,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * 生成结构化数据 (JSON-LD)
 */
export function generateStructuredData(type: 'website' | 'article' | 'course' | 'organization', data: any) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://edunexus.example.com';

  const schemas: Record<string, any> = {
    website: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'EduNexus',
      description: 'AI 教育生态平台',
      url: baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    article: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: data.title,
      description: data.description,
      image: data.image,
      datePublished: data.publishedTime,
      dateModified: data.modifiedTime,
      author: {
        '@type': 'Person',
        name: data.author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'EduNexus',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/logo.png`,
        },
      },
    },
    course: {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: data.name,
      description: data.description,
      provider: {
        '@type': 'Organization',
        name: 'EduNexus',
        sameAs: baseUrl,
      },
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: data.duration,
      },
    },
    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'EduNexus',
      url: baseUrl,
      logo: `${baseUrl}/logo.png`,
      description: 'AI 教育生态平台',
      sameAs: [
        // 社交媒体链接
      ],
    },
  };

  return schemas[type];
}

/**
 * 生成面包屑结构化数据
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * 生成 FAQ 结构化数据
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * 页面 SEO 配置预设
 */
export const seoPresets = {
  home: {
    title: '首页',
    description: 'EduNexus - AI 教育生态平台，统一学习引导、知识沉淀、图谱分析与路径干预',
    keywords: ['AI教育', '学习平台', '知识管理', '个性化学习'],
  },
  workspace: {
    title: '学习工作区',
    description: '用分层引导完成推理过程，沉淀可复盘会话',
    keywords: ['学习工作区', '思维引导', '学习记录'],
  },
  graph: {
    title: '知识星图',
    description: '定位高风险关系链，并把批次直接推送到学习执行面',
    keywords: ['知识图谱', '关系分析', '学习路径'],
  },
  path: {
    title: '成长地图',
    description: '基于图谱焦点生成可执行任务序列，并持续回写掌握度',
    keywords: ['学习路径', '技能树', '成长规划'],
  },
  kb: {
    title: '知识宝库',
    description: '用双链与检索组织长期知识资产，形成个人学习语境',
    keywords: ['知识库', '笔记管理', '双向链接'],
  },
  dashboard: {
    title: '生态看板',
    description: '统一追踪学习增益、提示依赖和风险干预结果',
    keywords: ['数据分析', '学习统计', '进度追踪'],
  },
  settings: {
    title: '配置中心',
    description: '统一管理策略模板、导入审计与系统参数',
    keywords: ['系统设置', '配置管理', '参数调整'],
  },
};

/**
 * 生成 sitemap 条目
 */
export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function generateSitemapEntries(): SitemapEntry[] {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://edunexus.example.com';

  return [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/workspace`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/graph`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/path`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/kb`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/dashboard`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/settings`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
