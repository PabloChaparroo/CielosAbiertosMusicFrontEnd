import { useRef, type RefObject, type UIEvent } from "react";

const tokenPattern = /(\([^()\n]+\)|\{[^}\n]+\}|\[[^\]\n]+\]|:\]|%|(?<!\w)-(?!\w))/g;

function highlightedParts(value: string) {
  return value.split(tokenPattern).map((part, index) => {
    if (/^\([^()\n]+\)$/.test(part)) {
      return (
        <span key={index} className="text-sky italic">
          {part}
        </span>
      );
    }
    if (/^\{[^}\n]+\}$/.test(part)) {
      return (
        <span key={index} className="font-semibold text-primary">
          {part}
        </span>
      );
    }
    if (/^\[[^\]\n]+\]$/.test(part)) {
      return (
        <span key={index} className="font-semibold text-sky">
          {part}
        </span>
      );
    }
    if (part === ":]" || part === "%" || part === "-") {
      return (
        <span key={index} className="font-semibold text-primary">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function ChordProEditor({
  value,
  onChange,
  textareaRef,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  className: string;
}) {
  const highlightRef = useRef<HTMLPreElement | null>(null);

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    const highlight = highlightRef.current;
    if (!highlight) return;
    highlight.scrollTop = event.currentTarget.scrollTop;
    highlight.scrollLeft = event.currentTarget.scrollLeft;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <pre
        ref={highlightRef}
        aria-hidden="true"
        className={`${className} pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words`}
      >
        {highlightedParts(value)}
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
        className={`${className} relative z-10 bg-transparent text-transparent caret-foreground selection:bg-primary/30 selection:text-transparent`}
      />
    </div>
  );
}
