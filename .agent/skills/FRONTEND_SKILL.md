---
name: frontend
description: >
  Use this skill whenever the user wants to scaffold, build, or configure a frontend application.
  Triggers include: 'create a React/Next.js/Vue app', 'build a UI', 'set up a landing page',
  'design a dashboard', 'build a chat interface', 'add a component', 'set up routing',
  'connect frontend to backend API', 'add state management', 'style with Tailwind/CSS',
  or any request to create something the user will see in a browser. Also use for
  setting up environment variables, API client layers, auth flows on the frontend,
  and frontend deployment (Vercel, Netlify). Do NOT use for backend-only server tasks,
  database work, or DevOps pipelines not related to static site deployment.
license: MIT
---

# 🎨 Frontend Setup Skill

> Build polished, production-ready frontend apps that connect seamlessly to your backend and AI layer.

---

## 🗺️ Quick Reference

| Goal                      | Stack                          | Bootstrap Command                         |
|---------------------------|--------------------------------|-------------------------------------------|
| Full-stack web app        | Next.js 14 (App Router)        | `npx create-next-app@latest`              |
| SPA / dashboard           | React + Vite                   | `npm create vite@latest -- --template react-ts` |
| Static site               | Astro                          | `npm create astro@latest`                 |
| Styling                   | Tailwind CSS                   | `npm install -D tailwindcss postcss autoprefixer` |
| Components                | shadcn/ui                      | `npx shadcn@latest init`                  |
| State management          | Zustand (lightweight)          | `npm install zustand`                     |
| Data fetching             | TanStack Query                 | `npm install @tanstack/react-query`       |
| Forms                     | React Hook Form + Zod          | `npm install react-hook-form zod`         |
| HTTP client               | Axios or native fetch          | `npm install axios`                       |

---

## 🏗️ Project Structure (Next.js 14 App Router)

```
frontend/
├── app/
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   └── api/                   # API route handlers (optional)
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   └── features/
│       └── chat/
│           ├── ChatWindow.tsx
│           └── MessageBubble.tsx
├── lib/
│   ├── api.ts                 # Axios/fetch client
│   ├── auth.ts                # Auth helpers
│   └── utils.ts               # cn() and shared utilities
├── store/
│   └── useAppStore.ts         # Zustand global state
├── hooks/
│   └── useChat.ts             # Custom hooks
├── types/
│   └── index.ts               # Shared TypeScript types
├── .env.local
├── tailwind.config.ts
└── next.config.ts
```

---

## 🚀 Bootstrap: Next.js 14

### 1. Create & Install

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir no
cd my-app
npx shadcn@latest init
npm install axios zustand @tanstack/react-query react-hook-form zod
```

### 2. `lib/api.ts` — Centralized API Client

```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

### 3. `store/useAppStore.ts` — Zustand Global State

```typescript
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
  setUser: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },
}));
```

### 4. `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=MyApp
```

---

## 💬 AI Chat Interface Component

```tsx
// components/features/chat/ChatWindow.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/ask', { query: input });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-2xl px-4 py-2 max-w-[75%] text-sm whitespace-pre-wrap
              ${m.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2 text-sm text-gray-500">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium 
                     hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

---

## 🔐 Auth Flow (Login Page)

```tsx
// app/(auth)/login/page.tsx
'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { setUser } = useAppStore();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const { data: res } = await api.post('/api/auth/login', data);
    setUser(res.user, res.access_token);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <input {...register('email')} placeholder="Email" className="w-full border rounded-lg px-3 py-2" />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        <input {...register('password')} type="password" placeholder="Password" className="w-full border rounded-lg px-3 py-2" />
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        <button type="submit" disabled={isSubmitting}
          className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
```

---

## 🌐 Streaming AI Responses (Server-Sent Events)

```typescript
// For streaming responses from the RAG backend
async function* streamResponse(query: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ask/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value);
  }
}
```

---

## ✅ Checklist Before Shipping

- [ ] `NEXT_PUBLIC_API_URL` set correctly for each environment
- [ ] Auth token refresh logic in place
- [ ] Loading & error states on every async action
- [ ] Mobile responsive (Tailwind `sm:` / `md:` breakpoints checked)
- [ ] `<head>` metadata: title, description, OG tags
- [ ] No API keys in frontend code or `.env.local` (only `NEXT_PUBLIC_*` vars)
- [ ] `next build` passes with zero errors
- [ ] Lighthouse score > 90

---

## 🚨 Common Mistakes to Avoid

| ❌ Mistake                              | ✅ Fix                                               |
|-----------------------------------------|------------------------------------------------------|
| API URL hardcoded as localhost          | Always use `NEXT_PUBLIC_API_URL` env var             |
| Fetching in render with no cache        | Wrap with TanStack Query for caching + deduplication |
| Storing sensitive data in localStorage  | Use httpOnly cookies via server for tokens           |
| No error boundaries                     | Add `error.tsx` in each route segment                |
| Huge bundle size                        | Dynamic import heavy components with `next/dynamic`  |
