/**
 * apps/api/src/ai/personalizedRecommender.ts
 *
 * Uses the user's SkillProfile + UserPreferences to generate
 * personalized open-source project/issue recommendations via Gemini.
 *
 * This is architecturally separate from the RAG pipeline in src/rag/.
 */

import { callGeminiAI } from "./geminiClient";

export interface UserContext {
    username: string;
    skillProfile: {
        overallLevel: string;
        totalRepos: number;
        totalStars: number;
        contributionCount: number;
        accountAgeYears: number;
        languageStats: Record<string, number>;
    } | null;
    preferences: {
        experienceLevel: string;
        preferredLanguages: string[];
        contributionTypes: string[];
        goal: string | null;
    } | null;
}

export interface Recommendation {
    repoName: string;
    repoUrl: string;
    description: string;
    matchReason: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    issueType: string;
    estimatedTime: string;
}

export interface RecommendationResult {
    recommendations: Recommendation[];
    summary: string;
}

const SYSTEM_PROMPT = `You are an AI assistant for OpenQuest, an open-source contribution platform.
Your job is to recommend real, popular open-source GitHub repositories and specific types of issues
that match a developer's skill level, language preferences, contribution interests, and goals.

IMPORTANT RULES:
- Only recommend REAL, well-known open-source repositories that exist on GitHub
- Match difficulty to the user's experience level
- Prioritize repositories that use languages the user prefers
- Consider the user's contribution type preferences (bug fixes, features, docs, testing)
- Align recommendations with the user's stated goal (learning, portfolio, giving back, career)
- Return exactly 5 recommendations

Respond ONLY with valid JSON matching this schema:
{
  "recommendations": [
    {
      "repoName": "owner/repo",
      "repoUrl": "https://github.com/owner/repo",
      "description": "Brief repo description",
      "matchReason": "Why this matches the user",
      "difficulty": "beginner|intermediate|advanced",
      "issueType": "Type of issue to look for (e.g. 'good first issue', 'bug', 'feature request')",
      "estimatedTime": "Estimated time to complete (e.g. '2-4 hours')"
    }
  ],
  "summary": "A 1-2 sentence personalized summary of why these repos were chosen"
}`;

function buildUserPrompt(context: UserContext): string {
    const parts: string[] = [];

    parts.push(`Developer: @${context.username}`);

    if (context.skillProfile) {
        const sp = context.skillProfile;
        parts.push(`\nGitHub Stats:`);
        parts.push(`- Experience Level: ${sp.overallLevel}`);
        parts.push(`- Repositories: ${sp.totalRepos}`);
        parts.push(`- Stars: ${sp.totalStars}`);
        parts.push(`- Contributions: ${sp.contributionCount}`);
        parts.push(`- Account Age: ${sp.accountAgeYears} years`);

        const langs = Object.entries(sp.languageStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([lang, count]) => `${lang} (${count} repos)`)
            .join(", ");
        if (langs) parts.push(`- Top Languages: ${langs}`);
    }

    if (context.preferences) {
        const p = context.preferences;
        parts.push(`\nPreferences:`);
        parts.push(`- Self-assessed Level: ${p.experienceLevel}`);
        if (p.preferredLanguages.length > 0) {
            parts.push(`- Preferred Languages: ${p.preferredLanguages.join(", ")}`);
        }
        if (p.contributionTypes.length > 0) {
            parts.push(`- Contribution Interests: ${p.contributionTypes.join(", ")}`);
        }
        if (p.goal) {
            parts.push(`- Goal: ${p.goal}`);
        }
    }

    parts.push(`\nPlease recommend 5 open-source repositories and issue types that match this profile.`);

    return parts.join("\n");
}

export async function getPersonalizedRecommendations(
    context: UserContext
): Promise<RecommendationResult> {
    const userPrompt = buildUserPrompt(context);

    const raw = await callGeminiAI({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
    });

    try {
        const parsed = JSON.parse(raw) as RecommendationResult;

        // Validate structure
        if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
            return {
                recommendations: [],
                summary: "Unable to generate recommendations at this time.",
            };
        }

        return parsed;
    } catch (err) {
        console.error("[AI] Failed to parse recommendations JSON:", err);
        console.error("[AI] Raw response:", raw);
        return {
            recommendations: [],
            summary: "Unable to generate recommendations at this time.",
        };
    }
}
