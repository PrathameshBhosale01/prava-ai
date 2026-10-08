"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Article-scale Markdown. react-markdown builds React elements (no raw HTML is ever
// injected) and its default URL transform drops javascript: links. On top of that:
//  - <img> is disabled: photos are attached through the gallery, and remote images
//    inside a post would let authors track readers.
//  - the post title is the page's <h1>, so Markdown # / ## become <h2> / <h3>.
//  - links open in a new tab with rel=ugc so we don't pass SEO weight to user links.
const components = {
  p: ({ node, ...props }) => <p className="my-4 first:mt-0 last:mb-0" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  a: ({ node, ...props }) => (
    <a
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      {...props}
    />
  ),
  h1: ({ node, ...props }) => <h2 className="mb-3 mt-9 text-2xl font-semibold tracking-tight text-foreground first:mt-0" {...props} />,
  h2: ({ node, ...props }) => <h2 className="mb-3 mt-9 text-2xl font-semibold tracking-tight text-foreground first:mt-0" {...props} />,
  h3: ({ node, ...props }) => <h3 className="mb-2 mt-7 text-xl font-semibold tracking-tight text-foreground first:mt-0" {...props} />,
  h4: ({ node, ...props }) => <h4 className="mb-2 mt-6 text-lg font-semibold text-foreground first:mt-0" {...props} />,
  ul: ({ node, ...props }) => <ul className="my-4 list-disc space-y-2 pl-6 marker:text-muted-foreground" {...props} />,
  ol: ({ node, ...props }) => <ol className="my-4 list-decimal space-y-2 pl-6 marker:font-medium marker:text-muted-foreground" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote className="my-5 border-l-4 border-primary/40 bg-surface-muted/60 py-2 pl-5 pr-3 italic text-muted-foreground" {...props} />
  ),
  hr: ({ node, ...props }) => <hr className="my-8 border-border" {...props} />,
  code: ({ node, ...props }) => (
    <code className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground" {...props} />
  ),
  pre: ({ node, ...props }) => (
    <pre
      className="my-5 overflow-x-auto rounded-xl border border-border bg-slate-950 p-4 text-sm text-slate-100 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit"
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node, ...props }) => <th className="border-b border-border bg-surface-muted px-3 py-2 text-left font-semibold text-foreground" {...props} />,
  td: ({ node, ...props }) => <td className="border-b border-border px-3 py-2 align-top" {...props} />,
};

export default function PostBody({ children }) {
  return (
    <div className="break-words text-[17px] leading-8 text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} disallowedElements={["img"]} unwrapDisallowed>
        {children}
      </ReactMarkdown>
    </div>
  );
}
