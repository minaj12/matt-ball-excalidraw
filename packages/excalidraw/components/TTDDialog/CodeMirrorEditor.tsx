import { useEffect, useRef } from "react";
import {
  Decoration,
  EditorView,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
  drawSelection,
} from "@codemirror/view";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  indentWithTab,
  historyKeymap,
  redo,
} from "@codemirror/commands";
import {
  syntaxHighlighting,
  HighlightStyle,
  StreamLanguage,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";

import type { Theme } from "@excalidraw/element/types";

import { mermaidLite } from "./mermaid-lang-lite";

export interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyboardSubmit?: () => void;
  placeholder?: string;
  theme: Theme;
  errorLine?: number | null;
  language?: string;
}

// ---- Dark theme ----

const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#1e1e1e",
      color: "#d4d4d4",
    },
    ".cm-content": { caretColor: "#fff" },
    ".cm-cursor": { borderLeftColor: "#fff" },
    ".cm-gutters": {
      backgroundColor: "#1e1e1e",
      color: "#858585",
      border: "none",
    },
    ".cm-activeLineGutter": { backgroundColor: "#2a2a2a" },
    ".cm-activeLine": { backgroundColor: "#2a2a2a" },
    ".cm-errorLine": { backgroundColor: "rgba(255, 0, 0, 0.15)" },
  },
  { dark: true },
);

const darkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#569cd6" },
  { tag: tags.string, color: "#ce9178" },
  { tag: tags.comment, color: "#6a9955" },
  { tag: tags.number, color: "#b5cea8" },
  { tag: tags.operator, color: "#d4d4d4" },
  { tag: tags.punctuation, color: "#d4d4d4" },
  { tag: tags.variableName, color: "#9cdcfe" },
  { tag: tags.bracket, color: "#ffd700" },
]);

// ---- Light theme ----

const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#1e1e1e",
  },
  ".cm-content": { caretColor: "#000" },
  ".cm-cursor": { borderLeftColor: "#000" },
  ".cm-gutters": {
    backgroundColor: "#fff",
    color: "#999",
    border: "none",
  },
  ".cm-activeLineGutter": { backgroundColor: "#e8e8e8" },
  ".cm-activeLine": { backgroundColor: "#e8e8e8" },
  ".cm-errorLine": { backgroundColor: "rgba(255, 0, 0, 0.1)" },
});

const lightHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#0000ff" },
  { tag: tags.string, color: "#a31515" },
  { tag: tags.comment, color: "#008000" },
  { tag: tags.number, color: "#098658" },
  { tag: tags.operator, color: "#1e1e1e" },
  { tag: tags.punctuation, color: "#1e1e1e" },
  { tag: tags.variableName, color: "#001080" },
  { tag: tags.bracket, color: "#af00db" },
]);


// A lightweight CodeMirror StreamLanguage mode keeps the editor dependency-free
// while providing language-aware tokenization for common code-block languages.
const getCodeLanguageExtension = (language: string): Extension => {
  const normalized = language.toLowerCase();
  const keywordSets: Record<string, Set<string>> = {
    javascript: new Set("async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return super switch this throw try typeof var void while with yield true false null undefined".split(" ")),
    typescript: new Set("abstract any as asserts bigint boolean break case catch class const constructor continue declare default delete do else enum export extends finally for from function if implements import in infer instanceof interface is keyof let module namespace never new number object package private protected public readonly return set static string super switch symbol this throw try type typeof undefined unique unknown var void while yield true false null".split(" ")),
    python: new Set("and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield True False None self".split(" ")),
    c: new Set("auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while".split(" ")),
    cpp: new Set("alignas auto bool break case catch char class const constexpr continue decltype default delete do double else enum explicit extern false float for friend goto if inline int long namespace new noexcept nullptr operator private protected public return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while".split(" ")),
    java: new Set("abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null".split(" ")),
    json: new Set("true false null".split(" ")),
    sql: new Set("ADD ALL ALTER AND ANY AS ASC BACKUP BETWEEN BY CASE CHECK COLUMN CONSTRAINT CREATE DATABASE DEFAULT DELETE DESC DISTINCT DROP ELSE END EXISTS FOREIGN FROM FULL GROUP HAVING IN INDEX INNER INSERT INTO IS JOIN KEY LEFT LIKE LIMIT NOT NULL OR ORDER OUTER PRIMARY REFERENCES RIGHT SELECT SET TABLE THEN UNION UNIQUE UPDATE VALUES WHEN WHERE".split(" ")),
    bash: new Set("if then else elif fi for while do done case esac function in select time until".split(" ")),
    html: new Set(),
    css: new Set("important media supports keyframes from to".split(" ")),
  };
  const keywords = keywordSets[normalized] || keywordSets.javascript;

  return StreamLanguage.define({
    startState: () => ({ inBlockComment: false }),
    token(stream, state) {
      if (state.inBlockComment) {
        if (stream.match(/.*?\*\//)) state.inBlockComment = false;
        else stream.skipToEnd();
        return "comment";
      }
      if (stream.eatSpace()) return null;
      if (
        stream.match("//") ||
        ((normalized === "python" || normalized === "bash") &&
          stream.match("#")) ||
        (normalized === "sql" && stream.match("--"))
      ) {
        stream.skipToEnd();
        return "comment";
      }
      if (stream.match("/*")) {
        state.inBlockComment = true;
        if (stream.skipTo("*/")) {
          stream.match("*/");
          state.inBlockComment = false;
        } else {
          stream.skipToEnd();
        }
        return "comment";
      }
      if (
        stream.match(/"(?:\\.|[^"\\])*"?/) ||
        stream.match(/'(?:\\.|[^'\\])*'?/)
      ) {
        return "string";
      }
      if (stream.match(/\b\d+(?:\.\d+)?\b/)) return "number";
      if (normalized === "html" && stream.match(/<\/?[A-Za-z][\w-]*/)) {
        return "tagName";
      }
      if (normalized === "html" && stream.match(/[A-Za-z-]+(?=\s*=)/)) {
        return "attributeName";
      }
      if (stream.match(/[A-Za-z_$][\w$]*/)) {
        const word = stream.current();
        if (keywords.has(word) || keywords.has(word.toUpperCase())) {
          return "keyword";
        }
        if (/^[A-Z]/.test(word)) return "typeName";
        return normalized === "json" ? "propertyName" : "variableName";
      }
      if (stream.match(/[{}()[\].,;:]/)) return "punctuation";
      if (stream.match(/[+*%!=<>|&^~/?-]+/)) return "operator";
      stream.next();
      return null;
    },
  });
};

// ---- Error line decoration ----

const errorLineDeco = Decoration.line({ class: "cm-errorLine" });

const getErrorLineExtension = (
  errorLine: number | null | undefined,
  doc: { line(n: number): { from: number }; lines: number },
): Extension => {
  if (!errorLine || errorLine < 1 || errorLine > doc.lines) {
    return EditorView.decorations.of(Decoration.none);
  }
  const line = doc.line(errorLine);
  return EditorView.decorations.of(
    Decoration.set([errorLineDeco.range(line.from)]),
  );
};

// ---- Helpers ----

const getThemeExtensions = (theme: Theme) => {
  if (theme === "dark") {
    return [darkTheme, syntaxHighlighting(darkHighlight)];
  }
  return [lightTheme, syntaxHighlighting(lightHighlight)];
};

const CodeMirrorEditor = ({
  value,
  onChange,
  onKeyboardSubmit,
  placeholder,
  theme,
  errorLine,
  language,
}: CodeMirrorEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onKeyboardSubmitRef = useRef(onKeyboardSubmit);
  const themeCompartmentRef = useRef(new Compartment());
  const errorLineCompartmentRef = useRef(new Compartment());
  const languageCompartmentRef = useRef(new Compartment());

  onChangeRef.current = onChange;
  onKeyboardSubmitRef.current = onKeyboardSubmit;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const themeCompartment = themeCompartmentRef.current;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                onKeyboardSubmitRef.current?.();
                return true;
              },
            },
            // historyKeymap binds Mod-Shift-z only on Mac; add it for all platforms
            { key: "Mod-Shift-z", run: redo, preventDefault: true },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          history(),
          keymap.of([indentWithTab]),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          lineNumbers(),
          EditorView.lineWrapping,
          themeCompartment.of(getThemeExtensions(theme)),
          errorLineCompartmentRef.current.of([]),
          languageCompartmentRef.current.of(
            language ? getCodeLanguageExtension(language) : mermaidLite(),
          ),
          drawSelection({ drawRangeCursor: true }),
          ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap theme dynamically via compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(
        getThemeExtensions(theme),
      ),
    });
  }, [theme]);

  // Reconfigure the language parser without recreating the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !language) return;
    view.dispatch({
      effects: languageCompartmentRef.current.reconfigure(
        getCodeLanguageExtension(language),
      ),
    });
  }, [language]);

  // Update error line highlight
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    view.dispatch({
      effects: errorLineCompartmentRef.current.reconfigure(
        getErrorLineExtension(errorLine, view.state.doc),
      ),
    });
  }, [errorLine]);

  // Sync external value changes into EditorView
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const currentDoc = view.state.doc.toString();
    if (value !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="ttd-dialog-input ttd-dialog-input--codemirror"
    />
  );
};

export default CodeMirrorEditor;
