// src/ui/editor/chat/MarkdownContent.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './MarkdownContent.module.scss';

type MarkdownContentProps = {
  content: string;
};

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
          ul: ({ children }) => <ul>{children}</ul>,
          ol: ({ children }) => <ol>{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code {...props}>{children}</code>
            ) : (
              <pre>
                <code {...props}>{children}</code>
              </pre>
            ),
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          blockquote: ({ children }) => <blockquote>{children}</blockquote>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
