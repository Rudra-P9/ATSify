export function tokenize(text: string): string[] {
  // A simple tokenizer removing punctuation and lowering case
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
}
