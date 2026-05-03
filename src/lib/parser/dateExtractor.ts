export function extractDateRanges(text: string): { start: Date; end: Date | 'Present' }[] {
  // Common ATS regex for dates: "Jan 2020 - Present", "01/2020 to 12/2021", "2018 - 2020"
  const dateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1]?[0-9])[\s/.-]*(?:19|20)\d{2}\s*(?:-|to|–)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-1]?[0-9])[\s/.-]*(?:19|20)\d{2}|Present|Current)/gi;
  
  const matches = text.match(dateRegex);
  if (!matches) return [];

  return matches.map(match => {
    const parts = match.split(/\s*(?:-|to|–)\s*/i);
    return {
      start: new Date(parts[0]), // simplified interpretation
      end: parts[1].toLowerCase().includes('present') || parts[1].toLowerCase().includes('current') ? 'Present' : new Date(parts[1])
    };
  });
}
