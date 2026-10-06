"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Gemini answers in Markdown. react-markdown renders it to React elements (no
// raw HTML is ever injected), and these overrides give it the app's look.
const components = {
  p: ({ node, ...props }) => <p className="my-3 first:mt-0 last:mb-0" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  a: ({ node, ...props }) => (
    <a
      target="_blank"
      rel="noopener noreferrer"
       className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
       {...props}
      
    />
  ),
  ul: ({ node, ...props }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-muted-foreground" {...props} />
   
  ),
  ol: ({ node, ...props }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-muted-foreground" {...props} />
  ),
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
  h1: ({ node, ...props }) => <h3 className="mb-2 mt-5 text-base font-semibold text-foreground first:mt-0" {...props} />,
  h2: ({ node, ...props }) => <h3 className="mb-2 mt-5 text-base font-semibold text-foreground first:mt-0" {...props} />,
  h3: ({ node, ...props }) => <h4 className="mb-1.5 mt-4 text-[15px] font-semibold text-foreground first:mt-0" {...props} />,
  h4: ({ node, ...props }) => <h4 className="mb-1.5 mt-4 text-[15px] font-semibold text-foreground first:mt-0" {...props} />,
  blockquote: ({ node, ...props }) => (
   <blockquote className="my-3 border-l-2 border-border pl-4 text-muted-foreground" {...props} />
  ),
  hr: ({ node, ...props }) => <hr className="my-5 border-border" {...props} />,
  code: ({ node, ...props }) => (
    <code className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground" {...props} />
   
  ),
  pre: ({ node, ...props }) => (
    <pre
      className="my-3 overflow-x-auto rounded-xl border border-border bg-slate-950 p-4 text-sm text-slate-100 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit"
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
     <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node, ...props }) => (
    <th className="border-b border-border bg-surface-muted px-3 py-2 text-left font-semibold text-foreground" {...props} />
   ),
  
  td: ({ node, ...props }) => (
    <td className="border-b border-border px-3 py-2 align-top last:border-b-0" {...props} />
  ),
};

export default function Markdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}