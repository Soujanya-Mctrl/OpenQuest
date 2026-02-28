"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Zap,
  Star,
  GitPullRequest,
  Trophy,
  Target,
  Brain,
  TrendingUp,
  Rocket,
  Github,
} from "lucide-react";
import Link from "next/link";

import type { Variants } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

const handleGithubLogin = () => {
  window.location.href = `${API_BASE}/api/auth/github`;
};

const problems = [
  {
    icon: Target,
    title: "Where do I start?",
    desc: "Finding beginner-friendly issues in large repos is frustrating and time-consuming.",
  },
  {
    icon: Brain,
    title: "No feedback loop",
    desc: "Contributions feel invisible. There's no reward or progression tracking.",
  },
  {
    icon: TrendingUp,
    title: "No direction",
    desc: "Without guidance, contributors jump between projects with no clear path forward.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Connect GitHub",
    desc: "Sign in with your GitHub account. We analyze your repos and activity to understand your skill level.",
  },
  {
    step: "02",
    title: "Get Matched",
    desc: "AI surfaces the best issues for your skill level — no more scrolling through thousands of repos.",
  },
  {
    step: "03",
    title: "Complete Quests",
    desc: "Each issue becomes a quest with difficulty rating, XP reward, and a step-by-step guide.",
  },
  {
    step: "04",
    title: "Level Up",
    desc: "Earn XP, unlock badges, climb leaderboards, and build a portfolio that speaks for itself.",
  },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Level 18 — Island Raider",
    avatar: "SC",
    text: "OpenQuest turned my occasional PRs into a daily habit. The quest system makes open source addictive.",
    xp: "8,240 XP",
  },
  {
    name: "Marcus Dev",
    role: "Level 31 — Legendary Islander",
    avatar: "MD",
    text: "I found my first real open source project through OpenQuest's AI. The difficulty score was spot on.",
    xp: "32,100 XP",
  },
  {
    name: "Priya K.",
    role: "Level 9 — Code Explorer",
    avatar: "PK",
    text: "The XP system is addictive. Way better than just staring at a blank GitHub contribution graph.",
    xp: "2,780 XP",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      {/* STANDALONE NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[6px] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">
              Open<span className="text-orange-400">Quest</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <a href="#how-it-works" className="text-xs text-slate-400 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="/leaderboard" className="text-xs text-slate-400 hover:text-white transition-colors">
              Leaderboard
            </a>
            <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors">
              Docs
            </a>
            <a href="#testimonials" className="text-xs text-slate-400 hover:text-white transition-colors">
              Community
            </a>
          </div>

          <Button
            onClick={handleGithubLogin}
            size="sm"
            className="gap-2"
          >
            <Github className="w-4 h-4" />
            Connect GitHub
          </Button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-20 pb-16 m-35">
        {/* Animated gradient blob */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0.05) 50%, transparent 70%)' }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="flex flex-col items-center"
          >
            <Badge className="mb-5 bg-orange-500/[0.12] text-orange-400 border-orange-500/40 hover:bg-orange-500/20 text-xs px-3 py-1 font-medium rounded-[3px]">
              <Rocket className="w-3 h-3 mr-1.5 text-orange-400" />
              Open source, reimagined
            </Badge>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-5 tracking-tight"
          >
            Your open source journey,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              gamified.
            </span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="text-base text-slate-300 max-w-lg mx-auto mb-10 leading-relaxed"
          >
            Connect your GitHub, discover projects matched to your skill level,
            complete quests, earn XP, and level up as a contributor.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="px-8 text-sm font-semibold gap-2"
              onClick={handleGithubLogin}
            >
              <Github className="w-4 h-4" />
              Get Started — It&apos;s Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-6 text-sm border-white/35 text-white bg-white/5 hover:bg-white/10 hover:border-white/60"
              asChild
            >
              <a href="#how-it-works">
                See How It Works <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="py-16 border-t border-white/5 m-35">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20 rounded-[3px] text-xs">
              The Problem
            </Badge>
            <h2 className="text-3xl font-bold text-white mb-3">
              Open source is{" "}
              <span className="text-orange-400">broken for beginners</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-md mx-auto">
              Most developers want to contribute, but the experience is overwhelming, unrewarding, and directionless.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {problems.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="bg-[#111] border-white/5 p-6 h-full hover:border-orange-500/20 duration-200 transition-all rounded-[6px]">
                  <div className="w-10 h-10 rounded-[4px] bg-orange-500/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 border-t border-white/5 m-35">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20 rounded-[3px] text-xs">
              How It Works
            </Badge>
            <h2 className="text-3xl font-bold text-white mb-3">
              Four steps to{" "}
              <span className="text-orange-400">legendary status</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map(({ step, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="bg-[#111] border-white/5 p-6 h-full hover:border-orange-500/20 duration-200 transition-all rounded-[6px]">
                  <div className="text-4xl font-black text-orange-500/15 mb-4 leading-none">{step}</div>
                  <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF
      <section id="testimonials" className="py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <Badge className="mb-3 bg-orange-500/10 text-orange-400 border-orange-500/20 rounded-[3px] text-xs">
              <Star className="w-3 h-3 mr-1 fill-orange-400" />
              Community
            </Badge>
            <h2 className="text-3xl font-bold text-white mb-3">
              Loved by{" "}
              <span className="text-orange-400">real contributors</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map(({ name, role, avatar, text, xp }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card className="bg-[#111] border-white/5 p-6 h-full hover:border-orange-500/15 duration-200 transition-all rounded-[6px]">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-[4px] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm">{name}</div>
                      <div className="text-xs text-slate-500">{role}</div>
                    </div>
                    <div className="ml-auto">
                      <Badge className="bg-orange-400/10 text-orange-400 border-orange-400/20 text-[10px] rounded-[3px] px-1.5 py-0.5">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                        {xp}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">&quot;{text}&quot;</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

      {/* CTA BANNER */}
      <section className="py-16 border-t border-white/5 m-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-[6px] bg-[#111] border border-orange-500/15 p-12"
          >
            <h2 className="text-3xl font-bold text-white mb-3">
              Ready to start your{" "}
              <span className="text-orange-400">quest?</span>
            </h2>
            <p className="text-slate-300 text-sm mb-8 max-w-md mx-auto">
              Join 12,400+ developers who are turning commits into achievements. Connect your GitHub and start in under a minute.
            </p>
            <Button
              size="lg"
              className="px-10 text-sm font-semibold gap-2"
              onClick={handleGithubLogin}
            >
              <Github className="w-4 h-4" />
              Connect GitHub & Start
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 pt-16 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-[3px] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-bold text-white">
                  Open<span className="text-orange-400">Quest</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gamify your open source journey. Discover, contribute, and level up.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">Platform</h4>
              <ul className="space-y-2">
                <li><a href="#how-it-works" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">How It Works</a></li>
                <li><a href="#testimonials" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">Resources</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">GitHub</a></li>
                <li><a href="#" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-600">© 2025 OpenQuest. Built for developers, by developers.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">Privacy</a>
              <a href="#" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
