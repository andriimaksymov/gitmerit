import type {
  AiAnalysisScores,
  EvidenceCard,
  LinkedinAnalysisRequest,
  QualitySignal,
} from '../interfaces/ai.interfaces';
import type {
  GithubProfile,
  GithubRepo,
} from '../../github/interfaces/github.interfaces';

const evidenceRules = `
Write as an evidence-based career coach.
Use only the supplied evidence.
Do not invent companies, metrics, repositories, dates, credentials, engagement data, or technologies.
Prefer specific observations over generic advice.
If evidence is thin, say so in sourceLimitations and lower confidence through conservative language.
Return JSON only.
`;

export const buildGithubPrompt = (
  profile: GithubProfile,
  repositories: GithubRepo[],
  scores: AiAnalysisScores,
  evidence: EvidenceCard[],
  qualitySignals: QualitySignal[],
) => ({
  systemPrompt: `
You analyze GitHub developer portfolios for career positioning and project quality.
${evidenceRules}
Every flagship project, checklist item, and next action must cite at least one supplied evidence id.
Ground the summary in repository names, detected languages, or evidence ids.
`,
  userPrompt: JSON.stringify(
    {
      profile: {
        username: profile.login,
        name: profile.name,
        bio: profile.bio,
        publicRepos: profile.public_repos,
        followers: profile.followers,
        company: profile.company,
        location: profile.location,
        createdAt: profile.created_at,
      },
      scores,
      repositoryCount: repositories.length,
      repositories: repositories.slice(0, 30).map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        description: repo.description,
        fork: repo.fork,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        topics: repo.topics,
        homepage: repo.homepage,
        size: repo.size,
        defaultBranch: repo.default_branch,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
      })),
      evidence,
      qualitySignals,
    },
    null,
    2,
  ),
});

export const buildLinkedinPrompt = (
  profile: LinkedinAnalysisRequest,
  sourceLimitations: string[],
) => ({
  systemPrompt: `
You optimize LinkedIn profiles for recruiter visibility.
${evidenceRules}
Only rewrite or recommend from supplied profile text, headline, experience, skills, and target roles.
When suggesting stronger bullets, use placeholders like "add a metric for..." instead of fabricating numbers.
`,
  userPrompt: JSON.stringify(
    {
      profile: {
        fullName: profile.fullName,
        title: profile.title,
        headline: profile.headline,
        about: profile.about,
        profileText: profile.profileText,
        targetRoles: profile.targetRoles,
        skills: profile.skills,
        experience: profile.experience,
      },
      sourceLimitations,
    },
    null,
    2,
  ),
});

export interface CvPromptInput {
  textPreview: string;
  sections: Record<string, string>;
  weakBullets: string[];
  detectedTechnologies: string[];
  targetRole?: string;
  seniority?: string;
  jobDescription?: string;
  sourceLimitations: string[];
  evidence: EvidenceCard[];
}

export const buildCvPrompt = (input: CvPromptInput) => ({
  systemPrompt: `
You review software engineering resumes.
${evidenceRules}
For each improvement, quote an exact contiguous phrase from the resume text.
Do not create an improvement if you cannot quote the exact source text.
Missing keywords must be truthful to the target role or job description and should not imply experience the resume does not show.
`,
  userPrompt: JSON.stringify(input, null, 2),
});
