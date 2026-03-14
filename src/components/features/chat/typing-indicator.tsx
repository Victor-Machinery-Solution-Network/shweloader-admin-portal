interface TypingIndicatorProps {
  userName: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5">
      <span className="text-xs text-muted-foreground">
        {userName} is typing
      </span>
      <span className="flex gap-0.5" aria-hidden="true">
        <span className="size-1 rounded-full bg-muted-foreground/60 animate-[typing-dot_1.4s_ease-in-out_infinite]" />
        <span className="size-1 rounded-full bg-muted-foreground/60 animate-[typing-dot_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="size-1 rounded-full bg-muted-foreground/60 animate-[typing-dot_1.4s_ease-in-out_0.4s_infinite]" />
      </span>
    </div>
  );
}
