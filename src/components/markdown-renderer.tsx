'use client'

import ReactMarkdown from 'react-markdown'
import type { Components, ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

type CodeProps = JSX.IntrinsicElements['code'] & ExtraProps & { inline?: boolean }

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code({ inline, children, className, node: _node, ...props }: CodeProps) {
    const combinedClassName = [className, inline ? 'px-1 py-0.5 bg-gray-100 rounded text-sm' : 'text-sm']
      .filter(Boolean)
      .join(' ')

    if (inline) {
      return (
        <code className={combinedClassName} {...props}>
          {children}
        </code>
      )
    }

    return (
      <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
        <code className={combinedClassName} {...props}>
          {children}
        </code>
      </pre>
    )
  },
  table: ({ children }) => (
    <div className="my-4 w-full max-w-full overflow-hidden">
      <div className="max-w-full overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full table-fixed divide-y divide-gray-200">{children}</table>
      </div>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
  ),
  tr: ({ children }) => <tr className="hover:bg-gray-50">{children}</tr>,
  th: ({ children }) => (
    <th className="min-w-0 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-normal break-words align-top">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="min-w-0 px-2 py-2 text-sm text-gray-900 whitespace-normal break-words align-top">
      {children}
    </td>
  ),
  h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 mt-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mb-2 mt-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold mb-1 mt-2">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-gray-200" />,
  a: ({ href, children }) => (
    <a href={href ?? '#'} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none overflow-hidden markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
