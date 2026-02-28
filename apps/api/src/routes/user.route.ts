/**
 * apps/api/src/routes/user.route.ts
 *
 * User profile & preferences endpoints.
 * POST /api/user/preferences — Save onboarding answers
 * GET  /api/user/profile     — Return full profile + prefs + skills
 */

import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";

export const userRouter = Router();

// Auth guard middleware
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    next();
}

/**
 * POST /api/user/preferences
 * Body: { experience, languages, contributions, goal }
 */
userRouter.post("/preferences", requireAuth, async (req: Request, res: Response) => {
    const user = req.user as any;
    const { experience, languages, contributions, goal } = req.body;

    if (!experience || !languages || !contributions) {
        return res.status(400).json({
            error: "Missing required fields: experience, languages, contributions",
        });
    }

    try {
        const prefs = await prisma.userPreferences.upsert({
            where: { userId: user.id },
            update: {
                experienceLevel: experience,
                preferredLanguages: Array.isArray(languages) ? languages : [languages],
                contributionTypes: Array.isArray(contributions) ? contributions : [contributions],
                goal: goal || null,
            },
            create: {
                userId: user.id,
                experienceLevel: experience,
                preferredLanguages: Array.isArray(languages) ? languages : [languages],
                contributionTypes: Array.isArray(contributions) ? contributions : [contributions],
                goal: goal || null,
            },
        });

        return res.json({ success: true, preferences: prefs });
    } catch (err: any) {
        console.error("[User] Failed to save preferences:", err);
        return res.status(500).json({ error: "Failed to save preferences" });
    }
});

/**
 * GET /api/user/profile
 * Returns the full user profile with skill data and preferences.
 */
userRouter.get("/profile", requireAuth, async (req: Request, res: Response) => {
    const user = req.user as any;

    try {
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

        return res.json({
            id: fullUser.id,
            username: fullUser.username,
            name: fullUser.name,
            email: fullUser.email,
            avatarUrl: fullUser.avatarUrl,
            createdAt: fullUser.createdAt,
            skillProfile: fullUser.skillProfile
                ? {
                    overallLevel: fullUser.skillProfile.overallLevel,
                    overallScore: fullUser.skillProfile.overallScore,
                    totalRepos: fullUser.skillProfile.totalRepos,
                    totalStars: fullUser.skillProfile.totalStars,
                    contributionCount: fullUser.skillProfile.contributionCount,
                    accountAgeYears: fullUser.skillProfile.accountAgeYears,
                    languageStats: fullUser.skillProfile.languageStats,
                    frameworks: fullUser.skillProfile.frameworks,
                }
                : null,
            preferences: fullUser.preferences
                ? {
                    experienceLevel: fullUser.preferences.experienceLevel,
                    preferredLanguages: fullUser.preferences.preferredLanguages,
                    contributionTypes: fullUser.preferences.contributionTypes,
                    goal: fullUser.preferences.goal,
                    onboardedAt: fullUser.preferences.onboardedAt,
                }
                : null,
        });
    } catch (err: any) {
        console.error("[User] Failed to fetch profile:", err);
        return res.status(500).json({ error: "Failed to fetch profile" });
    }
});
