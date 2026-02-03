export type Messages = Record<string, string | Messages>;

function resolvePath(messages: Messages, key: string): string {
  const parts = key.split(".");
  let current: string | Messages = messages;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return key;
    }
    const next = (current as Messages)[part];
    if (next === undefined) {
      return key;
    }
    current = next as Messages;
  }
  return typeof current === "string" ? current : key;
}

function interpolate(
  template: string,
  values?: Record<string, string | number>,
) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) =>
    String(values[token] ?? `{${token}}`),
  );
}

export function createTranslator(messages: Messages, namespace?: string) {
  return (key: string, values?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return interpolate(resolvePath(messages, fullKey), values);
  };
}
