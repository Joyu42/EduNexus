"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const linkClassName =
    "text-orange-600 hover:text-orange-700 underline decoration-orange-300 hover:decoration-orange-500 transition-colors";

  const isExternalHref = (href: string) => /^(https?:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
        components={{
          // 代码块样式
          code({ node, className, children, ...props }: any) {
            const inline = !className;
            return inline ? (
              <code
                className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={`block p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto ${className || ""}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          // 标题样式
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-5 mb-3 text-gray-800">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800">
              {children}
            </h3>
          ),
          // 段落样式
          p: ({ children }) => (
            <p className="my-3 leading-7 text-gray-700">{children}</p>
          ),
          // 列表样式
          ul: ({ children }) => (
            <ul className="my-3 ml-6 list-disc space-y-2 text-gray-700">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 ml-6 list-decimal space-y-2 text-gray-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),
          // 引用样式
          blockquote: ({ children }) => (
            <blockquote className="my-4 pl-4 border-l-4 border-orange-400 bg-orange-50 py-2 pr-4 rounded-r italic text-gray-700">
              {children}
            </blockquote>
          ),
          // 表格样式
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 border border-gray-300 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-gray-700">{children}</td>
          ),
          // 链接样式
          a: ({ href, children }) => {
            const safeHref = typeof href === "string" ? href.trim() : "";
            if (!safeHref) {
              return <span>{children}</span>;
            }

            if (safeHref.startsWith("/")) {
              return (
                <Link href={safeHref} className={linkClassName}>
                  {children}
                </Link>
              );
            }

            return (
              <a
                href={safeHref}
                target={isExternalHref(safeHref) ? "_blank" : undefined}
                rel={isExternalHref(safeHref) ? "noopener noreferrer" : undefined}
                className={linkClassName}
              >
                {children}
              </a>
            );
          },
          // 分隔线样式
          hr: () => <hr className="my-6 border-t-2 border-gray-200" />,
          // 强调样式
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800">{children}</em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
