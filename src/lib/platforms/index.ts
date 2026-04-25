import { ATSProfile } from './types';
import { TaleoProfile } from './taleo';
import { WorkdayProfile } from './workday';

export const ICIMSProfile: ATSProfile = {
  id: 'icims',
  name: 'iCIMS',
  vendor: 'iCIMS',
  weights: { formatting: 0.10, keywordMatch: 0.45, sections: 0.15, experience: 0.20, education: 0.10 },
  strictFormatting: false,
  requiresExactKeywordMatch: false
};

export const GreenhouseProfile: ATSProfile = {
  id: 'greenhouse',
  name: 'Greenhouse',
  vendor: 'Greenhouse Software',
  weights: { formatting: 0.05, keywordMatch: 0.25, sections: 0.25, experience: 0.35, education: 0.10 },
  strictFormatting: false,
  requiresExactKeywordMatch: false
};

export const LeverProfile: ATSProfile = {
  id: 'lever',
  name: 'Lever',
  vendor: 'Lever',
  weights: { formatting: 0.05, keywordMatch: 0.20, sections: 0.20, experience: 0.40, education: 0.15 },
  strictFormatting: false,
  requiresExactKeywordMatch: false
};

export const SuccessFactorsProfile: ATSProfile = {
  id: 'successfactors',
  name: 'SAP SuccessFactors',
  vendor: 'SAP',
  weights: { formatting: 0.20, keywordMatch: 0.35, sections: 0.15, experience: 0.20, education: 0.10 },
  strictFormatting: true,
  requiresExactKeywordMatch: true
};

export const PLATFORMS: ATSProfile[] = [
  WorkdayProfile,
  TaleoProfile,
  ICIMSProfile,
  GreenhouseProfile,
  LeverProfile,
  SuccessFactorsProfile
];

export * from './types';
export * from './workday';
export * from './taleo';
