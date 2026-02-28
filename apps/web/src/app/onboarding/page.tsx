"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Zap,
    ArrowRight,
    ArrowLeft,
    Check,
    Code2,
    Bug,
    FileText,
    TestTube,
    Lightbulb,
    Briefcase,
    Heart,
    GraduationCap,
    Rocket,
    Github,
} from "lucide-react";
import { useRouter } from "next/navigation";

const STEPS = [
    "welcome",
    "experience",
    "languages",
    "contribution",
    "goals",
    "complete",
] as const;

type Step = (typeof STEPS)[number];

const experienceLevels = [
    {
        id: "beginner",
        label: "Beginner",
        desc: "I'm new to programming or open source",
        emoji: "🌱",
    },
    {
        id: "intermediate",
        label: "Intermediate",
        desc: "I've built projects and know my way around Git",
        emoji: "🔥",
    },
    {
        id: "advanced",
        label: "Advanced",
        desc: "I contribute to open source regularly",
        emoji: "⚡",
    },
    {
        id: "expert",
        label: "Expert",
        desc: "I maintain open source projects",
        emoji: "🏆",
    },
];

const languages = [
    { id: "javascript", label: "JavaScript", color: "#f7df1e" },
    { id: "typescript", label: "TypeScript", color: "#3178c6" },
    { id: "python", label: "Python", color: "#3776ab" },
    { id: "rust", label: "Rust", color: "#ce422b" },
    { id: "go", label: "Go", color: "#00add8" },
    { id: "java", label: "Java", color: "#ed8b00" },
    { id: "csharp", label: "C#", color: "#68217a" },
    { id: "cpp", label: "C++", color: "#00599c" },
    { id: "ruby", label: "Ruby", color: "#cc342d" },
    { id: "swift", label: "Swift", color: "#fa7343" },
    { id: "kotlin", label: "Kotlin", color: "#7f52ff" },
    { id: "php", label: "PHP", color: "#777bb4" },
];

const contributionTypes = [
    { id: "bugfixes", label: "Bug Fixes", desc: "Find and squash bugs", icon: Bug },
    { id: "features", label: "New Features", desc: "Build something new", icon: Code2 },
    { id: "docs", label: "Documentation", desc: "Write guides & docs", icon: FileText },
    { id: "testing", label: "Testing", desc: "Write tests & QA", icon: TestTube },
];

const goals = [
    { id: "learn", label: "Learn & Grow", desc: "Improve my skills through real projects", icon: GraduationCap },
    { id: "portfolio", label: "Build Portfolio", desc: "Showcase my work to employers", icon: Briefcase },
    { id: "giveback", label: "Give Back", desc: "Support projects I love", icon: Heart },
    { id: "career", label: "Get Hired", desc: "Land a developer job", icon: Lightbulb },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>("welcome");
    const [answers, setAnswers] = useState({
        experience: "",
        languages: [] as string[],
        contributions: [] as string[],
        goal: "",
    });

    const stepIndex = STEPS.indexOf(currentStep);
    const progress = ((stepIndex) / (STEPS.length - 1)) * 100;

    const next = () => {
        const nextIndex = stepIndex + 1;
        if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex]);
    };

    const prev = () => {
        const prevIndex = stepIndex - 1;
        if (prevIndex >= 0) setCurrentStep(STEPS[prevIndex]);
    };

    const toggleLanguage = (id: string) => {
        setAnswers((prev) => ({
            ...prev,
            languages: prev.languages.includes(id)
                ? prev.languages.filter((l) => l !== id)
                : [...prev.languages, id],
        }));
    };

    const toggleContribution = (id: string) => {
        setAnswers((prev) => ({
            ...prev,
            contributions: prev.contributions.includes(id)
                ? prev.contributions.filter((c) => c !== id)
                : [...prev.contributions, id],
        }));
    };

    const canProceed = () => {
        switch (currentStep) {
            case "welcome": return true;
            case "experience": return answers.experience !== "";
            case "languages": return answers.languages.length > 0;
            case "contribution": return answers.contributions.length > 0;
            case "goals": return answers.goal !== "";
            case "complete": return true;
            default: return false;
        }
    };

    const handleComplete = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/user/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(answers),
            });

            if (!res.ok) {
                console.error("Failed to save preferences:", await res.text());
            }
        } catch (err) {
            console.error("Error saving preferences:", err);
        }

        router.push("/projects");
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
            {/* Top bar */}
            <div className="h-14 flex items-center justify-between px-6 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[4px] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-bold text-white tracking-tight">
                        Open<span className="text-orange-400">Quest</span>
                    </span>
                </div>
                {currentStep !== "welcome" && currentStep !== "complete" && (
                    <span className="text-xs text-slate-500">
                        Step {stepIndex} of {STEPS.length - 2}
                    </span>
                )}
            </div>

            {/* Progress bar */}
            {currentStep !== "welcome" && (
                <div className="h-1 bg-white/5">
                    <motion.div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                </div>
            )}

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="w-full max-w-xl"
                    >
                        {/* WELCOME */}
                        {currentStep === "welcome" && (
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-[8px] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mx-auto mb-6">
                                    <Rocket className="w-10 h-10 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold text-white mb-3">
                                    Let&apos;s personalize your quest!
                                </h1>
                                <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
                                    Answer a few quick questions so we can match you with the perfect
                                    open source projects and issues.
                                </p>
                                <Button size="lg" className="px-8 gap-2" onClick={next}>
                                    Let&apos;s Go <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {/* EXPERIENCE */}
                        {currentStep === "experience" && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2 text-center">
                                    What&apos;s your experience level?
                                </h2>
                                <p className="text-slate-400 text-sm mb-8 text-center">
                                    This helps us find issues at the right difficulty.
                                </p>
                                <div className="space-y-3">
                                    {experienceLevels.map(({ id, label, desc, emoji }) => (
                                        <button
                                            key={id}
                                            onClick={() => setAnswers((p) => ({ ...p, experience: id }))}
                                            className={`w-full text-left p-4 rounded-[6px] border-2 transition-all duration-150 flex items-center gap-4 ${answers.experience === id
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-white/5 bg-[#111] hover:border-white/10"
                                                }`}
                                        >
                                            <span className="text-2xl">{emoji}</span>
                                            <div>
                                                <div className="text-sm font-semibold text-white">{label}</div>
                                                <div className="text-xs text-slate-400">{desc}</div>
                                            </div>
                                            {answers.experience === id && (
                                                <Check className="w-5 h-5 text-orange-400 ml-auto" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* LANGUAGES */}
                        {currentStep === "languages" && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2 text-center">
                                    Pick your languages
                                </h2>
                                <p className="text-slate-400 text-sm mb-8 text-center">
                                    Select all the languages you&apos;re comfortable with.
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {languages.map(({ id, label, color }) => (
                                        <button
                                            key={id}
                                            onClick={() => toggleLanguage(id)}
                                            className={`p-3 rounded-[6px] border-2 transition-all duration-150 text-center ${answers.languages.includes(id)
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-white/5 bg-[#111] hover:border-white/10"
                                                }`}
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full mx-auto mb-2"
                                                style={{ backgroundColor: color }}
                                            />
                                            <div className="text-xs font-medium text-white">{label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CONTRIBUTION TYPE */}
                        {currentStep === "contribution" && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2 text-center">
                                    How do you like to contribute?
                                </h2>
                                <p className="text-slate-400 text-sm mb-8 text-center">
                                    Select all that interest you.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {contributionTypes.map(({ id, label, desc, icon: Icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => toggleContribution(id)}
                                            className={`p-5 rounded-[6px] border-2 transition-all duration-150 text-left ${answers.contributions.includes(id)
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-white/5 bg-[#111] hover:border-white/10"
                                                }`}
                                        >
                                            <Icon className={`w-6 h-6 mb-3 ${answers.contributions.includes(id) ? "text-orange-400" : "text-slate-500"}`} />
                                            <div className="text-sm font-semibold text-white">{label}</div>
                                            <div className="text-xs text-slate-400 mt-1">{desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* GOALS */}
                        {currentStep === "goals" && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2 text-center">
                                    What&apos;s your goal?
                                </h2>
                                <p className="text-slate-400 text-sm mb-8 text-center">
                                    We&apos;ll tailor your quest feed to match.
                                </p>
                                <div className="space-y-3">
                                    {goals.map(({ id, label, desc, icon: Icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => setAnswers((p) => ({ ...p, goal: id }))}
                                            className={`w-full text-left p-4 rounded-[6px] border-2 transition-all duration-150 flex items-center gap-4 ${answers.goal === id
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-white/5 bg-[#111] hover:border-white/10"
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 ${answers.goal === id ? "text-orange-400" : "text-slate-500"}`} />
                                            <div>
                                                <div className="text-sm font-semibold text-white">{label}</div>
                                                <div className="text-xs text-slate-400">{desc}</div>
                                            </div>
                                            {answers.goal === id && (
                                                <Check className="w-5 h-5 text-orange-400 ml-auto" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* COMPLETE */}
                        {currentStep === "complete" && (
                            <div className="text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mx-auto mb-6"
                                >
                                    <Check className="w-10 h-10 text-white" />
                                </motion.div>
                                <h1 className="text-3xl font-bold text-white mb-3">
                                    You&apos;re all set!
                                </h1>
                                <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
                                    We&apos;ve personalized your quest feed based on your answers.
                                    Time to start contributing!
                                </p>
                                <Button size="lg" className="px-8 gap-2" onClick={handleComplete}>
                                    Start Exploring <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {/* Navigation buttons (not on welcome/complete) */}
                        {currentStep !== "welcome" && currentStep !== "complete" && (
                            <div className="flex items-center justify-between mt-8">
                                <Button variant="ghost" size="sm" onClick={prev} className="gap-1">
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={next}
                                    disabled={!canProceed()}
                                    className="gap-1"
                                >
                                    Continue <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
