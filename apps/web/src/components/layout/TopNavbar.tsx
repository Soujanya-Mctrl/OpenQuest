"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Flame, Coins, Bell, ChevronDown, Users, Target, Github, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AuthUser {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
    email: string | null;
    skillProfile: {
        overallLevel: string;
        totalRepos: number;
        totalStars: number;
        contributionCount: number;
        accountAgeYears: number;
        languageStats: Record<string, number>;
    } | null;
}

export default function TopNavbar() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("login") === "success") {
            checkAuthStatus();
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/status`, {
                credentials: "include",
            });
            const data = await response.json();
            if (data.authenticated) {
                setUser(data.user);
            }
        } catch (error) {
            console.error("Auth check failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = () => {
        window.location.href = `${API_BASE}/api/auth/github`;
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
            setUser(null);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <nav className="h-14 border-b border-white/5 bg-[#0a0a0a]/20 backdrop-blur-2xl sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6">
            {/* Left side: Platform Metrics — hide on small screens, show partially on md */}
            <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
                {/* Spacer for hamburger button on mobile */}
                <div className="w-9 lg:hidden" />

                {/* Contributors stat — hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 lg:gap-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-400" />
                    </div>
                    <div>
                        <div className="text-[9px] lg:text-[10px] uppercase font-bold text-slate-500 tracking-wider">Contributors</div>
                        <div className="text-xs lg:text-sm font-black text-white">992,831</div>
                    </div>
                </div>

                {/* Quests stat — hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 lg:gap-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                        <Target className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-yellow-400" />
                    </div>
                    <div>
                        <div className="text-[9px] lg:text-[10px] uppercase font-bold text-slate-500 tracking-wider">Quests Completed</div>
                        <div className="text-xs lg:text-sm font-black text-white">22,863,066</div>
                    </div>
                </div>
            </div>

            {/* Right side: User State */}
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
                {user ? (
                    <>
                        {/* Notifications */}
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
                            <Bell className="w-4 h-4" />
                        </button>

                        {/* Gamification Stats — hide pill on mobile, show condensed on sm */}
                        <div className="hidden sm:flex items-center gap-2 lg:gap-3 bg-white/5 rounded-full px-2.5 lg:px-3 py-1.5 border border-white/10">
                            <div className="flex items-center gap-1 lg:gap-1.5 border-r border-white/10 pr-2 lg:pr-3">
                                <Flame className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-500" />
                                <span className="text-[10px] lg:text-xs font-bold text-white">
                                    {user.skillProfile?.contributionCount ?? 0}
                                </span>
                            </div>
                            <div className="hidden lg:flex items-center gap-1.5 border-r border-white/10 pr-3">
                                <div className="w-4 h-4 rounded-full bg-orange-600 flex items-center justify-center text-[8px] font-black text-white border border-orange-400">XP</div>
                                <span className="text-xs font-bold text-white">
                                    {user.skillProfile?.totalStars ?? 0} XP
                                </span>
                            </div>
                            <div className="flex items-center gap-1 lg:gap-1.5 pl-0.5 lg:pl-1 text-slate-400">
                                <Coins className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-green-500" />
                                <span className="text-[10px] lg:text-xs font-bold text-white">
                                    {user.skillProfile?.totalRepos ?? 0}
                                </span>
                            </div>
                        </div>

                        {/* Profile Section */}
                        <div className="flex items-center gap-2 lg:gap-3 cursor-pointer hover:opacity-80 transition pl-2 lg:pl-4 border-l border-white/5">
                            <Avatar className="w-7 h-7 lg:w-8 lg:h-8 border border-white/10">
                                {user.avatarUrl ? (
                                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                                ) : null}
                                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-xs">
                                    {user.username?.slice(0, 2).toUpperCase() || "??"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden md:flex flex-col">
                                <span className="text-xs lg:text-sm font-semibold text-white leading-tight">{user.username}</span>
                                <span className="text-[10px] lg:text-xs font-bold text-orange-400 capitalize">
                                    {user.skillProfile?.overallLevel ?? "beginner"}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition ml-1"
                                title="Logout"
                            >
                                <LogOut className="w-3 h-3" />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
                            <Bell className="w-4 h-4" />
                        </button>
                        <Button
                            onClick={handleLogin}
                            variant="default"
                            size="sm"
                            className="gap-2"
                            disabled={loading}
                        >
                            <Github className="w-4 h-4" />
                            <span className="hidden sm:inline">{loading ? "Checking..." : "Connect GitHub"}</span>
                            <span className="sm:hidden">{loading ? "..." : "Login"}</span>
                        </Button>
                    </>
                )}
            </div>
        </nav>
    );
}
