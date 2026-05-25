"use client";

interface MessagePreviewProps {
  message: string;
  onMessageChange: (value: string) => void;
}

export default function MessagePreview({ message, onMessageChange }: MessagePreviewProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/95 p-5 shadow-sm backdrop-blur">
      <p className="mb-3 text-sm font-medium text-foreground">Message Preview</p>
      <textarea
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
        className="h-40 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none transition focus:border-emerald-500"
      />
    </div>
  );
}
