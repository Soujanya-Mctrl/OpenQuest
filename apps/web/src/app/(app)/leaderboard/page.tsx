"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Zap,
    Flame,
    Trophy,
    ArrowUp,
    ArrowDown,
    Minus,
    Crown,
    Star,
    Shield,
    Globe,
    Package,
    Calendar,
} from "lucide-react";

const tiers: Record<string, { label: string; color: string }> = {
    "1": { label: "Shore Scout", color: "text-green-400" },
    "2": { label: "Code Explorer", color: "text-blue-400" },
    "3": { label: "Island Raider", color: "text-orange-400" },
    "4": { label: "Legendary Islander", color: "text-yellow-400" },
};

const globalLeaderboard = [
    { rank: 1, username: "codemaster_k", name: "Kunal Shah", avatar: "KS", level: 42, xp: 98400, cr: 94, streak: 45, change: "same", tier: "4" },
    { rank: 2, username: "devninja99", name: "Maria García", avatar: "MG", level: 38, xp: 82100, cr: 91, streak: 30, change: "up", tier: "4" },
    { rank: 3, username: "js_wizard", name: "Tom Chen", avatar: "TC", level: 35, xp: 71500, cr: 88, streak: 22, change: "up", tier: "4" },
    { rank: 4, username: "opendev_ai", name: "Aisha Patel", avatar: "AP", level: 32, xp: 65000, cr: 86, streak: 18, change: "down", tier: "4" },
    { rank: 5, username: "rustacean", name: "Lars Nielsen", avatar: "LN", level: 29, xp: 54200, cr: 83, streak: 14, change: "up", tier: "3" },
    { rank: 6, username: "ty_the_dev", name: "Tyler Wright", avatar: "TW", level: 26, xp: 48700, cr: 81, streak: 11, change: "same", tier: "3" },
    { rank: 7, username: "pydev_leo", name: "Leonardo B.", avatar: "LB", level: 24, xp: 43100, cr: 79, streak: 9, change: "down", tier: "3" },
    { rank: 8, username: "cssqueen", name: "Sophie L.", avatar: "SL", level: 22, xp: 38900, cr: 77, streak: 8, change: "up", tier: "3" },
    { rank: 9, username: "godev_fy", name: "Felix Yuen", avatar: "FY", level: 20, xp: 34200, cr: 75, streak: 6, change: "down", tier: "3" },
    { rank: 10, username: "react_queen", name: "Nina Ivanova", avatar: "NI", level: 18, xp: 29800, cr: 73, streak: 5, change: "up", tier: "3" },
    { rank: 47, username: "vanshdeo", name: "Vansh Deo", avatar: "VD", level: 18, xp: 8240, cr: 61, streak: 12, change: "up", tier: "3", isCurrentUser: true },
];

const repoLeaderboard = [
    { rank: 1, username: "codemaster_k", name: "Kunal Shah", avatar: "KS", level: 42, xp: 12400, cr: 94, streak: 45, change: "same", tier: "4" },
    { rank: 2, username: "devninja99", name: "Maria García", avatar: "MG", level: 38, xp: 9100, cr: 91, streak: 30, change: "up", tier: "4" },
    { rank: 3, username: "vanshdeo", name: "Vansh Deo", avatar: "VD", level: 18, xp: 4200, cr: 61, streak: 12, change: "up", tier: "3", isCurrentUser: true },
    { rank: 4, username: "js_wizard", name: "Tom Chen", avatar: "TC", level: 35, xp: 3800, cr: 88, streak: 22, change: "down", tier: "4" },
    { rank: 5, username: "rustacean", name: "Lars Nielsen", avatar: "LN", level: 29, xp: 3100, cr: 83, streak: 14, change: "up", tier: "3" },
];

const changeIcon = (change: string) => {
    if (change === "up") return <ArrowUp className="w-3 h-3 text-green-400" />;
    if (change === "down") return <ArrowDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-slate-600" />;
};

const rankDisplay = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <span className="text-slate-300 font-bold text-sm">2nd</span>;
    if (rank === 3) return <span className="text-orange-400 font-bold text-sm">3rd</span>;
    return <span className="text-slate-400 font-semibold text-sm">#{rank}</span>;
};

function LeaderboardTable({ data }: { data: typeof globalLeaderboard }) {
    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_80px_80px_80px_80px_40px] gap-4 px-4 py-2 text-xs text-slate-600 uppercase tracking-wide">
                <span>Rank</span>
                <span>Player</span>
                <span className="text-center">Level</span>
                <span className="text-center">CR</span>
                <span className="text-center">XP</span>
                <span className="text-center">Streak</span>
                <span />
            </div>
            {data.map((row, i) => (
                <motion.div
                    key={row.username}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                    <Card
                        className={`border transition-all ${"isCurrentUser" in row && row.isCurrentUser
                            ? "bg-orange-500/5 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                            : "bg-[#121212] border-white/5 hover:border-orange-500/20"
                            }`}
                    >
                        <div className="grid grid-cols-[40px_1fr_80px_80px_80px_80px_40px] gap-4 px-4 py-3 items-center">
                            {/* Rank */}
                            <div className="flex justify-center">{rankDisplay(row.rank)}</div>

                            {/* Player */}
                            <div className="flex items-center gap-2.5">
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-600 text-white text-xs font-bold">
                                        {row.avatar}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-semibold text-white">{row.name}</span>
                                        {"isCurrentUser" in row && row.isCurrentUser && (
                                            <Badge className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/20 py-0">
                                                You
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500">@{row.username}</span>
                                </div>
                            </div>

                            {/* Level */}
                            <div className="text-center">
                                <span className={`text-sm font-bold ${tiers[row.tier]?.color ?? "text-white"}`}>
                                    {row.level}
                                </span>
                                <div className="text-xs text-slate-600 truncate">{tiers[row.tier]?.label?.split(" ")[0]}</div>
                            </div>

                            {/* CR */}
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-400" />
                                    <span className="text-sm font-semibold text-white">{row.cr}</span>
                                </div>
                            </div>

                            {/* XP */}
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <Zap className="w-3 h-3 text-yellow-400" />
                                    <span className="text-sm font-semibold text-yellow-400">
                                        {row.xp.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Streak */}
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <Flame className="w-3 h-3 text-orange-400" />
                                    <span className="text-sm font-semibold text-white">{row.streak}d</span>
                                </div>
                            </div>

                            {/* Change */}
                            <div className="flex justify-center">{changeIcon(row.change)}</div>
                        </div>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}

export default function LeaderboardPage() {
    return (
        <div className="relative">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <Badge className="mb-3 bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                        <Trophy className="w-3.5 h-3.5 mr-1.5 fill-yellow-400" /> Rankings
                    </Badge>
                    <h1 className="text-4xl font-bold text-white mb-2">Leaderboard</h1>
                    <p className="text-slate-400">
                        Compete globally, per repo, by tech stack, and monthly. Only real merged contributions count.
                    </p>
                </motion.div>

                {/* Top 3 Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 gap-4 mb-10"
                >
                    {[globalLeaderboard[1], globalLeaderboard[0], globalLeaderboard[2]].map((user, i) => {
                        const positions = [2, 1, 3];
                        const pos = positions[i];
                        const heights = ["pt-8", "pt-0", "pt-12"];
                        const sizes = ["scale-95", "scale-100", "scale-90"];
                        return (
                            <div key={user.username} className={`flex flex-col items-center ${heights[i]} ${sizes[i]}`}>
                                {pos === 1 && <Crown className="w-6 h-6 text-yellow-400 mb-1" />}
                                <div
                                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pos === 1 ? "from-yellow-400 to-orange-500" :
                                        pos === 2 ? "from-slate-400 to-slate-600" :
                                            "from-orange-700 to-orange-900"
                                        } flex items-center justify-center text-white font-black text-lg shadow-xl mb-2`}
                                >
                                    {user.avatar}
                                </div>
                                <div className="text-center">
                                    <div className="text-white font-semibold text-sm">{user.name}</div>
                                    <div className={`text-xs font-bold ${pos === 1 ? "text-yellow-400" : pos === 2 ? "text-slate-400" : "text-orange-400"}`}>
                                        #{pos}
                                    </div>
                                    <div className="flex items-center gap-1 justify-center mt-1">
                                        <Zap className="w-3 h-3 text-yellow-400" />
                                        <span className="text-xs text-yellow-400 font-semibold">
                                            {user.xp.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </motion.div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Tabs defaultValue="global">
                        <TabsList className="bg-[#121212] border border-white/5 mb-6">
                            <TabsTrigger value="global" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400">
                                <Globe className="w-3.5 h-3.5 mr-1" /> Global
                            </TabsTrigger>
                            <TabsTrigger value="repo" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400">
                                <Package className="w-3.5 h-3.5 mr-1" /> Repo
                            </TabsTrigger>
                            <TabsTrigger value="tech" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400">
                                <Zap className="w-3.5 h-3.5 mr-1" /> Tech Stack
                            </TabsTrigger>
                            <TabsTrigger value="monthly" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-400">
                                <Calendar className="w-3.5 h-3.5 mr-1" /> Monthly
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="global">
                            <LeaderboardTable data={globalLeaderboard} />
                        </TabsContent>
                        <TabsContent value="repo">
                            <div className="mb-4 flex items-center gap-2">
                                <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">vercel/next.js</Badge>
                                <span className="text-xs text-slate-500">Top contributors this month</span>
                            </div>
                            <LeaderboardTable data={repoLeaderboard} />
                        </TabsContent>
                        <TabsContent value="tech">
                            <div className="mb-4 flex gap-2 flex-wrap">
                                {["TypeScript", "Python", "Rust", "Go", "React"].map((tech) => (
                                    <Badge
                                        key={tech}
                                        className={`cursor-pointer transition-colors ${tech === "TypeScript" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "border-white/10 text-slate-500 bg-transparent hover:text-white"}`}
                                    >
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                            <LeaderboardTable data={globalLeaderboard.slice(0, 7)} />
                        </TabsContent>
                        <TabsContent value="monthly">
                            <div className="mb-4">
                                <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                                    🔥 February 2025 Rankings
                                </Badge>
                            </div>
                            <LeaderboardTable data={globalLeaderboard.slice(0, 8).reverse()} />
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>
        </div>
    );
}
