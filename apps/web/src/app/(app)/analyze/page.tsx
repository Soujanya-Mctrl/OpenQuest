"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Search,
    Zap,
    Clock,
    Users,
    Star,
    Shield,
    Code,
    Brain,
    Activity,
    BookOpen,
    ArrowRight,
    CheckCircle,
    ExternalLink,
} from "lucide-react";

const exampleAnalysis = {
    url: "https://github.com/vercel/next.js",
    name: "next.js",
    org: "vercel",
    purpose:
        "Next.js is a full-stack React framework enabling hybrid rendering (SSR + SSG + ISR), file-based routing, API routes, and edge middleware for production-grade web applications.",
    lore: "Born in 2016 by Guillermo Rauch at Zeit (now Vercel), Next.js became the de facto standard for React apps at scale — powering everything from indie blogs to enterprise platforms.",
    techStack: [
        { name: "TypeScript", color: "blue", pct: 78 },
        { name: "JavaScript", color: "yellow", pct: 14 },
        { name: "MDX", color: "purple", pct: 5 },
        { name: "Bash", color: "green", pct: 3 },
    ],
    difficulty: { label: "Intermediate", score: 62, color: "yellow" },
    timeEstimate: "2–6 hours per quest",
    communityHealth: {
        score: 96,
        breakdown: [
            { label: "Documentation", val: 98 },
            { label: "Code Review Speed", val: 87 },
            { label: "Maintainer Activity", val: 95 },
            { label: "Issue Response Time", val: 91 },
            { label: "Diversity of Contributors", val: 89 },
        ],
    },
    stars: "120k",
    forks: "26k",
    openIssues: 1247,
    contributors: 3100,
    xpRange: "80–350 XP per quest",
};

const diffColorMap: Record<string, string> = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function AnalyzePage() {
    const [url, setUrl] = useState("https://github.com/vercel/next.js");
    const [analyzed, setAnalyzed] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = () => {
        if (!url) return;
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setAnalyzed(true);
        }, 1500);
    };

    return (
        <div className="relative">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20">
                        AI Repo Analysis
                    </Badge>
                    <h1 className="text-4xl font-bold text-white mb-2">Analyze a Repository</h1>
                    <p className="text-slate-400">
                        Paste any GitHub URL and our AI will break down purpose, stack, difficulty, and contribution opportunities.
                    </p>
                </motion.div>

                {/* URL Input */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-3 mb-10"
                >
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => { setUrl(e.target.value); setAnalyzed(false); }}
                            placeholder="https://github.com/owner/repo"
                            className="w-full bg-[#121212] border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/40"
                        />
                    </div>
                    <Button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-500 text-white border-0 px-6"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Analyzing…
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Brain className="w-4 h-4" /> Analyze
                            </span>
                        )}
                    </Button>
                </motion.div>

                {/* Results */}
                <AnimatePresence>
                    {analyzed && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* Repo header card */}
                            <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.01] duration-300 transition-all">
                                <div className="flex items-start justify-between flex-wrap gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-slate-500">{exampleAnalysis.org} /</span>
                                            <span className="text-2xl font-bold text-white">{exampleAnalysis.name}</span>
                                            <a href={exampleAnalysis.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4 text-slate-500 hover:text-blue-400 transition-colors" />
                                            </a>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge className={`border ${diffColorMap[exampleAnalysis.difficulty.color]}`}>
                                                <Shield className="w-3 h-3 mr-1" />
                                                {exampleAnalysis.difficulty.label}
                                            </Badge>
                                            <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                                <Zap className="w-3 h-3 mr-1" />
                                                {exampleAnalysis.xpRange}
                                            </Badge>
                                            <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {exampleAnalysis.timeEstimate}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        {[
                                            { icon: Star, label: "Stars", val: exampleAnalysis.stars },
                                            { icon: Activity, label: "Forks", val: exampleAnalysis.forks },
                                            { icon: BookOpen, label: "Issues", val: exampleAnalysis.openIssues },
                                            { icon: Users, label: "Contributors", val: exampleAnalysis.contributors },
                                        ].map(({ icon: Icon, label, val }) => (
                                            <div key={label} className="flex flex-col items-center">
                                                <Icon className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                                                <span className="text-white font-bold text-sm">{val}</span>
                                                <span className="text-slate-600 text-xs">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Purpose */}
                                <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.02] duration-300 transition-all">
                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-orange-400" /> Purpose
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{exampleAnalysis.purpose}</p>
                                </Card>

                                {/* Lore */}
                                <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.02] duration-300 transition-all">
                                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-orange-400" /> Project Lore
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{exampleAnalysis.lore}</p>
                                </Card>

                                {/* Tech Stack */}
                                <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.02] duration-300 transition-all">
                                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                        <Code className="w-4 h-4 text-orange-400" /> Tech Stack
                                    </h3>
                                    <div className="space-y-3">
                                        {exampleAnalysis.techStack.map(({ name, color, pct }) => (
                                            <div key={name} className="flex items-center gap-3">
                                                <span className={`text-xs font-medium w-20 ${diffColorMap[color].split(" ")[1]}`}>{name}</span>
                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                                        className={`h-full rounded-full ${color === "blue" ? "bg-blue-500" :
                                                            color === "yellow" ? "bg-yellow-500" :
                                                                color === "purple" ? "bg-purple-500" : "bg-green-500"
                                                            }`}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* Difficulty + Community Health */}
                                <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.02] duration-300 transition-all">
                                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-orange-400" /> Community Health
                                    </h3>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="relative w-14 h-14">
                                            <svg className="w-14 h-14 -rotate-90">
                                                <circle cx="28" cy="28" r="22" fill="none" stroke="#1E293B" strokeWidth="4" />
                                                <circle
                                                    cx="28"
                                                    cy="28"
                                                    r="22"
                                                    fill="none"
                                                    stroke="#22C55E"
                                                    strokeWidth="4"
                                                    strokeDasharray={`${(exampleAnalysis.communityHealth.score / 100) * 138.2} 138.2`}
                                                />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-400">
                                                {exampleAnalysis.communityHealth.score}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold">Excellent Health</p>
                                            <p className="text-xs text-slate-500">Top 5% of all repositories</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {exampleAnalysis.communityHealth.breakdown.map(({ label, val }) => (
                                            <div key={label} className="flex items-center gap-2">
                                                <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                                                <span className="text-xs text-slate-400 flex-1">{label}</span>
                                                <span className="text-xs text-green-400 font-medium">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>

                            {/* Difficulty score */}
                            <Card className="bg-[#121212] border-white/5 p-6 hover:border-orange-500/20 hover:scale-[1.01] duration-300 transition-all">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-yellow-400" /> Contribution Difficulty Score
                                </h3>
                                <div className="flex items-center gap-4 mb-2">
                                    <Progress value={exampleAnalysis.difficulty.score} className="flex-1 h-3" />
                                    <span className="text-2xl font-bold text-yellow-400">{exampleAnalysis.difficulty.score}/100</span>
                                    <Badge className={`border ${diffColorMap[exampleAnalysis.difficulty.color]}`}>
                                        {exampleAnalysis.difficulty.label}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Score considers codebase size, documentation quality, issue clarity, and average PR complexity.
                                </p>
                            </Card>

                            <div className="flex justify-center mt-4">
                                <Button
                                    size="lg"
                                    className="bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-lg shadow-orange-500/20 px-10 hover:scale-105 transition-transform"
                                    asChild
                                >
                                    <a href="/quests">
                                        Explore Quests for this Repo <ArrowRight className="w-5 h-5 ml-2" />
                                    </a>
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
