import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { config } from "./env";
import { prisma } from "../db/prisma";
import { fetchGithubUserData } from "../services/github.service";
import { buildSkillProfile } from "../services/profile.builder";

passport.use(
    new GitHubStrategy(
        {
            clientID: config.GITHUB_CLIENT_ID,
            clientSecret: config.GITHUB_CLIENT_SECRET,
            callbackURL: config.CALLBACK_URL,
            scope: ["user:email", "read:user"],
        },
        async (
            accessToken: string,
            _refreshToken: string,
            profile: any,
            done: Function
        ) => {
            try {
                // 1. Fetch extended GitHub data
                const githubData = await fetchGithubUserData(
                    profile.username,
                    accessToken
                );

                // 2. Build skill profile
                const skillData = buildSkillProfile(githubData);

                // 3. Upsert user in the database
                const email =
                    profile.emails && profile.emails.length > 0
                        ? profile.emails[0].value
                        : null;

                const user = await prisma.user.upsert({
                    where: { githubId: profile.id },
                    update: {
                        username: profile.username,
                        name: profile.displayName || profile.username,
                        avatarUrl: profile.photos?.[0]?.value,
                        email,
                        accessToken,
                    },
                    create: {
                        githubId: profile.id,
                        username: profile.username,
                        name: profile.displayName || profile.username,
                        avatarUrl: profile.photos?.[0]?.value,
                        email,
                        accessToken,
                    },
                });

                // 4. Upsert skill profile
                await prisma.skillProfile.upsert({
                    where: { userId: user.id },
                    update: {
                        overallLevel: skillData.overallLevel,
                        totalRepos: skillData.totalRepos,
                        totalStars: skillData.totalStars,
                        contributionCount: skillData.contributionCount,
                        accountAgeYears: skillData.accountAgeYears,
                        languageStats: skillData.languageStats,
                        lastFastUpdate: new Date(),
                    },
                    create: {
                        userId: user.id,
                        overallLevel: skillData.overallLevel,
                        totalRepos: skillData.totalRepos,
                        totalStars: skillData.totalStars,
                        contributionCount: skillData.contributionCount,
                        accountAgeYears: skillData.accountAgeYears,
                        languageStats: skillData.languageStats,
                    },
                });

                // Fetch user with skill profile for session
                const fullUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    include: { skillProfile: true },
                });

                return done(null, fullUser);
            } catch (err) {
                console.error("Passport GitHub strategy error:", err);
                return done(err);
            }
        }
    )
);

// Serialize: store only user ID in the session
passport.serializeUser((user: any, done: Function) => {
    done(null, user.id);
});

// Deserialize: fetch user from DB on each request
passport.deserializeUser(async (id: string, done: Function) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            include: { skillProfile: true },
        });
        done(null, user);
    } catch (err) {
        done(err);
    }
});

export default passport;
