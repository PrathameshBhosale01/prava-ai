/** Three softly pulsing dots shown while the assistant is preparing its first words. */
export default function TypingIndicator() {
  return (
    <div className="flex h-7 items-center gap-1.5" role="status" aria-label="Prava is thinking">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${index * 180}ms`, animationDuration: "1.1s" }}
        />
      ))}
    </div>
  );
}