import mammoth from 'mammoth';

export async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // mammoth also has extractRawText, but using extractRawText flattens it.
  // We can use it for now and structure with line breaks.
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
