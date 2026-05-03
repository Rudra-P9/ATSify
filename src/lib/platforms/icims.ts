import type { ATSProfile } from './types';

// iCIMS: popular talent cloud, robust parsing, semantic capabilities
// values structured data but more lenient than legacy systems like Taleo
export const ICIMS_PROFILE: ATSProfile = {
    name: 'iCIMS',
    vendor: 'iCIMS, Inc.',
    marketShare: 'global enterprise and medium-sized businesses',
    description: 'talent cloud with robust semantic parsing and structured scoring',
    parsingStrictness: 0.5,
    keywordStrategy: 'semantic',
    weights: {
        formatting: 0.12,
        keywordMatch: 0.3,
        sectionCompleteness: 0.15,
        experienceRelevance: 0.2,
        educationMatch: 0.1,
        quantification: 0.13
    },
    requiredSections: ['experience', 'education', 'skills'],
    preferredDateFormats: ['MM/YYYY', 'Month YYYY', 'YYYY'],
    quirks: [
        {
            id: 'icims-skills-focus',
            description: 'iCIMS rewards explicit skills lists for automated tagging',
            check: (input) => {
                if (input.resumeSkills.length < 3) {
                    return {
                        penalty: 5,
                        message: 'limited skills detected. iCIMS relies on skills lists for candidate tagging.'
                    };
                }
                return null;
            }
        }
    ],
    passingScore: 60
};
