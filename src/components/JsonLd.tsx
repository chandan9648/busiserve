/**
 * Renders a schema.org graph as a JSON-LD script tag.
 *
 * The payload is serialised rather than interpolated so that any
 * apostrophe or angle bracket inside the content — service copy and
 * FAQ answers both contain them — cannot terminate the script early.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\u003c"),
      }}
    />
  );
}
