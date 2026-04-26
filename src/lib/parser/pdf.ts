import * as pdfjsLib from 'pdfjs-dist';

// Use same CDN worker path but we can adapt it if needed
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // Maintain spacing logic slightly better
    const pageText = textContent.items
      .map((item: any) => item.str + (item.hasEOL ? '\n' : ' '))
      .join('');
    fullText += pageText + '\n\n';
  }
  
  return fullText;
}
