"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    Home,
    GitBranch,
    Search,
    Sword,
    Trophy,
    User,
    Zap,
    PanelLeftClose,
    PanelLeftOpen,
    Menu,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/projects", label: "Projects", icon: GitBranch },
    { href: "/analyze", label: "Analyze", icon: Search },
    { href: "/quests", label: "Quests", icon: Sword },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Close mobile sidebar on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile sidebar open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isMobileOpen]);

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden fixed top-3 left-3 z-[60] w-9 h-9 rounded-[4px] bg-[#111] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                aria-label="Open menu"
            >
                <Menu className="w-4 h-4" />
            </button>

            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                // Desktop: always visible
                "hidden lg:flex flex-col bg-[#0A0A0A]/20 backdrop-blur-2xl border-r border-white/5 h-screen sticky top-0 overflow-y-auto hide-scrollbar z-50 transition-all duration-300",
                isCollapsed ? "w-[64px]" : "w-[200px]",
                // Mobile: overlay drawer
                isMobileOpen && "!flex fixed inset-y-0 left-0 z-[80] w-[240px] bg-[#0A0A0A] shadow-2xl shadow-black/50"
            )}>
                {/* Logo + close on mobile */}
                <div className={cn(
                    "h-14 flex items-center border-b border-white/5 transition-all overflow-hidden shrink-0",
                    isCollapsed && !isMobileOpen ? "justify-center px-0" : "px-5"
                )}>
                    <Link href="/" className="flex items-center gap-2 group min-w-max">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow shrink-0">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        {(!isCollapsed || isMobileOpen) && (
                            <span className="text-lg font-bold text-white tracking-tight animate-in fade-in duration-300">
                                Open<span className="text-orange-500">Quest</span>
                            </span>
                        )}
                    </Link>
                    {isMobileOpen && (
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            className="ml-auto w-8 h-8 rounded-[4px] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Collapse Toggle (desktop only) */}
                <div className="hidden lg:flex justify-end p-2 pb-0 shrink-0">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={cn(
                            "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors",
                            isCollapsed && "mx-auto"
                        )}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 py-4 px-2.5 space-y-1 overflow-x-hidden">
                    {navLinks.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-[3px]",
                                    (isCollapsed && !isMobileOpen) ? "justify-center" : "gap-3",
                                    isActive
                                        ? "bg-white/5 text-orange-400 border-orange-500"
                                        : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                                title={(isCollapsed && !isMobileOpen) ? label : undefined}
                            >
                                <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-orange-500" : "text-slate-500")} />
                                {(!isCollapsed || isMobileOpen) && <span className="whitespace-nowrap animate-in fade-in duration-300">{label}</span>}
                            </Link>
                        );
                    })}
                </div>

                {/* Bottom Section */}
                <div className="p-4 border-t border-white/5 flex justify-center items-center h-16 shrink-0">
                    {(!isCollapsed || isMobileOpen) ? (
                        <div className="text-xs text-slate-600 text-center font-medium animate-in fade-in duration-300 whitespace-nowrap">
                            © 2026 OpenQuest
                        </div>
                    ) : (
                        <Zap className="w-4 h-4 text-slate-600 animate-in fade-in duration-300 shrink-0" />
                    )}
                </div>
            </aside>
        </>
    );
}
