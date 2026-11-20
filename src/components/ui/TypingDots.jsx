export default function TypingDots({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-[3px] text-signal ${className}`} aria-label="typing">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="typing-dot size-[5px] rounded-full bg-current" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}
