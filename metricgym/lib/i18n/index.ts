/**
 * Minimal typed t(). All UI strings live in messages/de.json (flat
 * dot-notation keys, English key names, German copy). Components never
 * hardcode strings. Only `de` ships in the MVP; the dictionary type
 * keeps keys checked at compile time.
 */
import de from "@/messages/de.json";

export type MessageKey = keyof typeof de;

type Params = Record<string, string | number>;

export function t(key: MessageKey, params?: Params): string {
  let text: string = de[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
