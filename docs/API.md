# API Guide

The backend exposes a JSON API under `/api`.

Local base URL:

```text
http://localhost:3001/api
```

## Health

```http
GET /api
```

Returns the base application response.

## GitHub Analysis

```http
POST /api/analysis/analyze
Content-Type: application/json
```

Request:

```json
{
  "username": "octocat"
}
```

Response shape:

```json
{
  "username": "octocat",
  "profile": {
    "avatarUrl": "https://...",
    "bio": "Developer profile bio",
    "followers": 42,
    "company": "Example Inc",
    "location": "San Francisco, CA",
    "publicRepos": 12
  },
  "overallScore": 84,
  "scores": {
    "activity": 87,
    "projectQuality": 91,
    "techStackDiversity": 76,
    "consistency": 88
  },
  "aiInsights": {
    "summary": "High-level profile summary",
    "careerPath": "Senior Engineer",
    "keyStrengths": ["Consistent code quality"],
    "improvements": ["Add test coverage"],
    "flagshipProjects": []
  },
  "strengths": ["High GitHub activity"],
  "weaknesses": ["Limited technology diversity"],
  "recommendations": ["Add comprehensive README files"],
  "analyzedAt": "2026-05-01T00:00:00.000Z"
}
```

Notes:

- `aiInsights` can be `null` if no AI provider is configured or every provider fails.
- GitHub API rate limits are much better when `GITHUB_API_TOKEN` is configured.

## LinkedIn URL Analysis

```http
POST /api/linkedin/analyze-url
Content-Type: application/json
```

Request:

```json
{
  "url": "https://www.linkedin.com/in/example-profile"
}
```

Response shape:

```json
{
  "profile": {
    "fullName": "Example Profile",
    "title": "Software Engineer at Example",
    "about": "Profile about text",
    "skills": ["TypeScript", "React"],
    "avatarUrl": "https://...",
    "experience": [
      {
        "role": "Software Engineer",
        "company": "Example",
        "description": "Built product features"
      }
    ]
  },
  "analysis": {
    "summary": {
      "text": "Professional visibility summary",
      "seniorityGuess": "Mid-Senior"
    },
    "dimensions": {
      "overall": 72,
      "profile": { "score": 85, "status": "Strong", "insights": [] },
      "headline": { "score": 68, "status": "Good", "insights": [] },
      "experience": { "score": 78, "status": "Good", "insights": [] },
      "skills": { "score": 82, "status": "Strong", "insights": [] },
      "branding": { "score": 64, "status": "Needs Work", "insights": [] }
    },
    "recommendations": {
      "headlines": ["Full-stack engineer..."],
      "aboutSuggestions": {
        "missing": "More metrics",
        "rewritten": "Improved about section"
      },
      "experienceEdits": []
    },
    "missingKeywords": ["System Design"],
    "actionPlan": {
      "thisWeek": ["Rewrite headline"],
      "next30Days": ["Publish technical article"],
      "next60Days": ["Grow target network"]
    }
  },
  "timestamp": "2026-05-01T00:00:00.000Z",
  "url": "https://www.linkedin.com/in/example-profile"
}
```

## LinkedIn Structured Analysis

```http
POST /api/linkedin/analyze
Content-Type: application/json
```

Request:

```json
{
  "fullName": "Alex Example",
  "title": "Software Engineer",
  "about": "I build web applications.",
  "experience": [
    {
      "role": "Software Engineer",
      "company": "Example Co",
      "description": "Built and maintained React applications."
    }
  ],
  "skills": ["JavaScript", "TypeScript", "React"]
}
```

This endpoint skips URL fetching and analyzes supplied profile data directly.

## CV Upload

```http
POST /api/cv/upload
Content-Type: multipart/form-data
```

Form field:

```text
file: resume.pdf
```

Response shape:

```json
{
  "fullText": "Extracted resume text...",
  "analysis": {
    "summary": {
      "professionalLikelihood": 76,
      "critique": "Resume critique"
    },
    "improvements": [
      {
        "category": "Impact",
        "quote": "Responsible for...",
        "suggestion": "Use active voice and metrics",
        "rewritten": "Delivered..."
      }
    ],
    "missingKeywords": ["Docker", "Kubernetes"]
  }
}
```

Validation:

- A file is required.
- Only `application/pdf` uploads are accepted.

## Error Handling

Expected client-facing errors include:

- Missing request body values.
- GitHub user not found.
- LinkedIn URL fetch or analysis failure.
- Missing file upload.
- Non-PDF file upload.
- AI provider failure.

The UI should always present a retry path and preserve enough context for the user to adjust the input.
