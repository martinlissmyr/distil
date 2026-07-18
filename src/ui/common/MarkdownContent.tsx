// src/ui/common/MarkdownContent.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remend from 'remend';
import styles from './MarkdownContent.module.scss';

type MarkdownContentProps = {
  content: string;
  size?: string;
  compact?: boolean;
  isStreaming?: boolean;
};

const markdownComponents: Components = {
  p: ({ children }) => <p>{children}</p>,
  h1: ({ children }) => <h1>{children}</h1>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  code: ({ children, className, ...props }) =>
    className ? (
      <pre>
        <code className={className} {...props}>{children}</code>
      </pre>
    ) : (
      <code {...props}>{children}</code>
    ),
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
};

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  size = 'sm',
  compact = true,
  isStreaming = false,
}) => {
  const renderedContent = isStreaming
    ? remend(content, {
        images: false,
        links: false,
        katex: false,
      })
    : content;

  return (
    <div className={styles.markdown} data-size={size} data-compact={compact}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {renderedContent}
      </ReactMarkdown>
    </div>
  );
};
