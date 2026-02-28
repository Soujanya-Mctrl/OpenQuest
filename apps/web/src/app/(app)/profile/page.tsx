"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Zap,
    Star,
    GitPullRequest,
    Trophy,
    Flame,
    Shield,
    Clock,
    Code,
    CheckCircle,
    Calendar,
    GitMerge,
    Droplets,
    Rocket,
    Medal,
    Users,
    BookOpen,
    Loader2,
} from "lucide-react";

const levels = [
    { min: 1, max: 5, label: "Shore Scout", color: "text-green-400", bg: "bg-green-500/10" },
    { min: 6, max: 15, label: "Code Explorer", color: "text-blue-400", bg: "bg-blue-500/10" },
    { min: 16, max: 30, label: "Island Raider", color: "text-orange-400", bg: "bg-orange-500/10" },
    { min: 31, max: Infinity, label: "Legendary Islander", color: "text-yellow-400", bg: "bg-yellow-500/10" },
];

function getCurrentLevel(xp: number) {
    const level = Math.floor(xp / 500) + 1;
    const tier = levels.find((l) => level >= l.min && level <= l.max) ?? levels[0];
    return { level, tier, tierLabel: tier.label };
}

interface StatItem {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

interface BadgeItem {
    icon: React.ReactNode;
    name: string;
    desc: string;
    earned: boolean;
}

interface TimelineItem {
    date: string;
    action: string;
    xp: string;
    type: string;
}

interface ProfileData {
    username: string;
    name: string;
    avatar: string;
    avatarUrl?: string;
    xp: number;
    xpToNext: number;
    streak: number;
    rank: number;
    contributions: number;
    mergedPRs: number;
    repos: number;
    badges: BadgeItem[];
    timeline: TimelineItem[];
    stats: StatItem[];
}

// Fallback mock data when not authenticated
const MOCK_PROFILE: ProfileData = {
    username: "guest",
    name: "Guest User",
    avatar: "GU",
    xp: 0,
    xpToNext: 500,
    streak: 0,
    rank: 999,
    contributions: 0,
    mergedPRs: 0,
    repos: 0,
    badges: [],
    timeline: [],
    stats: [],
};

function buildProfileFromApi(data: any): ProfileData {
    const sp = data.skillProfile;
    const totalContributions = sp?.contributionCount ?? 0;
    const totalRepos = sp?.totalRepos ?? 0;
    const totalStars = sp?.totalStars ?? 0;
    const xp = totalContributions * 50 + totalStars * 20 + totalRepos * 30;

    return {
        username: data.username || "user",
        name: data.name || data.username || "User",
        avatar: (data.name || data.username || "U").slice(0, 2).toUpperCase(),
        avatarUrl: data.avatarUrl,
        xp,
        xpToNext: Math.ceil((xp + 500) / 500) * 500,
        streak: 0,
        rank: 0,
        contributions: totalContributions,
        mergedPRs: 0,
        repos: totalRepos,
        badges: [
            { icon: <Flame className="w-6 h-6 text-orange-400" />, name: "On Fire", desc: "10+ day streak", earned: false },
            { icon: <Droplets className="w-6 h-6 text-blue-400" />, name: "First Wave", desc: "First PR merged", earned: totalContributions > 0 },
            { icon: <Rocket className="w-6 h-6 text-yellow-400" />, name: "Speed Run", desc: "Quest in under 2hr", earned: false },
            { icon: <Medal className="w-6 h-6 text-yellow-500" />, name: "Top 50", desc: "Leaderboard top 50", earned: false },
            { icon: <CheckCircle className="w-6 h-6 text-green-400" />, name: "Precision", desc: "5 quests, 0 review cycles", earned: false },
            { icon: <Trophy className="w-6 h-6 text-yellow-400" />, name: "Island Legend", desc: "Reach level 31+", earned: false },
            { icon: <Users className="w-6 h-6 text-purple-400" />, name: "Team Player", desc: "Help 10 other devs", earned: false },
            { icon: <BookOpen className="w-6 h-6 text-blue-400" />, name: "Doc Wizard", desc: "10 doc PRs merged", earned: false },
        ],
        timeline: [],
        stats: [
            { label: "Total XP", value: xp.toLocaleString(), icon: Zap, color: "text-yellow-400" },
            { label: "Current Rank", value: "--", icon: Trophy, color: "text-blue-400" },
            { label: "Contributions", value: String(totalContributions), icon: GitMerge, color: "text-green-400" },
            { label: "Day Streak", value: "0", icon: Flame, color: "text-orange-400" },
            { label: "Stars", value: String(totalStars), icon: Star, color: "text-purple-400" },
            { label: "Repos", value: String(totalRepos), icon: Code, color: "text-cyan-400" },
        ],
    };
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [xpAnimating, setXpAnimating] = useState(false);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch("http://localhost:8000/api/user/profile", {
                    credentials: "include",
                });
                if (res.ok) {
                    const data = await res.json();
                    setProfile(buildProfileFromApi(data));
                } else {
                    setProfile(MOCK_PROFILE);
                }
            } catch {
                setProfile(MOCK_PROFILE);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    if (loading || !profile) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            </div>
        );
    }

    const { level, tier } = getCurrentLevel(profile.xp);
    const xpProgress = ((profile.xp % 500) / 500) * 100;

    const triggerXpAnimation = () => {
        setXpAnimating(true);
        setTimeout(() => setXpAnimating(false), 1400);
    };

    const timelineIconMap: Record<string, React.ReactNode> = {
        merge: <GitMerge className="w-3.5 h-3.5 text-green-400" />,
        quest: <CheckCircle className="w-3.5 h-3.5 text-blue-400" />,
        levelup: <Trophy className="w-3.5 h-3.5 text-yellow-400" />,
        streak: <Flame className="w-3.5 h-3.5 text-orange-400" />,
        badge: <Star className="w-3.5 h-3.5 text-purple-400" />,
    };

    return (
        <div className="relative">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile Header Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:shadow-[0_0_30px_rgba(249,115,22,0.05)] transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                            {/* Avatar */}
                            <div className="relative hover:scale-105 transition-transform duration-300">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-orange-500/20">
                                    {profile.avatar}
                                </div>
                                <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold border ${tier.bg} ${tier.color} border-current`}>
                                    Lv. {level}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                                    <span className="text-slate-500">@{profile.username}</span>
                                    <Badge className={`${tier.bg} ${tier.color} border-current text-xs`}>
                                        {tier.label}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                        <Flame className="w-4 h-4 text-orange-400" />
                                        <span className="text-orange-400 font-semibold">{profile.streak} day streak</span>
                                    </div>
                                    <Separator orientation="vertical" className="h-4 bg-white/10" />
                                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                        <Trophy className="w-4 h-4 text-blue-400" />
                                        <span>Rank <span className="text-white font-semibold">#{profile.rank}</span></span>
                                    </div>
                                    <Separator orientation="vertical" className="h-4 bg-white/10" />
                                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                        <GitPullRequest className="w-4 h-4 text-green-400" />
                                        <span><span className="text-white font-semibold">{profile.mergedPRs}</span> merged PRs</span>
                                    </div>
                                </div>

                                {/* XP Bar */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs text-slate-500">XP Progress</span>
                                            <span className="text-xs text-yellow-400 font-semibold">
                                                {profile.xp.toLocaleString()} / {profile.xpToNext.toLocaleString()} XP
                                            </span>
                                        </div>
                                        <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${xpProgress}%` }}
                                                transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
                                                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
                                            />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Button
                                            size="sm"
                                            onClick={triggerXpAnimation}
                                            className="bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/20 text-xs hover:scale-105 transition-all"
                                        >
                                            <Zap className="w-3.5 h-3.5 mr-1" /> {profile.xp.toLocaleString()} XP
                                        </Button>
                                        {xpAnimating && (
                                            <motion.div
                                                className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 font-black text-sm pointer-events-none xp-float"
                                                initial={{ opacity: 1, y: 0 }}
                                                animate={{ opacity: 0, y: -40 }}
                                                transition={{ duration: 1 }}
                                            >
                                                +XP ✨
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
                >
                    {profile.stats.map(({ label, value, icon: Icon, color }: StatItem, i: number) => (
                        <Card
                            key={label}
                            className="bg-[#121212] border-white/5 p-4 text-center hover:border-orange-500/20 hover:-translate-y-1 transition duration-300"
                        >
                            <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
                            <div className={`text-xl font-black ${color}`}>{value}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                        </Card>
                    ))}
                </motion.div>

                {/* Tabs: Badges + Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Tabs defaultValue="badges">
                        <TabsList className="bg-[#121212] border border-white/5 mb-6">
                            <TabsTrigger value="badges" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400">
                                Badges
                            </TabsTrigger>
                            <TabsTrigger value="timeline" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400">
                                Activity Timeline
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="badges">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {profile.badges.map(({ icon, name, desc, earned }: BadgeItem, i: number) => (
                                    <motion.div
                                        key={name}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Card
                                            className={`border p-4 text-center transition-all duration-300 hover:scale-105 hover:-translate-y-1 ${earned
                                                ? "bg-[#121212] border-white/10 hover:border-orange-500/20"
                                                : "bg-[#121212]/50 border-white/5 opacity-50 grayscale hover:grayscale-0"
                                                }`}
                                        >
                                            <div className="mb-3 flex justify-center">{icon}</div>
                                            <div className={`text-sm font-semibold mb-1 ${earned ? "text-white" : "text-slate-500"}`}>
                                                {name}
                                            </div>
                                            <div className="text-xs text-slate-500">{desc}</div>
                                            {earned && (
                                                <div className="mt-2">
                                                    <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Earned
                                                    </Badge>
                                                </div>
                                            )}
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="timeline">
                            <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 duration-300 transition-all">
                                <div className="space-y-0">
                                    {profile.timeline.map(({ date, action, xp, type }: TimelineItem, i: number) => (
                                        <div key={i} className="flex gap-4 group">
                                            <div className="flex flex-col items-center">
                                                <div className="w-7 h-7 rounded-full bg-[#0A0A0A] border border-white/10 flex items-center justify-center group-hover:border-orange-500/30 group-hover:scale-110 transition-all duration-300">
                                                    {timelineIconMap[type]}
                                                </div>
                                                {i < profile.timeline.length - 1 && (
                                                    <div className="w-px flex-1 bg-white/5 my-1" />
                                                )}
                                            </div>
                                            <div className="pb-5 flex-1">
                                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                                    <p className="text-sm text-slate-300">{action}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-yellow-400">{xp}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Calendar className="w-3 h-3 text-slate-600" />
                                                    <span className="text-xs text-slate-600">{date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>
        </div>
    );
}
