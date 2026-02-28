"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Zap,
    Clock,
    Shield,
    Star,
    ArrowRight,
    Filter,
    CheckCircle,
    BookOpen,
    Play,
    GitPullRequest,
} from "lucide-react";

const diffColorMap: Record<string, string> = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
};

const quests = [
    {
        id: 1,
        title: "Fix hydration error in App Router with dynamic routes",
        repo: "vercel/next.js",
        difficulty: "Intermediate",
        diffColor: "yellow",
        xp: 280,
        time: "3–5 hrs",
        labels: ["bug", "app-router", "good first issue"],
        description:
            "Investigate and fix a hydration mismatch occurring when dynamic route params are accessed in client components using the new App Router.",
        tasks: [
            "Reproduce the hydration error locally",
            "Identify the root cause in the routing layer",
            "Write a fix with backward compat",
            "Add unit tests for the fix",
            "Update changelog",
        ],
        stars: 124,
    },
    {
        id: 2,
        title: "Add keyboard navigation to Combobox component",
        repo: "shadcn/shadcn-ui",
        difficulty: "Beginner",
        diffColor: "green",
        xp: 120,
        time: "1–2 hrs",
        labels: ["accessibility", "component", "good first issue"],
        description:
            "The Combobox component lacks proper arrow key navigation and Escape key handling for accessibility compliance.",
        tasks: [
            "Review ARIA Combobox pattern spec",
            "Implement arrow key navigation",
            "Add Escape key to close dropdown",
            "Test with screen reader",
        ],
        stars: 87,
    },
    {
        id: 3,
        title: "Optimize image loading in production builds",
        repo: "vercel/next.js",
        difficulty: "Advanced",
        diffColor: "orange",
        xp: 450,
        time: "6–10 hrs",
        labels: ["performance", "images", "needs-review"],
        description:
            "Improve image optimization pipeline to reduce LCP by avoiding unnecessary re-processing of already-optimized images.",
        tasks: [
            "Profile current image pipeline",
            "Implement smart caching layer",
            "Add cache invalidation logic",
            "Benchmark improvement",
            "Write documentation",
            "Submit PR with perf report",
        ],
        stars: 203,
    },
    {
        id: 4,
        title: "Improve TypeScript types for useQuery hook",
        repo: "tanstack/query",
        difficulty: "Intermediate",
        diffColor: "yellow",
        xp: 200,
        time: "2–4 hrs",
        labels: ["typescript", "types", "help wanted"],
        description:
            "The current useQuery generic types don't properly infer the error type when a custom error class is provided.",
        tasks: [
            "Understand current generic structure",
            "Propose new type signature",
            "Implement changes",
            "Add type tests with expect-type",
        ],
        stars: 156,
    },
    {
        id: 5,
        title: "Add dark mode to documentation site",
        repo: "tailwindlabs/tailwindcss",
        difficulty: "Beginner",
        diffColor: "green",
        xp: 90,
        time: "1–3 hrs",
        labels: ["documentation", "design", "good first issue"],
        description:
            "The official docs site does not respect the system dark mode preference. Implement using CSS media queries and CSS variables.",
        tasks: [
            "Set up dark mode tokens",
            "Apply to all doc pages",
            "Test on macOS and Windows",
        ],
        stars: 44,
    },
    {
        id: 6,
        title: "CUDA out-of-memory on batch normalization backward pass",
        repo: "pytorch/pytorch",
        difficulty: "Expert",
        diffColor: "red",
        xp: 800,
        time: "10–20 hrs",
        labels: ["cuda", "memory", "expert"],
        description:
            "Reproduce and fix OOM errors when running batch normalization backward pass with very large batch sizes on A100 GPUs.",
        tasks: [
            "Reproduce issue with provided repro script",
            "Profile GPU memory allocation",
            "Identify the allocation spike",
            "Implement memory-efficient backward pass",
            "Run benchmark suite",
            "Write test case",
        ],
        stars: 512,
    },
];

export default function QuestsPage() {
    const [selectedQuest, setSelectedQuest] = useState<(typeof quests)[0] | null>(null);
    const [startedQuests, setStartedQuests] = useState<number[]>([]);

    const handleStart = (id: number) => {
        setStartedQuests((prev) => [...prev, id]);
    };

    return (
        <div className="relative">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20">
                        <Zap className="w-3.5 h-3.5 mr-1.5" /> Quest Board
                    </Badge>
                    <h1 className="text-4xl font-bold text-white mb-2">Active Quests</h1>
                    <p className="text-slate-400">
                        Every GitHub issue is a quest. Pick one, complete it, and earn your XP.
                    </p>
                </motion.div>

                {/* Filter bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap gap-3 mb-8"
                >
                    {["All Difficulties", "Beginner", "Intermediate", "Advanced", "Expert"].map((f) => (
                        <button
                            key={f}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${f === "All Difficulties"
                                ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                    <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                        <Filter className="w-3.5 h-3.5" /> Sort by XP
                    </button>
                </motion.div>

                {/* Quest Grid */}
                <div className="space-y-4">
                    {quests.map((quest, i) => (
                        <motion.div
                            key={quest.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.4 }}
                        >
                            <Card className="bg-[#121212] border-white/5 p-5 hover:border-orange-500/20 hover:scale-[1.01] duration-300 transition-all group">
                                <div className="flex items-start gap-4 flex-wrap">
                                    {/* XP badge */}
                                    <div className="flex flex-col items-center justify-center bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-2 min-w-[64px]">
                                        <Zap className="w-4 h-4 text-yellow-400 mb-0.5" />
                                        <span className="text-lg font-black text-yellow-400 leading-none">
                                            {quest.xp}
                                        </span>
                                        <span className="text-xs text-yellow-400/60">XP</span>
                                    </div>

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                                            <h3
                                                className="text-white font-semibold group-hover:text-orange-400 transition-colors cursor-pointer"
                                                onClick={() => setSelectedQuest(quest)}
                                            >
                                                {quest.title}
                                            </h3>
                                            <div className="flex items-center gap-1 text-yellow-400 text-xs ml-auto">
                                                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                                                {quest.stars} watchers
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <GitPullRequest className="w-3 h-3" /> {quest.repo}
                                            </span>
                                            <Badge className={`text-xs border ${diffColorMap[quest.diffColor]}`}>
                                                <Shield className="w-3 h-3 mr-1" /> {quest.difficulty}
                                            </Badge>
                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                <Clock className="w-3 h-3" /> {quest.time}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {quest.labels.map((label) => (
                                                <Badge
                                                    key={label}
                                                    className="text-xs border border-white/5 text-slate-500 bg-transparent"
                                                >
                                                    {label}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs"
                                            onClick={() => setSelectedQuest(quest)}
                                        >
                                            <BookOpen className="w-3.5 h-3.5 mr-1" /> Details
                                        </Button>
                                        {startedQuests.includes(quest.id) ? (
                                            <Button
                                                size="sm"
                                                className="bg-green-600/20 text-green-400 border border-green-500/20 text-xs cursor-default hover:bg-green-600/20 hover:text-green-400"
                                                disabled
                                            >
                                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> In Progress
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="bg-orange-600 hover:bg-orange-500 text-white border-0 text-xs shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
                                                onClick={() => { handleStart(quest.id); setSelectedQuest(quest); }}
                                            >
                                                <Play className="w-3.5 h-3.5 mr-1" /> Start Quest
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Quest Detail Modal */}
            <Dialog open={!!selectedQuest} onOpenChange={(o) => !o && setSelectedQuest(null)}>
                <DialogContent className="bg-[#121212] border-white/10 max-w-2xl">
                    {selectedQuest && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className={`text-xs border ${diffColorMap[selectedQuest.diffColor]}`}>
                                        <Shield className="w-3 h-3 mr-1" /> {selectedQuest.difficulty}
                                    </Badge>
                                    <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20 text-xs">
                                        <Zap className="w-3 h-3 mr-1" /> {selectedQuest.xp} XP
                                    </Badge>
                                    <Badge className="bg-slate-700 text-slate-400 border-white/5 text-xs">
                                        <Clock className="w-3 h-3 mr-1" /> {selectedQuest.time}
                                    </Badge>
                                </div>
                                <DialogTitle className="text-white text-xl leading-tight">
                                    {selectedQuest.title}
                                </DialogTitle>
                                <p className="text-xs text-slate-500 flex items-center gap-1 pt-1">
                                    <GitPullRequest className="w-3 h-3" /> {selectedQuest.repo}
                                </p>
                            </DialogHeader>

                            <div className="space-y-5 pt-2">
                                <div>
                                    <h4 className="text-sm font-semibold text-white mb-2">Overview</h4>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        {selectedQuest.description}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-white mb-3">
                                        Quest Checklist ({selectedQuest.tasks.length} tasks)
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedQuest.tasks.map((task, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <div
                                                    className={`w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center ${startedQuests.includes(selectedQuest.id) && i === 0
                                                        ? "bg-green-500/20 border-green-500/40"
                                                        : "border-white/10"
                                                        }`}
                                                >
                                                    {startedQuests.includes(selectedQuest.id) && i === 0 && (
                                                        <CheckCircle className="w-3 h-3 text-green-400" />
                                                    )}
                                                </div>
                                                <span className="text-sm text-slate-400">{task}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-semibold text-white">Progress</h4>
                                        <span className="text-xs text-slate-500">
                                            {startedQuests.includes(selectedQuest.id) ? "1" : "0"} of {selectedQuest.tasks.length} complete
                                        </span>
                                    </div>
                                    <Progress
                                        value={
                                            startedQuests.includes(selectedQuest.id)
                                                ? (1 / selectedQuest.tasks.length) * 100
                                                : 0
                                        }
                                        className="h-2"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    {!startedQuests.includes(selectedQuest.id) ? (
                                        <Button
                                            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform"
                                            onClick={() => handleStart(selectedQuest.id)}
                                        >
                                            <Play className="w-4 h-4 mr-2" /> Start This Quest
                                        </Button>
                                    ) : (
                                        <Button
                                            className="flex-1 bg-green-600/20 text-green-400 border border-green-500/20"
                                            disabled
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" /> Quest In Progress
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                                        asChild
                                    >
                                        <a href="#" target="_blank" rel="noopener noreferrer">
                                            <ArrowRight className="w-4 h-4 mr-1" /> View on GitHub
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
