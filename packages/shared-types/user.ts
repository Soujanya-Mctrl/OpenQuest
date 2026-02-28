export interface LanguageStat {
    repo_count: number;
    stars: number;
    score: number;
    level: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface SkillProfile {
    userId: number | string;
    overall_score: number;
    overall_level: "beginner" | "intermediate" | "advanced" | "expert";
    account_age_years: number;
    total_repos: number;
    total_stars: number;
    contribution_count: number;
    language_stats: Record<string, LanguageStat>;
    frameworks: string[];
    preferred_contribution_types: string[];
    weekly_availability: string | null;
    last_fast_update: string;
}
