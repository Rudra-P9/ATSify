/**
 * Prompt builder for Gemini analysis
 */

export function buildFullScoringPrompt(resumeText: string, jobDescription?: string): string {
  const jdSection = jobDescription 
    ? `JOB DESCRIPTION:
${jobDescription}` 
    : "No job description provided. Analysis should focus on general industry best practices.";

  return `You are an expert recruiter and Applicant Tracking System (ATS) engineer. 
CURRENT DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Analyze the provided resume text and compare it against the job description (if provided).
Simulate how the following enterprise ATS platforms would parse and rank this resume:
- Workday (Workday Inc.)
- Taleo (Oracle Inc.)
- iCIMS (iCIMS Inc.)
- Greenhouse (Greenhouse Software)
- Lever (Lever Inc.)
- SuccessFactors (SAP)

${jdSection}

RESUME TEXT:
${resumeText}

Provide an exhaustive analysis in JSON format following the schema precisely.
Evaluate the resume for:
1. Formatting (Parsing issues, tables, columns).
2. Keyword matching (Hard skills, soft skills, synonyms).
3. Section completeness (Summary, Experience, Education, Skills).
4. Experience quality (Quantification, action verbs, impact).
5. Education (Relevance, certification).

Be critical but constructive. If a job description is provided, prioritize the keyword match against the required skills in that JD.

The JSON response MUST be valid and follow the schema exactly.`;
}
