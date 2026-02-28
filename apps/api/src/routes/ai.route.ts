/**
 * apps/api/src/routes/ai.route.ts
 *
 * POST /api/ai/recommend
 * Authenticated endpoint that returns personalized repo/issue recommendations.
 * Uses the AI personalization layer (src/ai/), NOT the RAG pipeline.
 */

import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { getPersonalizedRecommendations, type UserContext } from "../ai/personalizedRecommender";

export const aiRouter = Router();

// Auth guard
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    next();
}

/**
 * POST /api/ai/recommend
 * Returns personalized open-source repo recommendations based on the
 * user's skill profile and onboarding preferences.
 */
aiRouter.post("/recommend", requireAuth, async (req: Request, res: Response) => {
    const user = req.user as any;

    try {
        // Fetch full user data
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                skillProfile: true,
                preferences: true,
            },
        });

        if (!fullUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Build context for the recommender
        const context: UserContext = {
            username: fullUser.username || "anonymous",
            skillProfile: fullUser.skillProfile
                ? {
                    overallLevel: fullUser.skillProfile.overallLevel,
                    totalRepos: fullUser.skillProfile.totalRepos,
                    totalStars: fullUser.skillProfile.totalStars,
                    contributionCount: fullUser.skillProfile.contributionCount,
                    accountAgeYears: fullUser.skillProfile.accountAgeYears,
                    languageStats: fullUser.skillProfile.languageStats as Record<string, number>,
                }
                : null,
            preferences: fullUser.preferences
                ? {
                    experienceLevel: fullUser.preferences.experienceLevel,
                    preferredLanguages: fullUser.preferences.preferredLanguages,
                    contributionTypes: fullUser.preferences.contributionTypes,
                    goal: fullUser.preferences.goal,
                }
                : null,
        };

        const result = await getPersonalizedRecommendations(context);

        return res.json({
            success: true,
            ...result,
            meta: {
                userId: fullUser.id,
                hasSkillProfile: !!fullUser.skillProfile,
                hasPreferences: !!fullUser.preferences,
            },
        });
    } catch (err: any) {
        console.error("[AI] Recommendation error:", err);
        return res.status(500).json({ error: "Failed to generate recommendations", detail: err.message });
    }
});
