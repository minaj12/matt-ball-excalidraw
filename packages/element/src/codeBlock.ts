import type { ExcalidrawElement } from "./types";

type CodeBlockData = {
  title?: string;
  language?: string;
  code?: string;
};

const KEYWORDS =
  /\b(const|let|var|function|return|if|else|for|while|class|new|import|from|export|default|async|await|try|catch|throw|true|false|null|undefined|public|private|static|void|int|char|float|double|struct|include|def|print|pass|in|of|this|extends)\b/g;

const TOKEN_PATTERN =
  /(\/\/.*|#.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;

const colorToken = (token: string, language: string) => {
  if (/^(\/\/|#)/.test(token)) return "#6a9955";
  if (/^["'`]/.test(token)) return "#ce9178";
  if (/^\d/.test(token)) return "#b5cea8";
  KEYWORDS.lastIndex = 0;
  if (KEYWORDS.test(token)) return "#569cd6";
  if (/^[A-Z]/.test(token)) return "#4ec9b0";
  if (language === "json" && /^(true|false|null)$/.test(token)) return "#569cd6";
  return "#d4d4d4";
};

const drawHighlightedLine = (
  context: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  language: string,
) => {
  TOKEN_PATTERN.lastIndex = 0;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(line))) {
    const before = line.slice(cursor, match.index);
    context.fillStyle = "#d4d4d4";
    context.fillText(before, x, y);
    x += context.measureText(before).width;
    context.fillStyle = colorToken(match[0], language);
    context.fillText(match[0], x, y);
    x += context.measureText(match[0]).width;
    cursor = match.index + match[0].length;
  }
  const rest = line.slice(cursor);
  context.fillStyle = "#d4d4d4";
  context.fillText(rest, x, y);
};

export const renderCodeBlock = (
  element: ExcalidrawElement,
  context: CanvasRenderingContext2D,
) => {
  if (element.type !== "rectangle") return;
  const data = element.customData?.codeBlock as CodeBlockData | undefined;
  if (!data) return;

  const title = (data.title || "Code").slice(0, 80);
  const language = (data.language || "javascript").toLowerCase();
  const code = data.code || "";

  context.save();
  context.beginPath();
  context.rect(0, 0, element.width, element.height);
  context.clip();

  context.fillStyle = "#111827";
  context.fillRect(0, 0, element.width, 42);
  context.fillStyle = "#f9fafb";
  context.font = "600 15px sans-serif";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(title, 18, 21, Math.max(40, element.width - 150));

  context.fillStyle = "#9ca3af";
  context.font = "11px sans-serif";
  context.textAlign = "right";
  context.fillText(language, element.width - 16, 21);

  context.strokeStyle = "#374151";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, 42);
  context.lineTo(element.width, 42);
  context.stroke();

  context.font = "13px 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const lineHeight = 19;
  const lines = code.split("\n");
  const visibleLines = Math.max(0, Math.floor((element.height - 62) / lineHeight));
  lines.slice(0, visibleLines).forEach((line, index) => {
    const y = 66 + index * lineHeight;
    context.fillStyle = "#6b7280";
    context.textAlign = "right";
    context.fillText(String(index + 1), 34, y);
    context.textAlign = "left";
    drawHighlightedLine(context, line.slice(0, 200), 48, y, language);
  });

  if (lines.length > visibleLines && visibleLines > 0) {
    context.fillStyle = "#9ca3af";
    context.font = "11px sans-serif";
    context.fillText("…", 48, 66 + visibleLines * lineHeight);
  }
  context.restore();
};
