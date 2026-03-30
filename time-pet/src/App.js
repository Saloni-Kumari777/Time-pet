/**
 * TIME PET — A Virtual Pet Productivity App
 * Built with React + hooks, Context API, CSS animations
 * No external dependencies beyond React & lucide-react
 */

import { useState, useEffect, useRef, useCallback, createContext, useContext, useReducer } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FOCUS_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;
const SESSIONS_TO_EVOLVE = 4; // sessions per level

const PET_STATES = {
  ECSTATIC: "ecstatic",
  HAPPY: "happy",
  NEUTRAL: "neutral",
  SLEEPY: "sleepy",
  SAD: "sad",
};

const PET_EVOLUTION = [
  { level: 1, name: "Sprout", emoji: "🌱" },
  { level: 2, name: "Sapling", emoji: "🌿" },
  { level: 3, name: "Budding", emoji: "🌸" },
  { level: 4, name: "Blooming", emoji: "🌺" },
  { level: 5, name: "Ancient", emoji: "🌳" },
];

const AI_MESSAGES = {
  focus_start: [
    "Let's do this! I believe in you! 🌟",
    "Focus mode activated! Let's grow together! 💪",
    "Time to shine! I'm cheering for you! ✨",
    "Deep work begins now. You've got this! 🎯",
  ],
  focus_mid: [
    "Halfway there! Keep going, you're amazing! 🔥",
    "You're in the zone! Don't stop now! ⚡",
    "Look at you crushing it! So proud! 🌟",
    "Flow state activated. Beautiful! 💫",
  ],
  focus_complete: [
    "Session complete! You made me so happy! 🎉",
    "AMAZING! That was a perfect focus session! 🌺",
    "We did it! I feel myself evolving! ✨",
    "Incredible work! Take a well-deserved break! 🏆",
  ],
  break_start: [
    "Rest time! Stretch a little, you've earned it! 🌿",
    "Break time! Hydrate, breathe, relax! 💧",
    "Wonderful work! Now let's recharge! ☀️",
    "Time to rest. I'll be here when you're ready! 🌙",
  ],
  idle_short: [
    "Hey... are you still there? 👀",
    "I'm feeling a little lonely... shall we focus? 💤",
    "The timer is waiting for you! 🕐",
  ],
  idle_long: [
    "I'm getting really sleepy without focus sessions... 😴",
    "Please come back! I miss our work sessions! 😢",
    "My petals are wilting without your focus... 🥀",
  ],
  encouragement: [
    "You can do anything you set your mind to! 💪",
    "Every session makes us both stronger! 🌱",
    "Small steps every day lead to big things! ✨",
    "I grow when you grow! Let's do this! 🌸",
  ],
  morning: [
    "Good morning! Ready for a productive day? ☀️",
    "Rise and shine! Let's make today amazing! 🌅",
  ],
  evening: [
    "Great work today! Rest well tonight! 🌙",
    "Evening sessions count too! You're dedicated! 🌟",
  ],
  night: [
    "Working late? Don't forget to sleep! 🌙",
    "Night owl mode! Just don't overdo it! 🦉",
  ],
};

// ─── CONTEXT & STATE ──────────────────────────────────────────────────────────
const AppContext = createContext(null);

const initialState = {
  // Timer
  timerMode: "focus", // "focus" | "break"
  timeLeft: FOCUS_DURATION,
  isRunning: false,
  focusDuration: FOCUS_DURATION,
  breakDuration: BREAK_DURATION,
  // Pet
  petState: PET_STATES.HAPPY,
  petLevel: 1,
  totalSessions: 0,
  petMood: 70, // 0-100
  // Stats
  todaySessions: 0,
  todayFocusTime: 0, // seconds
  streak: 0, // days
  weeklyData: [0, 0, 0, 0, 0, 0, 0], // Mon-Sun sessions
  lastActiveDate: new Date().toDateString(),
  // UI
  currentScreen: "dashboard",
  darkMode: false,
  showOnboarding: true,
  // Chat
  messages: [],
  showChat: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "TICK":
      return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) };
    case "SET_RUNNING":
      return { ...state, isRunning: action.payload };
    case "RESET_TIMER":
      return {
        ...state,
        isRunning: false,
        timeLeft: state.timerMode === "focus" ? state.focusDuration : state.breakDuration,
      };
    case "SWITCH_MODE": {
      const mode = action.payload;
      return {
        ...state,
        timerMode: mode,
        timeLeft: mode === "focus" ? state.focusDuration : state.breakDuration,
        isRunning: false,
      };
    }
    case "SESSION_COMPLETE": {
      const newSessions = state.totalSessions + 1;
      const newLevel = Math.min(5, Math.floor(newSessions / SESSIONS_TO_EVOLVE) + 1);
      const newToday = state.todaySessions + 1;
      const newWeekly = [...state.weeklyData];
      const dayIdx = new Date().getDay();
      const adjustedIdx = dayIdx === 0 ? 6 : dayIdx - 1;
      newWeekly[adjustedIdx] = (newWeekly[adjustedIdx] || 0) + 1;
      return {
        ...state,
        totalSessions: newSessions,
        petLevel: newLevel,
        todaySessions: newToday,
        todayFocusTime: state.todayFocusTime + state.focusDuration,
        weeklyData: newWeekly,
        petMood: Math.min(100, state.petMood + 20),
        petState: PET_STATES.ECSTATIC,
      };
    }
    case "SET_PET_STATE":
      return { ...state, petState: action.payload };
    case "SET_PET_MOOD":
      return { ...state, petMood: Math.max(0, Math.min(100, action.payload)) };
    case "SET_SCREEN":
      return { ...state, currentScreen: action.payload };
    case "TOGGLE_DARK":
      return { ...state, darkMode: !state.darkMode };
    case "DISMISS_ONBOARDING":
      return { ...state, showOnboarding: false };
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages.slice(-20),
          { id: Date.now(), text: action.payload, from: "pet", time: new Date() },
        ],
        showChat: true,
      };
    case "TOGGLE_CHAT":
      return { ...state, showChat: !state.showChat };
    case "UPDATE_TIMER_SETTINGS":
      return {
        ...state,
        focusDuration: action.payload.focus,
        breakDuration: action.payload.break,
        timeLeft: state.timerMode === "focus" ? action.payload.focus : action.payload.break,
      };
    default:
      return state;
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const formatMinutes = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

// ─── PET EMOJI RENDERER ──────────────────────────────────────────────────────
function PetDisplay({ state, level, mood, size = 120, animate = true }) {
  const evo = PET_EVOLUTION[level - 1];

  const stateConfig = {
    [PET_STATES.ECSTATIC]: { bg: "#BFE8C8", glow: "#8FD3A6", scale: 1.1 },
    [PET_STATES.HAPPY]: { bg: "#DFF5E1", glow: "#BFE8C8", scale: 1.0 },
    [PET_STATES.NEUTRAL]: { bg: "#F0F0F0", glow: "#DDD", scale: 1.0 },
    [PET_STATES.SLEEPY]: { bg: "#E8E0F5", glow: "#C9B8E8", scale: 0.95 },
    [PET_STATES.SAD]: { bg: "#F5E0E0", glow: "#E8B8B8", scale: 0.9 },
  };

  const cfg = stateConfig[state] || stateConfig[PET_STATES.NEUTRAL];

  const eyeMap = {
    [PET_STATES.ECSTATIC]: "^ᴗ^",
    [PET_STATES.HAPPY]: "◕ ◕",
    [PET_STATES.NEUTRAL]: "• •",
    [PET_STATES.SLEEPY]: "– –",
    [PET_STATES.SAD]: "T T",
  };

  const mouthMap = {
    [PET_STATES.ECSTATIC]: "ᴗ",
    [PET_STATES.HAPPY]: "‿",
    [PET_STATES.NEUTRAL]: "—",
    [PET_STATES.SLEEPY]: "ᵕ",
    [PET_STATES.SAD]: "︵",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: cfg.bg,
          boxShadow: `0 0 ${size * 0.3}px ${cfg.glow}, 0 8px 32px rgba(0,0,0,0.08)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.42,
          transform: `scale(${cfg.scale})`,
          transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          animation: animate && state === PET_STATES.ECSTATIC ? "bounce 0.6s ease infinite alternate" : "float 3s ease-in-out infinite",
          cursor: "default",
          userSelect: "none",
          position: "relative",
        }}
      >
        <span style={{ lineHeight: 1 }}>{evo.emoji}</span>

        {/* Mood indicator dots */}
        {state === PET_STATES.ECSTATIC && (
          <div style={{ position: "absolute", top: -8, right: -8, fontSize: 18 }}>✨</div>
        )}
        {state === PET_STATES.SLEEPY && (
          <div style={{ position: "absolute", top: -4, right: -4, fontSize: 14 }}>💤</div>
        )}
        {state === PET_STATES.SAD && (
          <div style={{ position: "absolute", top: -4, left: -4, fontSize: 14 }}>💧</div>
        )}
      </div>

      {/* Pet name & level */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          {evo.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          Level {level} · {state.charAt(0).toUpperCase() + state.slice(1)}
        </div>
      </div>

      {/* Mood bar */}
      <div style={{ width: size, background: "var(--surface)", borderRadius: 99, height: 6, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${mood}%`,
            background: mood > 60 ? "linear-gradient(90deg, #8FD3A6, #BFE8C8)" : mood > 30 ? "linear-gradient(90deg, #F5D87A, #F5C242)" : "linear-gradient(90deg, #F5A0A0, #E87A7A)",
            borderRadius: 99,
            transition: "width 1s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── TIMER RING ───────────────────────────────────────────────────────────────
function TimerRing({ timeLeft, total, isRunning, mode }) {
  const r = 90;
  const circ = 2 * Math.PI * r;
  const progress = timeLeft / total;
  const offset = circ * (1 - progress);

  const color = mode === "focus" ? "#8FD3A6" : "#A8C8F0";

  return (
    <svg width={220} height={220} style={{ transform: "rotate(-90deg)" }}>
      {/* Track */}
      <circle cx={110} cy={110} r={r} fill="none" stroke="var(--surface)" strokeWidth={10} />
      {/* Progress */}
      <circle
        cx={110}
        cy={110}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────

function OnboardingScreen({ dispatch }) {
  const [step, setStep] = useState(0);
  const steps = [
    {
      emoji: "🌱",
      title: "Meet your Time Pet",
      body: "Your virtual companion that grows and evolves as you build better focus habits.",
    },
    {
      emoji: "⏱️",
      title: "Focus = Growth",
      body: "Complete Pomodoro sessions to make your pet happy and help it evolve through 5 unique stages.",
    },
    {
      emoji: "📊",
      title: "Build Streaks",
      body: "Consistent daily sessions build streaks. Watch your pet transform from a tiny Sprout to an Ancient Tree!",
    },
  ];

  const s = steps[step];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--bg)",
          borderRadius: 24,
          padding: 40,
          maxWidth: 380,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 32px 64px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>{s.emoji}</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, marginBottom: 12, color: "var(--text-primary)" }}>
          {s.title}
        </h2>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 32 }}>{s.body}</p>

        {/* Step dots */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 99,
                background: i === step ? "#8FD3A6" : "var(--surface)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {step < steps.length - 1 ? (
          <button className="btn-primary" onClick={() => setStep((s) => s + 1)}>
            Next →
          </button>
        ) : (
          <button className="btn-primary" onClick={() => dispatch({ type: "DISMISS_ONBOARDING" })}>
            Let's grow! 🌱
          </button>
        )}
      </div>
    </div>
  );
}

function DashboardScreen({ state, dispatch }) {
  const evo = PET_EVOLUTION[state.petLevel - 1];
  const nextEvo = PET_EVOLUTION[Math.min(4, state.petLevel)];
  const sessionsInLevel = state.totalSessions % SESSIONS_TO_EVOLVE;
  const timeOfDay = getTimeOfDay();

  const greeting = {
    morning: "Good morning! ☀️",
    afternoon: "Good afternoon! ⛅",
    evening: "Good evening! 🌅",
    night: "Working late! 🌙",
  }[timeOfDay];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxSessions = Math.max(...state.weeklyData, 1);

  return (
    <div className="screen-content">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{greeting}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-primary)", margin: 0 }}>
          Your Dashboard
        </h1>
      </div>

      {/* Pet Card */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 20 }}>
        <PetDisplay state={state.petState} level={state.petLevel} mood={state.petMood} size={90} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Your companion</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-primary)", marginBottom: 8 }}>
            {evo.name} {evo.emoji}
          </div>
          {state.petLevel < 5 && (
            <>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                {SESSIONS_TO_EVOLVE - sessionsInLevel} sessions to {nextEvo.name}
              </div>
              <div style={{ background: "var(--surface)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(sessionsInLevel / SESSIONS_TO_EVOLVE) * 100}%`,
                    background: "linear-gradient(90deg, #8FD3A6, #BFE8C8)",
                    borderRadius: 99,
                    transition: "width 1s ease",
                  }}
                />
              </div>
            </>
          )}
          {state.petLevel === 5 && (
            <div style={{ fontSize: 13, color: "#8FD3A6", fontWeight: 600 }}>✨ Max Evolution Reached!</div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Today", value: formatMinutes(state.todayFocusTime), sub: `${state.todaySessions} sessions`, icon: "⏱️" },
          { label: "Streak", value: `${state.streak}d`, sub: "consecutive", icon: "🔥" },
          { label: "Total", value: state.totalSessions, sub: "sessions", icon: "🎯" },
        ].map((s) => (
          <div key={s.label} className="card stat-card">
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
          Weekly Focus Sessions
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
          {state.weeklyData.map((val, i) => {
            const today = new Date().getDay();
            const adjustedToday = today === 0 ? 6 : today - 1;
            const isToday = i === adjustedToday;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: "100%",
                    height: val > 0 ? `${(val / maxSessions) * 64}px` : 4,
                    background: isToday
                      ? "linear-gradient(180deg, #8FD3A6, #BFE8C8)"
                      : val > 0
                      ? "var(--surface-2)"
                      : "var(--surface)",
                    borderRadius: "4px 4px 2px 2px",
                    transition: "height 0.6s ease",
                    minHeight: 4,
                  }}
                />
                <div style={{ fontSize: 10, color: isToday ? "#8FD3A6" : "var(--text-muted)", fontWeight: isToday ? 700 : 400 }}>
                  {days[i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Start */}
      <button
        className="btn-primary"
        style={{ width: "100%" }}
        onClick={() => dispatch({ type: "SET_SCREEN", payload: "timer" })}
      >
        ▶ Start Focus Session
      </button>
    </div>
  );
}

function TimerScreen({ state, dispatch }) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempFocus, setTempFocus] = useState(state.focusDuration / 60);
  const [tempBreak, setTempBreak] = useState(state.breakDuration / 60);

  const progress = state.timeLeft / (state.timerMode === "focus" ? state.focusDuration : state.breakDuration);

  const handleStartPause = () => {
    if (!state.isRunning && state.timeLeft === state.focusDuration) {
      dispatch({ type: "ADD_MESSAGE", payload: randomFrom(AI_MESSAGES.focus_start) });
    }
    dispatch({ type: "SET_RUNNING", payload: !state.isRunning });
  };

  const applySettings = () => {
    dispatch({
      type: "UPDATE_TIMER_SETTINGS",
      payload: { focus: tempFocus * 60, break: tempBreak * 60 },
    });
    setShowSettings(false);
  };

  return (
    <div className="screen-content" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginBottom: 28, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-primary)", margin: 0 }}>
          Focus Timer
        </h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{ background: "var(--surface)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 18 }}
        >
          ⚙️
        </button>
      </div>

      {/* Mode Switch */}
      <div
        style={{
          display: "flex",
          background: "var(--surface)",
          borderRadius: 12,
          padding: 4,
          marginBottom: 32,
          gap: 4,
        }}
      >
        {["focus", "break"].map((m) => (
          <button
            key={m}
            onClick={() => dispatch({ type: "SWITCH_MODE", payload: m })}
            style={{
              padding: "8px 20px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              background: state.timerMode === m ? (m === "focus" ? "#8FD3A6" : "#A8C8F0") : "transparent",
              color: state.timerMode === m ? "#fff" : "var(--text-muted)",
              transition: "all 0.2s",
            }}
          >
            {m === "focus" ? "🎯 Focus" : "☕ Break"}
          </button>
        ))}
      </div>

      {/* Timer Ring */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <TimerRing
          timeLeft={state.timeLeft}
          total={state.timerMode === "focus" ? state.focusDuration : state.breakDuration}
          isRunning={state.isRunning}
          mode={state.timerMode}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-2px",
            }}
          >
            {formatTime(state.timeLeft)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {state.isRunning ? (state.timerMode === "focus" ? "Focusing..." : "Resting...") : "Ready"}
          </div>
        </div>
      </div>

      {/* Pet mini preview */}
      <div style={{ marginBottom: 28 }}>
        <PetDisplay state={state.petState} level={state.petLevel} mood={state.petMood} size={72} />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => dispatch({ type: "RESET_TIMER" })}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "none",
            background: "var(--surface)",
            cursor: "pointer",
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ↺
        </button>
        <button
          onClick={handleStartPause}
          className="btn-primary"
          style={{ width: 120, height: 52, fontSize: 18, borderRadius: 999 }}
        >
          {state.isRunning ? "⏸" : "▶"}
        </button>
        <button
          onClick={() => dispatch({ type: "ADD_MESSAGE", payload: randomFrom(AI_MESSAGES.encouragement) })}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "none",
            background: "var(--surface)",
            cursor: "pointer",
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Ask pet for encouragement"
        >
          💬
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card" style={{ width: "100%", marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)" }}>Timer Settings</div>
          {[
            { label: "Focus duration (min)", val: tempFocus, set: setTempFocus, min: 5, max: 60 },
            { label: "Break duration (min)", val: tempBreak, set: setTempBreak, min: 1, max: 30 },
          ].map((s) => (
            <div key={s.label} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                {s.label}: <strong>{s.val}m</strong>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                value={s.val}
                onChange={(e) => s.set(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#8FD3A6" }}
              />
            </div>
          ))}
          <button className="btn-primary" style={{ width: "100%" }} onClick={applySettings}>
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function StatsScreen({ state }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const totalFocusMinutes = Math.floor(state.todayFocusTime / 60);
  const avgPerDay = state.weeklyData.filter((d) => d > 0).length > 0
    ? (state.weeklyData.reduce((a, b) => a + b, 0) / state.weeklyData.filter((d) => d > 0).length).toFixed(1)
    : 0;

  const achievements = [
    { emoji: "🌱", label: "First Session", done: state.totalSessions >= 1 },
    { emoji: "🔥", label: "3-Day Streak", done: state.streak >= 3 },
    { emoji: "🌸", label: "Level 3 Pet", done: state.petLevel >= 3 },
    { emoji: "🏆", label: "10 Sessions", done: state.totalSessions >= 10 },
    { emoji: "⚡", label: "5 in a Day", done: state.todaySessions >= 5 },
    { emoji: "🌳", label: "Max Evolution", done: state.petLevel >= 5 },
  ];

  return (
    <div className="screen-content">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--text-primary)", margin: 0 }}>
          Your Stats
        </h1>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Today's Focus", value: `${totalFocusMinutes}m`, icon: "⏱️" },
          { label: "Day Streak", value: `${state.streak} days`, icon: "🔥" },
          { label: "Total Sessions", value: state.totalSessions, icon: "🎯" },
          { label: "Avg / Day", value: `${avgPerDay}`, icon: "📊" },
        ].map((s) => (
          <div key={s.label} className="card stat-card" style={{ textAlign: "left" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly Bar Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
          This Week
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {state.weeklyData.map((val, i) => {
            const today = new Date().getDay();
            const adjustedToday = today === 0 ? 6 : today - 1;
            const isToday = i === adjustedToday;
            const maxVal = Math.max(...state.weeklyData, 1);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{val || ""}</div>
                <div
                  style={{
                    width: "100%",
                    height: val > 0 ? `${(val / maxVal) * 72}px` : 4,
                    background: isToday
                      ? "linear-gradient(180deg, #8FD3A6, #BFE8C8)"
                      : val > 0
                      ? "var(--surface-2)"
                      : "var(--surface)",
                    borderRadius: "6px 6px 3px 3px",
                    transition: "height 0.6s ease",
                    minHeight: 4,
                  }}
                />
                <div style={{ fontSize: 11, color: isToday ? "#8FD3A6" : "var(--text-muted)", fontWeight: isToday ? 700 : 400 }}>
                  {days[i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
          Achievements
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {achievements.map((a) => (
            <div
              key={a.label}
              style={{
                background: a.done ? "var(--surface)" : "transparent",
                border: `2px solid ${a.done ? "#8FD3A6" : "var(--surface)"}`,
                borderRadius: 12,
                padding: 12,
                textAlign: "center",
                opacity: a.done ? 1 : 0.4,
                transition: "all 0.3s",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{a.emoji}</div>
              <div style={{ fontSize: 10, color: "var(--text-primary)", lineHeight: 1.3 }}>{a.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CHAT BUBBLE ─────────────────────────────────────────────────────────────
function ChatBubble({ messages, dispatch, petState }) {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 100,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: 320,
        width: "90%",
        zIndex: 50,
        animation: "slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div
        style={{
          background: "var(--bg)",
          border: "2px solid var(--surface-2)",
          borderRadius: 16,
          padding: "12px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 24, flexShrink: 0 }}>{PET_EVOLUTION[0].emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{lastMsg.text}</div>
        </div>
        <button
          onClick={() => dispatch({ type: "TOGGLE_CHAT" })}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 16,
            padding: 0,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function BottomNav({ current, dispatch, darkMode }) {
  const tabs = [
    { id: "dashboard", label: "Home", icon: "🏠" },
    { id: "timer", label: "Timer", icon: "⏱️" },
    { id: "stats", label: "Stats", icon: "📊" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        background: "var(--bg)",
        borderTop: "1px solid var(--surface)",
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0 16px",
        zIndex: 40,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => dispatch({ type: "SET_SCREEN", payload: t.id })}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "4px 20px",
            borderRadius: 12,
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 22, opacity: current === t.id ? 1 : 0.5, transition: "all 0.2s" }}>
            {t.icon}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: current === t.id ? 700 : 400,
              color: current === t.id ? "#8FD3A6" : "var(--text-muted)",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </div>
        </button>
      ))}
      {/* Dark mode toggle */}
      <button
        onClick={() => dispatch({ type: "TOGGLE_DARK" })}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "4px 20px",
          borderRadius: 12,
        }}
      >
        <div style={{ fontSize: 22, opacity: 0.5 }}>{darkMode ? "☀️" : "🌙"}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{darkMode ? "Light" : "Dark"}</div>
      </button>
    </nav>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const idleTimer = useRef(null);
  const midSessionTriggered = useRef(false);

  // Timer tick
  useEffect(() => {
    if (!state.isRunning) return;
    const interval = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.isRunning]);

  // Handle timer completion
  useEffect(() => {
    if (state.timeLeft === 0 && state.isRunning) {
      dispatch({ type: "SET_RUNNING", payload: false });
      if (state.timerMode === "focus") {
        dispatch({ type: "SESSION_COMPLETE" });
        dispatch({ type: "ADD_MESSAGE", payload: randomFrom(AI_MESSAGES.focus_complete) });
        setTimeout(() => dispatch({ type: "SWITCH_MODE", payload: "break" }), 2000);
      } else {
        dispatch({ type: "ADD_MESSAGE", payload: randomFrom(AI_MESSAGES.focus_start) });
        dispatch({ type: "SWITCH_MODE", payload: "focus" });
      }
    }
  }, [state.timeLeft, state.isRunning, state.timerMode]);

  // Mid-session encouragement
  useEffect(() => {
    const half = Math.floor((state.timerMode === "focus" ? state.focusDuration : state.breakDuration) / 2);
    if (state.isRunning && state.timeLeft === half && !midSessionTriggered.current) {
      midSessionTriggered.current = true;
      dispatch({ type: "ADD_MESSAGE", payload: randomFrom(AI_MESSAGES.focus_mid) });
    }
    if (!state.isRunning || state.timeLeft === state.focusDuration) {
      midSessionTriggered.current = false;
    }
  }, [state.timeLeft, state.isRunning]);

  // Pet mood decay when idle
  useEffect(() => {
    if (state.isRunning) {
      clearInterval(idleTimer.current);
      dispatch({ type: "SET_PET_STATE", payload: PET_STATES.HAPPY });
    } else {
      idleTimer.current = setInterval(() => {
        dispatch({ type: "SET_PET_MOOD", payload: state.petMood - 2 });
      }, 30000); // decay every 30s when idle
    }
    return () => clearInterval(idleTimer.current);
  }, [state.isRunning]);

  // Pet state based on mood
  useEffect(() => {
    if (state.isRunning && state.timerMode === "focus") {
      dispatch({ type: "SET_PET_STATE", payload: PET_STATES.HAPPY });
      return;
    }
    const mood = state.petMood;
    let newState;
    if (mood >= 80) newState = PET_STATES.ECSTATIC;
    else if (mood >= 55) newState = PET_STATES.HAPPY;
    else if (mood >= 35) newState = PET_STATES.NEUTRAL;
    else if (mood >= 15) newState = PET_STATES.SLEEPY;
    else newState = PET_STATES.SAD;
    dispatch({ type: "SET_PET_STATE", payload: newState });
  }, [state.petMood, state.isRunning]);

  // Time-of-day message on mount
  useEffect(() => {
    const tod = getTimeOfDay();
    const msgs = AI_MESSAGES[tod] || AI_MESSAGES.encouragement;
    setTimeout(() => dispatch({ type: "ADD_MESSAGE", payload: randomFrom(msgs) }), 1500);
  }, []);

  // Day/night affects mood slightly
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 0 && h < 6) {
      dispatch({ type: "SET_PET_MOOD", payload: state.petMood - 5 });
    }
  }, []);

  // CSS variables based on dark mode
  const theme = state.darkMode
    ? {
        "--bg": "#1A1F1B",
        "--bg-2": "#222823",
        "--surface": "#2A312B",
        "--surface-2": "#344035",
        "--text-primary": "#E8F5EA",
        "--text-muted": "#7A9B7E",
        "--font-display": "'Georgia', serif",
      }
    : {
        "--bg": "#F7FDF8",
        "--bg-2": "#EDF8F0",
        "--surface": "#DFF5E1",
        "--surface-2": "#BFE8C8",
        "--text-primary": "#1A3320",
        "--text-muted": "#6B8F72",
        "--font-display": "'Georgia', serif",
      };

  return (
    <div
      style={{
        ...theme,
        minHeight: "100vh",
        background: "var(--bg)",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        color: "var(--text-primary)",
        transition: "background 0.4s, color 0.4s",
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        @keyframes bounce {
          from { transform: translateY(0) scale(1.1); }
          to { transform: translateY(-12px) scale(1.15); }
        }
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card {
          background: var(--bg);
          border: 1px solid var(--surface);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.04);
          transition: background 0.4s, border-color 0.4s;
          animation: fadeIn 0.4s ease;
        }
        .card:hover {
          border-color: var(--surface-2);
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }

        .stat-card {
          text-align: center;
          padding: 16px 12px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8FD3A6, #6BC48A);
          border: none;
          border-radius: 999px;
          color: white;
          font-weight: 700;
          font-size: 15px;
          padding: 14px 28px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(143, 211, 166, 0.35);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(143, 211, 166, 0.45);
        }
        .btn-primary:active {
          transform: translateY(0);
        }

        .screen-content {
          padding: 24px 20px 100px;
          max-width: 480px;
          margin: 0 auto;
          animation: fadeIn 0.3s ease;
        }

        input[type="range"] {
          -webkit-appearance: none;
          height: 6px;
          border-radius: 99px;
          background: var(--surface);
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #8FD3A6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--surface-2); border-radius: 99px; }
      `}</style>

      {/* Onboarding */}
      {state.showOnboarding && <OnboardingScreen dispatch={dispatch} />}

      {/* Pet chat bubble */}
      {state.showChat && state.messages.length > 0 && (
        <ChatBubble messages={state.messages} dispatch={dispatch} petState={state.petState} />
      )}

      {/* Screens */}
      {state.currentScreen === "dashboard" && <DashboardScreen state={state} dispatch={dispatch} />}
      {state.currentScreen === "timer" && <TimerScreen state={state} dispatch={dispatch} />}
      {state.currentScreen === "stats" && <StatsScreen state={state} dispatch={dispatch} />}

      {/* Bottom Nav */}
      <BottomNav current={state.currentScreen} dispatch={dispatch} darkMode={state.darkMode} />
    </div>
  );
}
