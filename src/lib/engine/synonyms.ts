/**
 * Built-in synonym dictionary for fuzzy / semantic keyword matching.
 * Keys are canonical (lowercased) terms; values are lists of known aliases.
 */
export const SYNONYM_MAP: Record<string, string[]> = {
  "javascript": ["js", "ecmascript", "es6", "es2015", "es2016", "es2017"],
  "typescript": ["ts"],
  "react": ["reactjs", "react.js", "react js"],
  "angular": ["angularjs", "angular.js", "angular js"],
  "vue": ["vuejs", "vue.js", "vue js"],
  "node.js": ["nodejs", "node js", "node"],
  "python": ["py"],
  "java": ["java se", "java ee"],
  "kubernetes": ["k8s"],
  "amazon web services": ["aws"],
  "google cloud platform": ["gcp", "google cloud"],
  "microsoft azure": ["azure"],
  "continuous integration": ["ci"],
  "continuous deployment": ["cd"],
  "ci/cd": ["continuous integration", "continuous deployment", "ci", "cd"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "natural language processing": ["nlp"],
  "project manager": ["pm"],
  "product manager": ["product management"],
  "user interface": ["ui"],
  "user experience": ["ux"],
  "application programming interface": ["api", "apis", "restful api", "rest api"],
  "rest": ["restful", "rest api", "restful api"],
  "graphql": ["graph ql", "gql"],
  "structured query language": ["sql"],
  "version control": ["git", "svn"],
  "test driven development": ["tdd"],
  "behavior driven development": ["bdd"],
  "object oriented programming": ["oop", "object oriented", "object-oriented"],
  "microservices": ["micro services", "microservice architecture"],
  "devops": ["dev ops"],
  "agile": ["scrum", "kanban", "agile methodology"],
  "scrum": ["agile", "sprint"],
  "c#": ["csharp", "c sharp"],
  "c++": ["cpp", "c plus plus"],
  "html": ["html5"],
  "css": ["css3", "scss", "sass", "less"],
  "postgresql": ["postgres", "psql"],
  "mongodb": ["mongo"],
  "elasticsearch": ["elastic search", "elk"],
  "tensorflow": ["tf"],
  "docker": ["containerization", "containers"],
  "data analysis": ["data analytics", "analytics"],
  "machine learning engineer": ["ml engineer", "mle"],
  "software engineer": ["software developer", "swe", "sde"],
  "full stack": ["fullstack", "full-stack"],
  "front end": ["frontend", "front-end"],
  "back end": ["backend", "back-end"],
};

/**
 * Reverse map: alias → canonical term.
 * Built once at module load time.
 */
export const REVERSE_SYNONYM_MAP: Record<string, string> = {};
for (const [canonical, aliases] of Object.entries(SYNONYM_MAP)) {
  for (const alias of aliases) {
    // Only set if not already mapped (first canonical wins)
    if (!REVERSE_SYNONYM_MAP[alias]) {
      REVERSE_SYNONYM_MAP[alias] = canonical;
    }
  }
}

/**
 * Normalise a term to its canonical form (lower-case + synonym lookup).
 */
export function canonicalize(term: string): string {
  const lower = term.toLowerCase().trim();
  return REVERSE_SYNONYM_MAP[lower] ?? lower;
}

/**
 * Given a canonical term, return all known aliases (including itself).
 */
export function getSynonyms(term: string): string[] {
  const lower = term.toLowerCase().trim();
  const canonical = canonicalize(lower);
  return [canonical, ...(SYNONYM_MAP[canonical] ?? [])];
}
