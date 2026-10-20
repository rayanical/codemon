// Render the supported Markdown subset as React text, never as HTML.
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`\n]+`)/g).map((part, index) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code className="inline-code" key={index}>
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}
export default function Description({ text }: { text: string }) {
  return (
    <div className="description">
      {text.split(/(```[^\n]*\n[\s\S]*?```)/g).map((block, index) => {
        if (block.startsWith("```")) {
          const code = block.replace(/^```[^\n]*\n/, "").replace(/\n?```$/, "");
          return (
            <pre className="description-code" key={index}>
              <code>{code}</code>
            </pre>
          );
        }
        return block
          .trim()
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((paragraph, paragraphIndex) => (
            <p key={`${index}-${paragraphIndex}`}>
              <InlineCode text={paragraph} />
            </p>
          ));
      })}
    </div>
  );
}
