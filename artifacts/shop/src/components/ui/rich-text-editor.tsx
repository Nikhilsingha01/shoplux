import React, { useRef, useEffect } from "react";
import { Bold, Italic, Underline, List, ListOrdered, RemoveFormatting } from "lucide-react";

interface RichTextEditorProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef(false);

  // Sync value from parent props to editor's innerHTML
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = value || "";
      if (editorRef.current.innerHTML !== currentValue && !isInternalChangeRef.current) {
        editorRef.current.innerHTML = currentValue;
      }
    }
    isInternalChangeRef.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChangeRef.current = true;
      const htmlContent = editorRef.current.innerHTML;
      // If editor is completely empty or just contains an empty br, notify empty string
      if (htmlContent === "<br>" || htmlContent === "" || editorRef.current.textContent?.trim() === "") {
        onChange("");
      } else {
        onChange(htmlContent);
      }
    }
  };

  const executeCommand = (command: string, val: string = "") => {
    document.execCommand(command, false, val);
    handleInput();
    editorRef.current?.focus();
  };

  return (
    <div className="border border-border rounded-md overflow-hidden bg-background focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-muted/40 border-b border-border p-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => executeCommand("bold")}
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("italic")}
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("underline")}
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("removeFormat")}
          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
          title="Clear Formatting"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-3 min-h-[120px] max-h-[300px] overflow-y-auto focus:outline-none text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none rich-editor [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
        data-placeholder={placeholder}
        style={{ outline: "none" }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .rich-editor[contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground) / 0.7);
          pointer-events: none;
          display: block;
        }
      ` }} />
    </div>
  );
}
