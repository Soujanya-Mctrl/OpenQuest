"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Home,
    GitBranch,
    Search,
    Sword,
    Trophy,
    User,
    Menu,
    X,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/projects", label: "Projects", icon: GitBranch },
    { href: "/analyze", label: "Analyze", icon: Search },
    { href: "/quests", label: "Quests", icon: Sword },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/profile", label: "Profile", icon: User },
];

export default function Navbar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white tracking-tight">
                            Open<span className="text-orange-500">Quest</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    pathname === href
                                        ? "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1">
                            <Zap className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-xs font-semibold text-yellow-400">1,240 XP</span>
                        </div>
                        <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-lg shadow-orange-500/20"
                            onClick={() => window.location.href = `${API_BASE}/api/auth/github`}
                        >
                            Connect GitHub
                        </Button>
                    </div>

                    {/* Mobile toggle */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-white/5 bg-[#0a0a0a] px-4 py-3 space-y-1">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                pathname === href
                                    ? "bg-orange-500/10 text-orange-500"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </Link>
                    ))}
                    <div className="pt-2 border-t border-white/5">
                        <Button
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white border-0"
                            onClick={() => window.location.href = `${API_BASE}/api/auth/github`}
                        >
                            Connect GitHub
                        </Button>
                    </div>
                </div>
            )}
        </nav>
    );
}
