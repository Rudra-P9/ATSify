// simple TF-IDF implementation for keyword relevance
export function computeTF(term: string, tokens: string[]): number {
    const count = tokens.filter((t) => t === term).length;
    return count / tokens.length;
}

export function computeIDF(term: string, documents: string[][]): number {
    const docsWithTerm = documents.filter((doc) => doc.includes(term)).length;
    return Math.log(documents.length / (1 + docsWithTerm));
}

export function computeTFIDF(term: string, tokens: string[], documents: string[][]): number {
    return computeTF(term, tokens) * computeIDF(term, documents);
}

export function computeKeywordOverlap(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    return intersection.size / Math.max(set2.size, 1);
}

export function extractKeyTerms(text: string, count: number = 10): string[] {
    const words = text.toLowerCase().match(/\b(\w+)\b/g) || [];
    const freq: Record<string, number> = {};
    for (const w of words) {
        if (w.length > 3) freq[w] = (freq[w] || 0) + 1;
    }
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([w]) => w);
}