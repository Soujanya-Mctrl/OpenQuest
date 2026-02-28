export function computeExperienceLevel(age: number, repos: number, contributions: number) {
    if (age > 3 && repos > 20 && contributions > 100) return "advanced";
    if (age > 1 && repos > 5) return "intermediate";
    return "beginner";
}

export function buildSkillProfile(data: { repos: any[]; events: any[] }) {
    const languageStats: Record<string, number> = {};
    let totalStars = 0;

    for (const repo of data.repos) {
        totalStars += repo.stargazers_count || 0;
        if (repo.language) {
            languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
        }
    }

    // Calculate account age off of earliest repo creation date
    // (Sorted by most recent push originally, but Github repos are usually old enough)
    let earliestDate = Date.now();
    for (const repo of data.repos) {
        if (repo.created_at) {
            const ms = new Date(repo.created_at).getTime();
            if (ms < earliestDate) earliestDate = ms;
        }
    }

    const accountAgeYears =
        data.repos.length > 0
            ? (Date.now() - earliestDate) / (1000 * 60 * 60 * 24 * 365)
            : 0;

    const contributionCount = data.events.filter((e: any) =>
        ["PushEvent", "PullRequestEvent"].includes(e.type)
    ).length;

    const overallLevel = computeExperienceLevel(
        accountAgeYears,
        data.repos.length,
        contributionCount
    );

    return {
        overallLevel,
        languageStats,
        totalRepos: data.repos.length,
        totalStars,
        contributionCount,
        accountAgeYears: Math.round(accountAgeYears), // Store as Int in Prisma
    };
}
