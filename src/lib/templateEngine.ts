export type PlaceholderData = Record<string, string | number | Date | null | undefined>;

export function applyTemplatePlaceholders(template: string, data: PlaceholderData) {
  return template.replace(/\{(.*?)\}/g, (_, key: string) => {
    const rawValue = data[key.trim()];
    if (rawValue === undefined || rawValue === null) {
      return "";
    }

    if (rawValue instanceof Date) {
      return rawValue.toISOString().slice(0, 10);
    }

    return String(rawValue);
  });
}
