import { ATSProfile } from './types';

export const WorkdayProfile: ATSProfile = {
  id: 'workday',
  name: 'Workday',
  vendor: 'Workday',
  weights: {
    formatting: 0.15,
    keywordMatch: 0.40,
    sections: 0.20,
    experience: 0.15,
    education: 0.10
  },
  strictFormatting: false,
  requiresExactKeywordMatch: true
};
