import { Router } from "express";
import passport from "../config/passport";
import { config } from "../config/env";

export const authRouter = Router();

// Initiate GitHub OAuth flow
authRouter.get(
    "/github",
    passport.authenticate("github", { scope: ["user:email", "read:user"] })
);

// GitHub OAuth callback
authRouter.get(
    "/github/callback",
    passport.authenticate("github", {
        failureRedirect: `${config.FRONTEND_URL}?error=auth_failed`,
    }),
    (_req, res) => {
        // Successful authentication → redirect to frontend
        res.redirect(`${config.FRONTEND_URL}?login=success`);
    }
);

// Check authentication status
authRouter.get("/status", (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        const user = req.user as any;
        res.json({
            authenticated: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
                email: user.email,
                skillProfile: user.skillProfile
                    ? {
                        overallLevel: user.skillProfile.overallLevel,
                        totalRepos: user.skillProfile.totalRepos,
                        totalStars: user.skillProfile.totalStars,
                        contributionCount: user.skillProfile.contributionCount,
                        accountAgeYears: user.skillProfile.accountAgeYears,
                        languageStats: user.skillProfile.languageStats,
                    }
                    : null,
            },
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Logout
authRouter.post("/logout", (req, res) => {
    req.logout((err: any) => {
        if (err) {
            return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ success: true });
    });
});
