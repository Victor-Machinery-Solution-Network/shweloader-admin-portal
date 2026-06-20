/**
 * Minimal, dependency-free Markdown → HTML renderer for read-only views of
 * admin-authored descriptions (e.g. the listing detail page).
 *
 * The editor saves Markdown (tiptap-markdown). For read-only display we render
 * it to plain semantic HTML and let a `prose` (Tailwind Typography) wrapper
 * style it — so lists, headings, etc. render exactly like the public site
 * instead of showing raw Markdown source (escaped "1\." dots, stray markers).
 *
 * Kept in lockstep with the public web app's renderer
 * (shweloader-public-web-app/src/components/blogs/markdown.ts) — same parsing,
 * same list fixes. Only the output tags differ (bare tags here vs the public
 * site's design classes). Raw HTML is escaped and link/image URLs are
 * scheme-allowlisted, so the output is safe to inject — no DOM sanitizer needed.
 *
 * Supported: ATX headings, unordered + ordered lists, blockquotes, fenced code,
 * horizontal rules, paragraphs, and inline emphasis / code / links / images.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Allowlist a link/image URL by scheme. Raw HTML is already escaped by the time
 * we get here, so URLs in `href`/`src` are the only remaining injection vector.
 * Permit http(s)/mailto/tel and scheme-less (relative, #anchor, //host) URLs;
 * neutralize everything else (javascript:, data:, …) to "#".
 */
function safeUrl(url: string): string {
  const u = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  const colon = u.indexOf(":");
  const sep = u.search(/[/?#]/);
  if (colon === -1 || (sep !== -1 && colon > sep)) return u;
  return "#";
}

/** Inline spans — emphasis, code, links, images. Input is already block text. */
function renderInline(src: string): string {
  let out = escapeHtml(src);

  // inline code first so its contents aren't re-processed for emphasis
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);

  // images: ![alt](url)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_m, alt: string, url: string) =>
      `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy" />`,
  );

  // links: [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_m, text: string, url: string) =>
      `<a href="${safeUrl(url)}" rel="nofollow noopener" target="_blank">${text}</a>`,
  );

  // bold then italic
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");

  // Unescape CommonMark backslash-escapes left after parsing (e.g. "\*" → "*").
  out = out.replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, "$1");

  return out;
}

interface Block {
  type:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "p"
    | "quote"
    | "ul"
    | "ol"
    | "code"
    | "hr";
  text?: string;
  items?: string[];
  code?: string;
  /** First item's number for ordered lists (keeps an `<ol start>` accurate). */
  start?: number;
}

function parseBlocks(md: string): Block[] {
  const lines = md
    .replace(/\r\n?/g, "\n")
    // tiptap emits CommonMark hard breaks as a trailing backslash, and a lone
    // "\" for blank lines between paragraphs. Drop the trailing backslash so
    // those become real blank lines (paragraph breaks).
    .replace(/\\[ \t]*(?=\n|$)/g, "")
    .split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];

    // blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // fenced code
    const fence = line.match(/^\s*(```+|~~~+)(.*)$/);
    if (fence) {
      const marker = fence[1][0];
      const codeLines: string[] = [];
      const closeFence = marker === "`" ? /^\s*`{3,}\s*$/ : /^\s*~{3,}\s*$/;
      i++;
      while (i < lines.length && !closeFence.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: "code", code: codeLines.join("\n") });
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // heading
    const heading = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({ type: `h${level}` as Block["type"], text: heading[2] });
      i++;
      continue;
    }

    // blockquote (consume consecutive `>` lines)
    if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ").trim() });
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // ordered list. The marker dot may be backslash-escaped ("1\.") — tiptap
    // escapes the leading number-dot of a paragraph it serialized from a list
    // item that wasn't inside the <ol> node, so the first item of a typed
    // "1…10" list often arrives as "1\." while 2…10 stay "2.". Treat the escaped
    // form as a real marker so it folds back into the list (one aligned <ol>)
    // instead of leaving a flush-left paragraph above an indented list.
    const ORDERED = /^\s*(\d+)\\?[.)]\s+/;
    const olStart = line.match(ORDERED);
    if (olStart) {
      const items: string[] = [];
      const start = parseInt(olStart[1], 10);
      let expected = start;
      while (i < lines.length) {
        const m = lines[i].match(ORDERED);
        if (m) {
          items.push(lines[i].replace(ORDERED, ""));
          expected = parseInt(m[1], 10) + 1;
          i++;
          continue;
        }
        // Look past blank lines: if the list resumes with the next expected
        // number, it's a continuation — keep it one list (don't restart at 1).
        if (!lines[i].trim()) {
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          const next = j < lines.length ? lines[j].match(ORDERED) : null;
          if (next && parseInt(next[1], 10) === expected) {
            i = j;
            continue;
          }
        }
        break;
      }
      blocks.push({ type: "ol", items, start });
      continue;
    }

    // paragraph (consume until blank line / next block start)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      const l = lines[i];
      if (
        /^\s*(#{1,6})\s+/.test(l) ||
        /^\s*>/.test(l) ||
        /^\s*[-*+]\s+/.test(l) ||
        /^\s*\d+\\?[.)]\s+/.test(l) ||
        /^\s*(```+|~~~+)/.test(l) ||
        /^\s*([-*_])(\s*\1){2,}\s*$/.test(l)
      ) {
        break;
      }
      paraLines.push(l.trim());
      i++;
    }
    line = paraLines.join(" ");
    if (line) blocks.push({ type: "p", text: line });
  }

  return blocks;
}

/**
 * Render Markdown to a plain-HTML string (bare semantic tags). Wrap the result
 * in a `prose` container for styling.
 */
export function markdownToHtml(md: string | null | undefined): string {
  if (!md?.trim()) return "";
  return parseBlocks(md)
    .map((b) => {
      switch (b.type) {
        case "h1":
        case "h2":
          return `<h2>${renderInline(b.text ?? "")}</h2>`;
        case "h3":
        case "h4":
        case "h5":
        case "h6":
          return `<h3>${renderInline(b.text ?? "")}</h3>`;
        case "quote":
          return `<blockquote>${renderInline(b.text ?? "")}</blockquote>`;
        case "ul":
          return `<ul>${(b.items ?? [])
            .map((it) => `<li>${renderInline(it)}</li>`)
            .join("")}</ul>`;
        case "ol": {
          const startAttr = b.start && b.start !== 1 ? ` start="${b.start}"` : "";
          return `<ol${startAttr}>${(b.items ?? [])
            .map((it) => `<li>${renderInline(it)}</li>`)
            .join("")}</ol>`;
        }
        case "code":
          return `<pre><code>${escapeHtml(b.code ?? "")}</code></pre>`;
        case "hr":
          return `<hr />`;
        default:
          return `<p>${renderInline(b.text ?? "")}</p>`;
      }
    })
    .join("\n");
}
