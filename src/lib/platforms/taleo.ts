import { ATSProfile } from './types';

export const TaleoProfile: ATSProfile = {
  id: 'taleo',
  name: 'Oracle Taleo',
  vendor: 'Oracle',
  weights: {
    formatting: 0.35, // Taleo breaks easily on bad formatting
    keywordMatch: 0.30,
    sections: 0.15,
    experience: 0.10,
    education: 0.10
  },
  strictFormatting: true,
  requiresExactKeywordMatch: false // Taleo has ok tokenization
};
