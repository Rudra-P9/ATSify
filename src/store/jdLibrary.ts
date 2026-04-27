import { useState } from 'react';

export interface JobDescriptionSample {
    id: string;
    title: string;
    text: string;
}

export const SAMPLE_JDS: JobDescriptionSample[] = [
    {
        id: 'swe-sr',
        title: 'Senior Software Engineer',
        text: `Senior Software Engineer (Frontend)
Location: Remote / New York
Experience: 5+ years

The Role
We are looking for a Senior Frontend Engineer to lead the development of our core user experience. You will be responsible for architecting scalable UI components and ensuring our application is performant and accessible.

Requirements
- 5+ years of experience with React and TypeScript
- Expertise in CSS-in-JS or Tailwind CSS
- Experience with Next.js or other SSR frameworks
- Strong understanding of testing frameworks like Jest or Cypress
- Excellent communication and leadership skills

Preferred Skills
- Experience with GraphQL and Apollo Client
- Knowledge of Web Accessibility (WCAG)
- Previous experience in a startup environment

Education
- Bachelor's degree in Computer Science or related field`
    },
    {
        id: 'pm-sr',
        title: 'Senior Product Manager',
        text: `Senior Product Manager - Fintech
Focus: Payments & Growth

Responsibilities:
- Define the product vision and strategy for our core payment infrastructure.
- Work closely with engineering, design, and operations.
- Analyze market trends and competitor products.

Requirements:
- 5+ years of experience in product management (Fintech preferred).
- Strategic thinker with a data-driven approach.
- Strong knowledge of SQL and analytics tools.
- Excellent stakeholder management skills.`
    },
    {
        id: 'data-scientist',
        title: 'Data Scientist',
        text: `Data Scientist (Machine Learning)

We are hiring a Data Scientist to build predictive models and analyze large datasets.

Requirements:
- 3+ years of experience in ML or Data Science.
- Proficiency in Python, R, and SQL.
- Experience with TensorFlow or PyTorch.
- Knowledge of statistical modeling and A/B testing.`
    }
];

export function useJDLibrary() {
    const [samples] = useState<JobDescriptionSample[]>(SAMPLE_JDS);
    return { samples };
}