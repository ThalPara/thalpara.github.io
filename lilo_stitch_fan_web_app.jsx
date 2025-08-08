import React, { useEffect, useMemo, useRef, useState } from "react";
import { Star, Gamepad2, Home, Sun, Moon } from "lucide-react";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "marvel-game", label: "Marvel Mini Game", icon: Gamepad2 },
];

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

function Header({ dark, setDark, activeTab, setActiveTab }) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-900/80 border-b border-black/5 dark:border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Marvel Fan Game</h1>
        <div className="ml-auto flex items-center gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition border ${
                activeTab === id
                  ? "bg-red-600 text-white border-red-700 shadow"
                  : "bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border-black/10 dark:border-white/10"
              }`}
              aria-pressed={activeTab === id}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
          <button
            onClick={() => setDark((d) => !d)}
            className="ml-2 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:shadow transition bg-white/70 dark:bg-slate-800/70 border-black/10 dark:border-white/10"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">Theme</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeTab({ progress }) {
  return (
    <div className="p-6 rounded-3xl border border-black/5 dark:border-white/10 bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-800 dark:to-slate-900">
      <h2 className="text-2xl font-semibold mb-2">Welcome to the Marvel Mini Game</h2>
      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Test your reflexes by catching your favorite Marvel hero when they appear!</p>
      <p className="mt-4">Best Streak: {progress.bestStreak}</p>
      <p>Total Stars: {progress.stars}</p>
    </div>
  );
}

function MarvelGame({ onNewBest, onEarnStar }) {
  const heroes = ["🦸‍♂️", "🦸‍♀️", "🛡️", "🕷️", "🪖", "⚡"];
  const gridSize = 9;
  const [active, setActive] = useState(() => Math.floor(Math.random() * gridSize));
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive(Math.floor(Math.random() * gridSize));
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 800);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      clearInterval(timerRef.current);
    }
  }, [timeLeft]);

  const clickCell = (i) => {
    if (timeLeft === 0) return;
    if (i === active) {
      setStreak((s) => {
        const ns = s + 1;
        if (ns % 3 === 0) onEarnStar(1);
        return ns;
      });
      setActive(Math.floor(Math.random() * gridSize));
    } else {
      setStreak(0);
    }
  };

  useEffect(() => {
    if (streak === 5 || streak === 10) onEarnStar(2);
  }, [streak]);

  useEffect(() => {
    onNewBest(streak);
  }, [streak]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p>Time left: {timeLeft}s</p>
        <p>Streak: {streak}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: gridSize }).map((_, i) => (
          <button
            key={i}
            onClick={() => clickCell(i)}
            className={`aspect-square rounded-2xl border transition relative overflow-hidden ${
              i === active
                ? "border-red-600 bg-gradient-to-br from-red-100 to-orange-100"
                : "border-black/10 dark:border-white/10 bg-white/70 dark:bg-slate-800/70"
            }`}
          >
            {i === active && <span className="absolute inset-0 flex items-center justify-center text-4xl">{heroes[Math.floor(Math.random() * heroes.length)]}</span>}
          </button>
        ))}
      </div>
      {timeLeft === 0 && (
        <div className="mt-4 p-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 text-center">
          <p className="font-semibold">Time! Your best streak: {streak}</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useLocalStorage("marvel-dark", false);
  const [activeTab, setActiveTab] = useLocalStorage("marvel-tab", "home");
  const [progress, setProgress] = useLocalStorage("marvel-progress", { bestStreak: 0, stars: 0 });

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  const onEarnStar = (n = 1) => setProgress((p) => ({ ...p, stars: p.stars + n }));
  const onNewBest = (streak) => setProgress((p) => ({ ...p, bestStreak: Math.max(p.bestStreak, streak) }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-orange-50 to-yellow-50 dark:from-slate-900 dark:to-black text-slate-900 dark:text-white">
      <Header dark={dark} setDark={setDark} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "home" && <HomeTab progress={progress} />}
        {activeTab === "marvel-game" && <MarvelGame onNewBest={onNewBest} onEarnStar={onEarnStar} />}
        <footer className="mt-10 text-xs text-slate-500 dark:text-slate-400 text-center">Fan-made Marvel mini game for educational purposes. Not affiliated with Marvel.</footer>
      </main>
    </div>
  );
}
