"use client";

type KBMarkdownSourceEditorProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function KBMarkdownSourceEditor({ id, label, value, onChange }: KBMarkdownSourceEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-80 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      />
    </div>
  );
}
