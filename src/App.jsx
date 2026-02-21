import { useState, useEffect, useMemo, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";
import { TrendingUp, TrendingDown, Activity, Plus, Trash2, Send, ChevronRight, ChevronLeft, Check, X, Download, Upload, BarChart2, BookOpen, Settings, Zap, Newspaper, Star, AlertTriangle, Brain, MessageCircle, Target, Calendar, Award, Flame, Sun, Moon, Layers } from "lucide-react";

// ── constants & utils ─────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n, d = 2) => parseFloat(n).toFixed(d);
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } };

const CURRENCIES = {
  "United States": { symbol: "$", code: "USD" }, "India": { symbol: "₹", code: "INR" },
  "United Kingdom": { symbol: "£", code: "GBP" }, "European Union": { symbol: "€", code: "EUR" },
  "Japan": { symbol: "¥", code: "JPY" }, "Australia": { symbol: "A$", code: "AUD" },
  "Canada": { symbol: "C$", code: "CAD" }, "Brazil": { symbol: "R$", code: "BRL" },
  "Singapore": { symbol: "S$", code: "SGD" }, "UAE": { symbol: "د.إ", code: "AED" },
  "Other": { symbol: "$", code: "USD" },
};

const SECTORS = [
  { id: "health", label: "Health", emoji: "💪", weight: 20, color: "#34d399" },
  { id: "academics", label: "Academics", emoji: "📚", weight: 20, color: "#60a5fa" },
  { id: "social", label: "Social", emoji: "👥", weight: 20, color: "#f59e0b" },
  { id: "mental", label: "Mental", emoji: "🧠", weight: 20, color: "#c084fc" },
  { id: "skills", label: "Skills", emoji: "⚡", weight: 20, color: "#fb923c" },
];

const TREND_OPTIONS = [
  { label: "Skyrocketing 🚀", value: 2.5 }, { label: "Growing 📈", value: 1.2 },
  { label: "Flat ➡️", value: 0 }, { label: "Declining 📉", value: -1.2 },
  { label: "Crashing 🔻", value: -2.5 },
];
const EMOJIS = ["📅","🏫","🎓","💼","❤️","🌍","🏠","⚡","🌱","🔥","🏆","💔","🎯","🌙","⛈️"];
const COLORS = ["#a3a3a3","#60a5fa","#34d399","#f59e0b","#f87171","#c084fc","#fb923c","#e2e8f0"];
const SKILL_LEVELS = ["Beginner","Developing","Proficient","Advanced","Expert"];

// ── Auto-classify habit to sector ────────────────────────────────────────────
const classifyHabit = (name) => {
  const n = name.toLowerCase();
  if (/(study|exam|homework|read|book|math|science|class|course|learn|revision|notes|school|college|tutor|academic|physics|chemistry|biology|history|english|assignment)/.test(n)) return "academics";
  if (/(exercise|gym|run|walk|yoga|sport|swim|cycle|skipping|workout|fitness|sleep|water|diet|eat|food|junk|meal|health|doctor|medicine|steps|cardio|stretch|meditat)/.test(n)) return "health";
  if (/(friend|social|talk|call|meet|family|party|event|hang|connect|network|people|relationship|date|chat|message|community)/.test(n)) return "social";
  if (/(meditat|journal|reflect|gratitude|mental|stress|anxiety|mood|therapy|breathe|mindful|emotion|relax|calm|focus|think|pray|puja|prayer)/.test(n)) return "mental";
  if (/(code|program|design|build|project|skill|practice|draw|paint|music|instrument|write|blog|create|craft|develop|tool|language|chess|hobby)/.test(n)) return "skills";
  return "health"; // default
};
const DEBT_SEVERITY = ["Minor","Moderate","Significant","Critical"];
const ACHIEVEMENTS = [
  { id: "first_log", icon: "🌱", title: "First Step", desc: "Log your first habit", check: (o) => o.length >= 1 },
  { id: "streak_7", icon: "🔥", title: "Week Warrior", desc: "Log habits 7 days in a row", check: (o, _, streak) => streak >= 7 },
  { id: "streak_30", icon: "🏆", title: "Iron Discipline", desc: "30-day habit streak", check: (o, _, streak) => streak >= 30 },
  { id: "index_1000", icon: "💎", title: "Four Figures", desc: "Index crosses 1000", check: (o, idx) => idx >= 1000 },
  { id: "index_500", icon: "⭐", title: "Milestone 500", desc: "Index crosses 500", check: (o, idx) => idx >= 500 },
  { id: "press_5", icon: "📰", title: "Journalist", desc: "Publish 5 press releases", check: (o, i, s, pr) => pr >= 5 },
  { id: "skills_5", icon: "🧪", title: "Renaissance", desc: "Add 5 skills", check: (o, i, s, pr, sk) => sk >= 5 },
  { id: "overcome", icon: "💪", title: "Debt Free", desc: "Overcome a weakness", check: (o, i, s, pr, sk, ow) => ow >= 1 },
];

const MOOD_LABELS = ["😞","😕","😐","🙂","😊","😄","🤩"];

// generate chart from phases — estimates from DOB to today if no phases
const generateFromPhases = (phases, startPrice, dob) => {
  const data = [];
  const sorted = [...(phases || [])].filter(p => p.start).sort((a, b) => a.start.localeCompare(b.start));
  const birthDate = dob ? new Date(dob) : new Date("2008-01-01");
  const now = new Date();

  if (!sorted.length) {
    // Auto-generate estimated life arc from birth to today
    let v = startPrice, d = new Date(birthDate);
    while (d <= now) {
      const age = (d - birthDate) / (365.25 * 86400000);
      // childhood stable, teen dip, late teen recovery trend
      let trend = 0;
      if (age < 5)  trend = 0.05;                        // early childhood — steady
      else if (age < 10) trend = 0.08;                   // primary school — gradual growth
      else if (age < 13) trend = 0.02;                   // pre-teen — slowing
      else if (age < 15) trend = -0.05;                  // early teen — common dip
      else if (age < 17) trend = 0.04;                   // mid teen — recovery
      else trend = 0.06;                                  // late teen / adult — growth
      v = Math.max(10, v + trend + (Math.random() - 0.5) * 2);
      data.push({ date: d.toISOString().split("T")[0], value: parseFloat(v.toFixed(2)), timestamp: d.getTime() });
      d.setDate(d.getDate() + 1);
    }
    return data;
  }

  // Fill gap from DOB to first phase with estimated data
  const firstPhaseStart = new Date(sorted[0].start);
  if (birthDate < firstPhaseStart) {
    let v = startPrice, d = new Date(birthDate);
    while (d < firstPhaseStart) {
      const age = (d - birthDate) / (365.25 * 86400000);
      let trend = age < 10 ? 0.06 : age < 13 ? 0.02 : -0.04;
      v = Math.max(10, v + trend + (Math.random() - 0.5) * 1.5);
      data.push({ date: d.toISOString().split("T")[0], value: parseFloat(v.toFixed(2)), timestamp: d.getTime() });
      d.setDate(d.getDate() + 1);
    }
  }

  sorted.forEach((ph, pi) => {
    const start = new Date(ph.start);
    const end = ph.end ? new Date(ph.end) : (sorted[pi+1] ? new Date(sorted[pi+1].start) : now);
    let v = data.length ? data[data.length-1].value : startPrice;
    let d = new Date(start);
    while (d <= end) {
      v = Math.max(10, v + (ph.trend||0) + (Math.random()-0.5)*3);
      data.push({ date: d.toISOString().split("T")[0], value: parseFloat(v.toFixed(2)), timestamp: d.getTime() });
      d.setDate(d.getDate()+1);
    }
  });

  return data;
};

// ── dark-only design tokens ───────────────────────────────────────────────────
const C = {
  bg: "bg-[#080808]", card: "bg-[#111111]", border: "border-[#1e1e1e]",
  text: "text-[#e8e8e8]", muted: "text-[#555]", subtle: "text-[#333]",
  input: "bg-[#0e0e0e] border-[#1e1e1e]", hover: "hover:bg-[#161616]",
  pill: "bg-[#161616] border-[#222]",
};

const Card = ({ children, className = "" }) => (
  <div className={`${C.card} border ${C.border} rounded-2xl p-5 ${className}`}>{children}</div>
);

const Input = ({ className = "", ...props }) => (
  <input className={`${C.input} border rounded-xl px-4 py-2.5 text-[#e8e8e8] placeholder-[#333] focus:outline-none focus:border-[#333] text-sm transition-all ${className}`} {...props} />
);

const Textarea = ({ className = "", ...props }) => (
  <textarea className={`${C.input} border rounded-xl px-4 py-2.5 text-[#e8e8e8] placeholder-[#333] focus:outline-none focus:border-[#333] text-sm resize-none transition-all ${className}`} {...props} />
);

const Btn = ({ children, variant = "primary", className = "", ...props }) => {
  const variants = {
    primary: "bg-[#e8e8e8] text-[#080808] hover:bg-[#d0d0d0]",
    ghost: "bg-[#161616] border border-[#1e1e1e] text-[#888] hover:bg-[#1a1a1a] hover:text-[#e8e8e8]",
    danger: "bg-[#1a0808] border border-[#3a1010] text-[#f87171] hover:bg-[#200a0a]",
    success: "bg-[#0a1a12] border border-[#1a4d2e] text-[#34d399] hover:bg-[#0d2018]",
  };
  return <button className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

// ── Onboarding ────────────────────────────────────────────────────────────────
const STEPS = ["Welcome","Profile","Country","Price","Life Story","Habits","Review"];

const Shell = ({ step, children, onNext, onBack, nextLabel = "Continue", nextDisabled = false }) => (
  <div className={`min-h-screen ${C.bg} flex flex-col items-center justify-center p-6`}>
    <div className="w-full max-w-lg">
      <div className="flex items-center justify-center gap-1.5 mb-10">
        {STEPS.map((_, i) => (
          <div key={i} className="flex items-center">
            <div className={`rounded-full flex items-center justify-center text-[10px] font-bold transition-all
              ${i < step ? "w-5 h-5 bg-[#e8e8e8] text-[#080808]" : i === step ? "w-6 h-6 border border-[#555] text-[#888]" : "w-4 h-4 border border-[#222] text-[#333]"}`}>
              {i < step ? <Check size={10} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`w-4 h-px mx-1 ${i < step ? "bg-[#555]" : "bg-[#1e1e1e]"}`} />}
          </div>
        ))}
      </div>
      <Card>
        {children}
        <div className="flex gap-3 mt-8">
          {step > 0 && <Btn variant="ghost" onClick={onBack} className="flex-1"><ChevronLeft size={15} /> Back</Btn>}
          <Btn onClick={onNext} disabled={nextDisabled} className={`flex-1 ${nextDisabled ? "opacity-30 cursor-not-allowed" : ""}`}>{nextLabel} <ChevronRight size={15} /></Btn>
        </div>
      </Card>
    </div>
  </div>
);

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [prof, setProf] = useState({ name: "", ticker: "", dob: "" });
  const [loc, setLoc] = useState({ country: "" });
  const [price, setPrice] = useState({ startPrice: 500 });
  const [story, setStory] = useState({ phases: [] });
  const [hab, setHab] = useState({ habits: [] });

  const n = () => setStep(s => s + 1), b = () => setStep(s => s - 1);
  const finish = () => { const ticker = prof.ticker || prof.name.slice(0,4).toUpperCase(); onComplete({ ...prof, ticker, ...loc, ...price, ...story, ...hab }); };

  const DEFS = [{ name:"Morning Exercise",impact:2,type:"positive",emoji:"🏃",sector:"health"},{name:"Study Session",impact:3,type:"positive",emoji:"📚",sector:"academics"},{name:"Meditation",impact:1.5,type:"positive",emoji:"🧘",sector:"mental"},{name:"Junk Food",impact:-2.5,type:"negative",emoji:"🍔",sector:"health"},{name:"Good Sleep",impact:1,type:"positive",emoji:"😴",sector:"health"}];

  if (step === 0) return (
    <Shell step={0} onNext={n} nextLabel="Begin">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#161616] border border-[#222] rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">📈</div>
        <h1 className="text-3xl font-semibold text-[#e8e8e8] mb-3 tracking-tight">MyLife Index</h1>
        <p className="text-[#555] text-sm leading-relaxed mb-8">Your life, quantified like a stock market. Track every phase, habit, skill and emotion — watch your personal index grow.</p>
        <div className="grid grid-cols-3 gap-3">
          {[["📊","Index Chart"],["🧠","AI Coach"],["💎","Assets"]].map(([e,l]) => (
            <div key={l} className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl p-4">
              <div className="text-2xl mb-2">{e}</div><div className="text-xs text-[#444]">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );

  if (step === 1) return (
    <Shell step={1} onNext={n} onBack={b} nextDisabled={!prof.name.trim() || !prof.dob}>
      <h2 className="text-xl font-semibold text-[#e8e8e8] mb-1">Your Profile</h2>
      <p className="text-[#444] text-xs mb-6">Born after 2010 not supported.</p>
      <div className="space-y-4">
        {[["Full Name","text","e.g. Alex Johnson","name"],["Ticker (optional)","text","AUTO","ticker"]].map(([l,t,p,k]) => (
          <div key={k}><label className="text-xs text-[#444] uppercase tracking-wider block mb-2">{l}</label>
            <Input type={t} placeholder={p} value={prof[k]} onChange={e => setProf(x => ({ ...x, [k]: k==="ticker"?e.target.value.toUpperCase():e.target.value }))} className="w-full" /></div>
        ))}
        <div><label className="text-xs text-[#444] uppercase tracking-wider block mb-2">Date of Birth</label>
          <Input type="date" max="2010-12-31" min="1950-01-01" value={prof.dob} onChange={e => setProf(x => ({ ...x, dob: e.target.value }))} className="w-full" /></div>
      </div>
    </Shell>
  );

  if (step === 2) return (
    <Shell step={2} onNext={n} onBack={b} nextDisabled={!loc.country}>
      <h2 className="text-xl font-semibold text-[#e8e8e8] mb-1">Country & Currency</h2>
      <p className="text-[#444] text-xs mb-5">Sets your index denomination.</p>
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
        {Object.keys(CURRENCIES).map(c => (
          <button key={c} onClick={() => setLoc({ country: c })}
            className={`py-3 px-4 rounded-xl text-sm text-left border transition-all ${loc.country===c?"bg-[#e8e8e8] text-[#080808] border-[#e8e8e8]":"bg-[#0e0e0e] text-[#666] border-[#1e1e1e] hover:border-[#333] hover:text-[#aaa]"}`}>
            <span className="block font-medium">{c}</span>
            <span className={`text-xs font-mono ${loc.country===c?"text-[#080808]/50":"text-[#333]"}`}>{CURRENCIES[c]?.code}</span>
          </button>
        ))}
      </div>
    </Shell>
  );

  if (step === 3) return (
    <Shell step={3} onNext={n} onBack={b} nextDisabled={!price.startPrice || price.startPrice <= 0}>
      <h2 className="text-xl font-semibold text-[#e8e8e8] mb-1">IPO Price</h2>
      <p className="text-[#444] text-xs mb-6">Your starting index value.</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[100,250,500,1000].map(p => (
          <button key={p} onClick={() => setPrice({ startPrice: p })}
            className={`py-3 rounded-xl text-sm font-semibold border transition-all ${price.startPrice===p?"bg-[#e8e8e8] text-[#080808] border-[#e8e8e8]":"bg-[#0e0e0e] text-[#666] border-[#1e1e1e] hover:border-[#333]"}`}>{p}</button>
        ))}
      </div>
      <Input type="number" min={1} placeholder="Custom value" value={price.startPrice||""} onChange={e=>setPrice({startPrice:parseFloat(e.target.value)})} className="w-full" />
    </Shell>
  );

  if (step === 4) return (
    <Shell step={4} onNext={n} onBack={b}>
      <h2 className="text-xl font-semibold text-[#e8e8e8] mb-1">Life Story</h2>
      <p className="text-[#444] text-xs mb-4">Each phase shapes your chart curve.</p>
      <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
        {story.phases.map(ph => (
          <div key={ph.id} className="flex items-center gap-3 bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-4 py-2.5">
            <span>{ph.emoji}</span><div className="flex-1"><p className="text-sm text-[#ccc]">{ph.name}</p><p className="text-xs text-[#444]">{ph.start} → {ph.end||"now"}</p></div>
            <button onClick={()=>setStory(s=>({...s,phases:s.phases.filter(p=>p.id!==ph.id)}))} className="text-[#333] hover:text-red-400"><X size={13}/></button>
          </div>
        ))}
      </div>
      <PhaseForm onAdd={ph=>setStory(s=>({...s,phases:[...s.phases,ph]}))} />
    </Shell>
  );

  if (step === 5) return (
    <Shell step={5} onNext={n} onBack={b}>
      <h2 className="text-xl font-semibold text-[#e8e8e8] mb-1">Habits</h2>
      <p className="text-[#444] text-xs mb-4">These move your index daily.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {DEFS.map(h=>(
          <button key={h.name} onClick={()=>{ if(!hab.habits.find(x=>x.name===h.name)) setHab(d=>({...d,habits:[...d.habits,{...h,id:uid()}]})); }}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${hab.habits.find(x=>x.name===h.name)?"border-[#555] text-[#ccc] bg-[#1a1a1a]":"border-[#1e1e1e] text-[#444] hover:border-[#333] hover:text-[#888]"}`}>
            {h.emoji} {h.name}</button>
        ))}
      </div>
      <div className="space-y-1.5 max-h-32 overflow-y-auto mb-4">
        {hab.habits.map(h=>(
          <div key={h.id} className="flex items-center justify-between bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-4 py-2">
            <span className="text-sm text-[#ccc]">{h.emoji} {h.name}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${h.impact>=0?"text-green-400":"text-red-400"}`}>{h.impact>0?"+":""}{h.impact}%</span>
              <button onClick={()=>setHab(d=>({...d,habits:d.habits.filter(x=>x.id!==h.id)}))} className="text-[#333] hover:text-red-400"><X size={12}/></button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );

  return (
    <Shell step={6} onNext={finish} onBack={b} nextLabel="🚀 Launch">
      <h2 className="text-xl font-semibold text-[#e8e8e8] mb-4">Ready to Launch</h2>
      {[["👤 Name",prof.name],["📈 Ticker",`$${prof.ticker||prof.name.slice(0,4).toUpperCase()}`],["🌍 Country",`${loc.country} · ${CURRENCIES[loc.country]?.code}`],["💰 IPO",`${CURRENCIES[loc.country]?.symbol}${price.startPrice}`],["🗂️ Phases",`${story.phases.length} phases`],["✅ Habits",`${hab.habits.length} habits`]].map(([k,v])=>(
        <div key={k} className="flex justify-between items-center bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-4 py-3 mb-2">
          <span className="text-sm text-[#555]">{k}</span><span className="text-sm text-[#ccc]">{v}</span>
        </div>
      ))}
    </Shell>
  );
};

const PhaseForm = ({ onAdd }) => {
  const [d, setD] = useState({ name:"",start:"",end:"",trend:0,emoji:"📅",color:"#a3a3a3",desc:"" });
  const add = () => { if(!d.name.trim()||!d.start) return; onAdd({...d,id:uid()}); setD({name:"",start:"",end:"",trend:0,emoji:"📅",color:"#a3a3a3",desc:""}); };
  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 space-y-2.5">
      <div className="flex gap-2">
        <select value={d.emoji} onChange={e=>setD(p=>({...p,emoji:e.target.value}))} className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-lg px-2 py-2 text-base focus:outline-none">
          {EMOJIS.map(em=><option key={em}>{em}</option>)}
        </select>
        <Input value={d.name} onChange={e=>setD(p=>({...p,name:e.target.value}))} placeholder="Phase name" className="flex-1" />
      </div>
      <Textarea value={d.desc} onChange={e=>setD(p=>({...p,desc:e.target.value}))} placeholder="Describe this phase..." className="w-full h-14" />
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={d.start} onChange={e=>setD(p=>({...p,start:e.target.value}))} className="w-full" />
        <Input type="date" value={d.end} onChange={e=>setD(p=>({...p,end:e.target.value}))} className="w-full" />
      </div>
      <div className="grid grid-cols-1 gap-1">
        {TREND_OPTIONS.map(t=>(
          <button key={t.value} onClick={()=>setD(p=>({...p,trend:t.value}))}
            className={`px-3 py-2 rounded-lg text-xs border text-left transition-all ${d.trend===t.value?"bg-[#e8e8e8] text-[#080808] border-[#e8e8e8]":"bg-[#0a0a0a] text-[#555] border-[#1a1a1a] hover:border-[#333]"}`}>
            {t.label}</button>
        ))}
      </div>
      <div className="flex gap-2">{COLORS.map(c=>(<button key={c} onClick={()=>setD(p=>({...p,color:c}))} className={`w-5 h-5 rounded-full border-2 transition-all ${d.color===c?"border-[#e8e8e8] scale-110":"border-transparent opacity-50"}`} style={{backgroundColor:c}}/>))}</div>
      <Btn onClick={add} disabled={!d.name.trim()||!d.start} className={`w-full ${!d.name.trim()||!d.start?"opacity-30":""}`}><Plus size={15}/>Add Phase</Btn>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const TABS = [
  {id:"chart",icon:<BarChart2 size={16}/>,label:"Index"},
  {id:"coach",icon:<Brain size={16}/>,label:"Coach"},
  {id:"press",icon:<Newspaper size={16}/>,label:"Press"},
  {id:"habits",icon:<Flame size={16}/>,label:"Habits"},
  {id:"assets",icon:<Star size={16}/>,label:"Assets"},
  {id:"phases",icon:<BookOpen size={16}/>,label:"Phases"},
  {id:"more",icon:<Layers size={16}/>,label:"More"},
  {id:"settings",icon:<Settings size={16}/>,label:"Settings"},
];

const CustomTooltip = ({ active, payload, phases, curr }) => {
  if (!active||!payload?.length) return null;
  const d = payload[0].payload;
  const ph = phases?.find(p=>d.date>=p.start&&(!p.end||d.date<=p.end));
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-[#444] mb-1">{d.date}</p>
      {ph && <p className="text-xs mb-1.5" style={{color:ph.color}}>{ph.emoji} {ph.name}</p>}
      <p className="text-base font-semibold text-[#e8e8e8] font-mono">{curr}{parseFloat(d.value).toFixed(2)}</p>
      {d.mood !== undefined && <p className="text-xs text-[#555] mt-1">Mood: {MOOD_LABELS[d.mood]}</p>}
    </div>
  );
};

// Heatmap
const Heatmap = ({ orderBook }) => {
  const year = new Date().getFullYear();
  const days = useMemo(() => {
    const map = {};
    orderBook.forEach(o => { if (!map[o.date]) map[o.date] = 0; map[o.date] += o.change; });
    return map;
  }, [orderBook]);
  const months = useMemo(() => {
    const ms = [];
    for (let m = 0; m < 12; m++) {
      const weeks = []; let week = [];
      const first = new Date(year, m, 1);
      for (let d = 0; d < first.getDay(); d++) week.push(null);
      const daysInMonth = new Date(year, m+1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        week.push({ date: dateStr, val: days[dateStr] || 0, logged: !!days[dateStr] });
        if (week.length === 7) { weeks.push(week); week = []; }
      }
      if (week.length) weeks.push(week);
      ms.push({ month: new Date(year,m).toLocaleDateString("en-US",{month:"short"}), weeks });
    }
    return ms;
  }, [days, year]);

  const getColor = (cell) => {
    if (!cell) return "transparent";
    if (!cell.logged) return "#111";
    if (cell.val > 5) return "#166534";
    if (cell.val > 2) return "#15803d";
    if (cell.val > 0) return "#16a34a";
    if (cell.val > -2) return "#7f1d1d";
    return "#991b1b";
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        {months.map(({ month, weeks }) => (
          <div key={month}>
            <p className="text-[10px] text-[#444] mb-1">{month}</p>
            <div className="flex gap-0.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((cell, di) => (
                    <div key={di} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getColor(cell) }} title={cell?.date} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-[#333]">Less</span>
        {["#111","#7f1d1d","#16a34a","#166534"].map(c=><div key={c} className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:c}}/>)}
        <span className="text-[10px] text-[#333]">More</span>
      </div>
    </div>
  );
};

// AI Coach
const AICoach = ({ config, lifeIndex, orderBook, skills, weaknesses, phases, habits }) => {
  const [messages, setMessages] = useState([{ role:"assistant", content:`Hey ${config.name}! I'm your AI Life Coach. I have full context on your index (currently at ${fmt(lifeIndex)}), your ${phases.length} life phases, ${skills.length} skills, ${weaknesses.length} weaknesses and ${orderBook.length} logged events. Ask me anything about your life data, patterns, or what to focus on next.` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const context = `You are an elite life coach AI embedded in MyLife Index app. Be concise, insightful, and data-driven. The user's data:
- Name: ${config.name}, Country: ${config.country}
- IPO Price: ${config.startPrice}, Current Index: ${fmt(lifeIndex)}
- All-time change: ${fmt(((lifeIndex-config.startPrice)/config.startPrice)*100)}%
- Life phases: ${phases.map(p=>`${p.name} (${p.start}–${p.end||"now"}): ${TREND_OPTIONS.find(t=>t.value===p.trend)?.label}`).join(", ")||"none"}
- Skills: ${skills.map(s=>`${s.name} (${SKILL_LEVELS[s.level]})`).join(", ")||"none"}
- Weaknesses: ${weaknesses.map(w=>`${w.name} (${DEBT_SEVERITY[w.severity]})`).join(", ")||"none"}
- Active habits: ${habits.map(h=>`${h.name} (${h.impact>0?"+":""}${h.impact}%)`).join(", ")||"none"}
- Recent transactions (last 10): ${orderBook.slice(0,10).map(o=>`${o.desc}: ${o.change>0?"+":""}${fmt(o.change)}%`).join(", ")||"none"}
Give sharp, personalised advice. Reference their actual data. Keep responses under 200 words.`;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
          system: context,
          messages:[...messages, userMsg].filter(m=>m.role!=="system") })
      });
      const data = await resp.json();
      const text = data.content?.[0]?.text || "Sorry, I couldn't process that.";
      setMessages(p => [...p, { role:"assistant", content:text }]);
    } catch (e) {
      setMessages(p => [...p, { role:"assistant", content:"Connection error. Try again shortly." }]);
    }
    setLoading(false);
  };

  return (
    <Card>
      <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><Brain size={16} className="text-[#555]"/>AI Life Coach</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto mb-4 pr-1">
        {messages.map((m,i)=>(
          <div key={i} className={`flex ${m.role==="user"?"justify-end":""}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${m.role==="user"?"bg-[#1a1a1a] border border-[#222] text-[#ccc]":"bg-[#0e0e0e] border border-[#1a1a1a] text-[#aaa]"}`}>
              {m.role==="assistant"&&<p className="text-[10px] text-[#333] mb-1 font-mono">COACH</p>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="flex"><div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-2xl px-4 py-3 text-sm text-[#333]">Analysing your data...</div></div>}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about your patterns, habits, goals..." className="flex-1" />
        <Btn onClick={send} disabled={loading||!input.trim()}><Send size={15}/></Btn>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {["What are my patterns?","Where am I weakest?","What should I focus on?","Predict my next 30 days"].map(q=>(
          <button key={q} onClick={()=>{setInput(q);}} className="text-xs px-3 py-1.5 rounded-lg bg-[#0e0e0e] border border-[#1a1a1a] text-[#444] hover:text-[#888] hover:border-[#333] transition-all">{q}</button>
        ))}
      </div>
    </Card>
  );
};

// Sector radar
const SectorRadar = ({ sectorScores }) => {
  const data = SECTORS.map(s => ({ subject: s.label, value: Math.min(100, Math.max(0, sectorScores[s.id] || 50)), fullMark: 100 }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#1e1e1e" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "#444", fontSize: 11 }} />
        <Radar dataKey="value" stroke="#a3a3a3" fill="#a3a3a3" fillOpacity={0.1} strokeWidth={1.5} dot={{ r: 3, fill: "#a3a3a3" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

const Dashboard = ({ config, onReset }) => {
  const curr = CURRENCIES[config.country]?.symbol || "$";
  const ticker = config.ticker || config.name.slice(0,4).toUpperCase();

  const [chartData, setChartData] = useState(() => load("mli_chart3", null) || generateFromPhases(config.phases, config.startPrice, config.dob));
  const [orderBook, setOrderBook] = useState(() => load("mli_orders3", []));
  const [habits, setHabits] = useState(() => load("mli_habits3", config.habits || []));
  const [phases, setPhases] = useState(() => load("mli_phases3", config.phases || []));
  const [skills, setSkills] = useState(() => load("mli_skills3", []));
  const [weaknesses, setWeaknesses] = useState(() => load("mli_debts3", []));
  const [pressReleases, setPressReleases] = useState(() => load("mli_press3", []));
  const [moodLog, setMoodLog] = useState(() => load("mli_mood", {}));
  const [goals, setGoals] = useState(() => load("mli_goals", []));
  const [unlockedAch, setUnlockedAch] = useState(() => load("mli_ach", []));
  const [timeCapsules, setTimeCapsules] = useState(() => load("mli_capsules", []));
  const [sectorWeights, setSectorWeights] = useState(() => load("mli_sectors", Object.fromEntries(SECTORS.map(s=>[s.id,20]))));
  const [view, setView] = useState("chart");
  const [timeRange, setTimeRange] = useState("ALL");
  const [scenario, setScenario] = useState(""), [scenarioImpact, setScenarioImpact] = useState("");
  const [prTitle,setPrTitle]=useState(""),[prBody,setPrBody]=useState(""),[prImpact,setPrImpact]=useState(""),[prType,setPrType]=useState("neutral");
  const [newSkill,setNewSkill]=useState({name:"",level:0,category:"Technical",sector:"skills",developingHabit:""});
  const [newDebt,setNewDebt]=useState({name:"",severity:0,category:"Mental",plan:""});
  const [newGoal,setNewGoal]=useState({title:"",target:"",sector:"academics",reward:0});
  const [capsule,setCapsule]=useState({message:"",unlockDate:""});
  const [moreTab,setMoreTab]=useState("heatmap");

  // persist
  useEffect(()=>{save("mli_chart3",chartData);},[chartData]);
  useEffect(()=>{save("mli_orders3",orderBook);},[orderBook]);
  useEffect(()=>{save("mli_habits3",habits);},[habits]);
  useEffect(()=>{save("mli_phases3",phases);},[phases]);
  useEffect(()=>{save("mli_skills3",skills);},[skills]);
  useEffect(()=>{save("mli_debts3",weaknesses);},[weaknesses]);
  useEffect(()=>{save("mli_press3",pressReleases);},[pressReleases]);
  useEffect(()=>{save("mli_mood",moodLog);},[moodLog]);
  useEffect(()=>{save("mli_goals",goals);},[goals]);
  useEffect(()=>{save("mli_ach",unlockedAch);},[unlockedAch]);
  useEffect(()=>{save("mli_capsules",timeCapsules);},[timeCapsules]);
  useEffect(()=>{save("mli_sectors",sectorWeights);},[sectorWeights]);

  const lifeIndex = chartData[chartData.length-1]?.value || config.startPrice;
  const todayOrders = orderBook.filter(o=>o.date===today());
  const todayChange = todayOrders.reduce((s,o)=>s+o.change,0);
  const allTime = ((lifeIndex-config.startPrice)/config.startPrice)*100;
  const last7d = useMemo(()=>{ const c=chartData.filter(d=>d.timestamp>=Date.now()-7*86400000); return c.length>1?((lifeIndex-c[0].value)/c[0].value)*100:0; },[chartData,lifeIndex]);

  // streak
  const streak = useMemo(()=>{
    let s=0, d=new Date();
    while(true){ const ds=d.toISOString().split("T")[0]; if(orderBook.find(o=>o.date===ds)){s++;d.setDate(d.getDate()-1);}else break; }
    return s;
  },[orderBook]);

  // sector scores based on habits logged
  const sectorScores = useMemo(()=>{
    const scores = Object.fromEntries(SECTORS.map(s=>[s.id,50]));
    orderBook.slice(0,50).forEach(o=>{                     const h=habits.find(h=>h.name===o.desc||(o.desc&&o.desc.includes(h.name))); if(h?.sector){ scores[h.sector]=Math.min(100,Math.max(0,(scores[h.sector]||50)+(o.change>0?5:-5))); } });
    skills.forEach(sk=>{ if(scores[sk.sector]!==undefined) scores[sk.sector]=Math.min(100,scores[sk.sector]+(sk.level+1)*4); });
    return scores;
  },[orderBook,habits,skills]);

  // check achievements
  useEffect(()=>{
    const overcomeCount = orderBook.filter(o=>o.tag==="debt"&&o.change>0).length;
    ACHIEVEMENTS.forEach(a=>{ if(!unlockedAch.includes(a.id)&&a.check(orderBook,lifeIndex,streak,pressReleases.length,skills.length,overcomeCount)){ setUnlockedAch(p=>[...p,a.id]); } });
  },[orderBook,lifeIndex,streak,pressReleases,skills,weaknesses]);

  // check time capsules
  const openCapsules = timeCapsules.filter(c=>c.unlockDate<=today()&&!c.opened);

  const execute = (desc, pct, tag="") => {
    const prev = parseFloat(chartData[chartData.length-1]?.value) || config.startPrice;
    const safePct = parseFloat(pct);
    if (isNaN(prev) || isNaN(safePct)) return;
    const next = Math.max(1, prev * (1 + safePct / 100));
    if (isNaN(next)) return;
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    setChartData(p => [...p, { date: dateStr, value: parseFloat(next.toFixed(2)), timestamp: now.getTime(), mood: moodLog[dateStr] || undefined }]);
    setOrderBook(p => [{ id: uid(), time: now.toLocaleTimeString(), date: dateStr, desc, change: safePct, newIndex: next.toFixed(2), tag }, ...p.slice(0, 99)]);
  };

  const filteredData = useMemo(()=>{ const ranges={"1M":30,"3M":90,"6M":180,"1Y":365,"ALL":99999}; const c=Date.now()-ranges[timeRange]*86400000; return chartData.filter(d=>d.timestamp>=c); },[chartData,timeRange]);

  const analyzeScenario = () => {
    if(!scenario.trim()) return;
    const t=scenario.toLowerCase(); let impact=0;
    if(/(exam|test|score|result)/.test(t)) impact=/(great|high|90|95|100|excellent|pass)/.test(t)?5:/(fail|bad|poor|low)/.test(t)?-5:1;
    if(/(fight|lost.*friend|breakup)/.test(t)) impact=-4;
    if(/(made up|new friend|reconcile)/.test(t)) impact=3;
    if(/(sick|fever|hospital)/.test(t)) impact=-2.5;
    if(/(award|won|prize|achieve)/.test(t)) impact=4;
    if(/(vacation|trip|travel)/.test(t)) impact=2.5;
    if(scenarioImpact.trim()&&!isNaN(parseFloat(scenarioImpact))) impact=parseFloat(scenarioImpact);
    if(!impact){alert("Add a % override — couldn't detect impact.");return;}
    execute(`📌 ${scenario.slice(0,70)}`,impact,"event");
    setScenario("");setScenarioImpact("");
  };

  const technicals = useMemo(()=>{
    const recent=chartData.slice(-30).map(d=>d.value);
    if(recent.length<5) return null;
    const sma14=recent.slice(-14).reduce((a,b)=>a+b,0)/14;
    const sma30=recent.reduce((a,b)=>a+b,0)/recent.length;
    const last52=chartData.filter(d=>d.timestamp>=Date.now()-365*86400000);
    const high52=Math.max(...last52.map(d=>d.value)), low52=Math.min(...last52.map(d=>d.value));
    const mean=recent.reduce((a,b)=>a+b)/recent.length;
    const vol=Math.sqrt(recent.reduce((s,v)=>s+(v-mean)**2,0)/recent.length);
    let g=0,l=0; for(let i=1;i<recent.length;i++){const d=recent[i]-recent[i-1];d>0?g+=d:l-=d;}
    const rsi=100-100/(1+g/(l||1));
    const mom=recent[recent.length-1]-recent[0];
    const assetScore=skills.reduce((s,sk)=>s+(sk.level+1)*5,0);
    const debtScore=weaknesses.reduce((s,w)=>s+(w.severity+1)*8,0);
    const netWorth=assetScore-debtScore;
    const signals=[];
    if(rsi>70) signals.push({label:"Overbought",color:"text-yellow-400",icon:"⚠️"});
    if(rsi<30) signals.push({label:"Oversold",color:"text-blue-400",icon:"💎"});
    if(lifeIndex>sma14&&lifeIndex>sma30) signals.push({label:"Above All MAs",color:"text-green-400",icon:"📈"});
    if(lifeIndex<sma14&&lifeIndex<sma30) signals.push({label:"Below MAs",color:"text-red-400",icon:"📉"});
    if(streak>=7) signals.push({label:`${streak}d Streak 🔥`,color:"text-orange-400",icon:"🔥"});
    if(netWorth>20) signals.push({label:"Asset Rich",color:"text-purple-400",icon:"💡"});
    const rating=mom>10?"STRONG BUY":mom>3?"BUY":mom<-10?"SELL":mom<-3?"WEAK HOLD":"HOLD";
    const forecast30=Array.from({length:30},(_,i)=>({ date:new Date(Date.now()+(i+1)*86400000).toISOString().split("T")[0], projected:parseFloat((lifeIndex*(1+(mom/chartData.slice(-30,)[0]?.value||1)*i/100)).toFixed(2)), optimistic:parseFloat((lifeIndex*(1+(mom/chartData.slice(-30,)[0]?.value||1)*i/100)*1.015).toFixed(2)) }));
    return {sma14,sma30,high52,low52,vol,rsi,mom,assetScore,debtScore,netWorth,signals,rating,forecast30};
  },[chartData,skills,weaknesses,lifeIndex,streak]);

  // dividend
  useEffect(()=>{ if(streak>0&&streak%7===0){ execute(`🏅 Dividend: ${streak}-day streak bonus`,streak*0.5,"dividend"); } },[streak]);

  // P&L
  const pnl = useMemo(()=>{
    const byMonth={};
    orderBook.forEach(o=>{ const m=o.date.slice(0,7); if(!byMonth[m]) byMonth[m]={month:m,gain:0,loss:0,count:0}; if(o.change>0) byMonth[m].gain+=o.change; else byMonth[m].loss+=o.change; byMonth[m].count++; });
    return Object.values(byMonth).sort((a,b)=>b.month.localeCompare(a.month)).slice(0,6);
  },[orderBook]);

  return (
    <div className={`min-h-screen ${C.bg} text-[#e8e8e8]`}>
      {/* open capsule alert */}
      {openCapsules.map(c=>(
        <div key={c.id} className="fixed top-4 left-4 right-4 z-50 bg-[#111] border border-[#333] rounded-2xl p-4 shadow-2xl">
          <p className="text-xs text-[#555] mb-1">⏰ Time Capsule Unlocked</p>
          <p className="text-sm text-[#ccc] font-medium mb-2">{c.message}</p>
          <p className="text-xs text-[#333]">Written on {c.createdDate}</p>
          <Btn variant="ghost" onClick={()=>setTimeCapsules(p=>p.map(x=>x.id===c.id?{...x,opened:true}:x))} className="mt-2 w-full text-xs py-2">Dismiss</Btn>
        </div>
      ))}

      {/* topbar */}
      <div className={`border-b border-[#141414] px-5 py-4 flex items-center justify-between sticky top-0 ${C.bg}/95 backdrop-blur z-20`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#111] border border-[#1e1e1e] rounded-xl flex items-center justify-center text-base">📈</div>
          <div><p className="font-semibold text-[#e8e8e8] text-sm leading-none">{config.name}</p>
            <p className="text-xs text-[#333] font-mono">${ticker} · {CURRENCIES[config.country]?.code}</p></div>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-[#e8e8e8] font-mono">{curr}{fmt(lifeIndex)}</p>
          <p className={`text-xs font-mono ${todayChange>=0?"text-green-500":"text-red-500"}`}>{todayChange>=0?"+":""}{fmt(todayChange)}% today</p>
        </div>
      </div>

      {/* streak banner */}
      {streak>=3 && (
        <div className="bg-[#0d0d0d] border-b border-[#141414] px-5 py-2 flex items-center gap-2">
          <Flame size={13} className="text-orange-500"/><span className="text-xs text-[#555]">{streak}-day streak · Keep going</span>
          <span className="ml-auto text-xs text-[#333]">Next dividend at {Math.ceil(streak/7)*7} days</span>
        </div>
      )}

      {/* nav */}
      <div className="border-b border-[#141414] flex bg-[#080808] sticky top-[57px] z-10 overflow-x-auto">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 text-[10px] font-medium transition-all border-b-2
              ${view===t.id?"border-[#555] text-[#ccc]":"border-transparent text-[#333] hover:text-[#555]"}`}>
            {t.icon}<span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-20 space-y-4">

        {/* ── INDEX ─── */}
        {view==="chart" && (<>
          {/* stat row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {l:"IPO",v:`${curr}${fmt(config.startPrice)}`,s:"Listing"},
              {l:"All-Time",v:`${allTime>=0?"+":""}${fmt(allTime)}%`,c:allTime>=0?"text-green-500":"text-red-500"},
              {l:"7 Day",v:`${last7d>=0?"+":""}${fmt(last7d)}%`,c:last7d>=0?"text-green-500":"text-red-500"},
              {l:"Streak",v:`${streak}d 🔥`,s:"consecutive"},
            ].map(s=>(
              <div key={s.l} className={`${C.card} border ${C.border} rounded-2xl p-3 text-center`}>
                <p className="text-[10px] text-[#333] mb-1">{s.l}</p>
                <p className={`text-sm font-semibold font-mono ${s.c||"text-[#ccc]"}`}>{s.v}</p>
                {s.s&&<p className="text-[10px] text-[#2a2a2a] mt-0.5">{s.s}</p>}
              </div>
            ))}
          </div>

          {/* mood logger */}
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#444]">Today's Mood</p>
              <div className="flex gap-2">
                {MOOD_LABELS.map((m,i)=>(
                  <button key={i} onClick={()=>{ setMoodLog(p=>({...p,[today()]:i})); execute(`Mood: ${m}`,i*0.3-0.9,"mood"); }}
                    className={`text-lg transition-all ${moodLog[today()]===i?"scale-125":"opacity-40 hover:opacity-70"}`}>{m}</button>
                ))}
              </div>
            </div>
          </Card>

          {/* chart */}
          <Card>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold text-[#e8e8e8] flex items-center gap-2 text-sm"><Activity size={16} className="text-[#333]"/>Performance</h2>
              <div className="flex gap-1">
                {["1M","3M","6M","1Y","ALL"].map(r=>(
                  <button key={r} onClick={()=>setTimeRange(r)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${timeRange===r?"bg-[#e8e8e8] text-[#080808]":"text-[#444] hover:text-[#888]"}`}>{r}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e8e8e8" stopOpacity={0.06}/>
                    <stop offset="95%" stopColor="#e8e8e8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#111"/>
                <XAxis dataKey="date" stroke="#111" tick={{fill:"#2a2a2a",fontSize:10}} tickFormatter={v=>new Date(v).toLocaleDateString("en-US",{month:"short",year:"2-digit"})}/>
                <YAxis stroke="#111" tick={{fill:"#2a2a2a",fontSize:10}} domain={["dataMin - 20","dataMax + 20"]}/>
                <Tooltip content={<CustomTooltip phases={phases} curr={curr}/>}/>
                {phases.map(ph=>ph.start&&<ReferenceLine key={ph.id} x={ph.start} stroke={ph.color} strokeDasharray="4 3" strokeOpacity={0.4} label={{value:ph.emoji,fill:ph.color,fontSize:12,position:"insideTopLeft"}}/>)}
                <Area type="monotone" dataKey="value" stroke="#555" strokeWidth={1.5} fill="url(#grad)" dot={false} activeDot={{r:4,fill:"#e8e8e8",stroke:"#080808",strokeWidth:2}}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* technicals */}
          {technicals && (
            <Card>
              <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><Zap size={16} className="text-[#333]"/>Technicals</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${technicals.rating.includes("BUY")?"border-green-900 text-green-500 bg-green-950/30":technicals.rating.includes("SELL")?"border-red-900 text-red-500 bg-red-950/30":"border-[#1e1e1e] text-[#555]"}`}>{technicals.rating}</span>
                {technicals.signals.map(s=><span key={s.label} className={`px-3 py-1.5 rounded-lg text-xs bg-[#0e0e0e] border border-[#1a1a1a] ${s.color}`}>{s.icon} {s.label}</span>)}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[["RSI (14)",fmt(technicals.rsi),technicals.rsi>70?"text-yellow-500":technicals.rsi<30?"text-blue-500":"text-[#888]"],["SMA 14",`${curr}${fmt(technicals.sma14)}`,"text-[#888]"],["SMA 30",`${curr}${fmt(technicals.sma30)}`,"text-[#888]"],["Momentum",`${technicals.mom>=0?"+":""}${fmt(technicals.mom)}`,technicals.mom>=0?"text-green-500":"text-red-500"],["52W High",`${curr}${fmt(technicals.high52)}`,"text-[#888]"],["52W Low",`${curr}${fmt(technicals.low52)}`,"text-[#888]"],["Volatility",`${fmt(technicals.vol)}σ`,technicals.vol>15?"text-red-500":technicals.vol>7?"text-yellow-500":"text-green-500"],["Net Worth",`${technicals.netWorth>=0?"+":""}${technicals.netWorth}pts`,technicals.netWorth>=0?"text-green-500":"text-red-500"]].map(([l,v,c])=>(
                  <div key={l} className="bg-[#0a0a0a] border border-[#141414] rounded-xl px-4 py-3 flex justify-between items-center">
                    <span className="text-xs text-[#333]">{l}</span><span className={`text-sm font-semibold font-mono ${c}`}>{v}</span>
                  </div>
                ))}
              </div>
              {/* sector radar */}
              <div className="border-t border-[#141414] pt-4 mb-4">
                <p className="text-xs text-[#333] mb-3">Sector Breakdown</p>
                <SectorRadar sectorScores={sectorScores}/>
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {SECTORS.map(s=>(
                    <div key={s.id} className="text-center">
                      <p className="text-base">{s.emoji}</p>
                      <p className="text-[10px] text-[#333]">{Math.round(sectorScores[s.id]||50)}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* balance sheet */}
              <div className="bg-[#0a0a0a] border border-[#141414] rounded-xl p-4 mb-3">
                <p className="text-xs text-[#333] mb-3">Balance Sheet</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1"><p className="text-xs text-green-600 mb-1">Assets</p><div className="h-1.5 bg-[#0d0d0d] rounded-full"><div className="h-full bg-green-800 rounded-full" style={{width:`${Math.min(100,technicals.assetScore)}%`}}/></div><p className="text-[10px] text-[#333] mt-1">+{technicals.assetScore}pts</p></div>
                  <div className="flex-1"><p className="text-xs text-red-600 mb-1">Debt</p><div className="h-1.5 bg-[#0d0d0d] rounded-full"><div className="h-full bg-red-900 rounded-full" style={{width:`${Math.min(100,technicals.debtScore)}%`}}/></div><p className="text-[10px] text-[#333] mt-1">−{technicals.debtScore}pts</p></div>
                  <div className="text-center"><p className="text-xs text-[#333]">Net</p><p className={`text-base font-bold font-mono ${technicals.netWorth>=0?"text-green-600":"text-red-600"}`}>{technicals.netWorth>=0?"+":""}{technicals.netWorth}</p></div>
                </div>
              </div>
              {/* insight */}
              <div className="bg-[#0a0a0a] border border-[#141414] rounded-xl p-4">
                <p className="text-[10px] text-[#333] mb-2 uppercase tracking-wider">AI Signal</p>
                <p className="text-xs text-[#555] leading-relaxed">
                  {technicals.rsi>70?"Running hot — gains may be overdone. Consolidation likely before next leg up.":technicals.rsi<30?"Deeply oversold. Historically strong recovery potential from these levels.":technicals.mom>5?"Positive momentum building. Continuation likely if habit consistency holds.":technicals.mom<-5?"Negative momentum dominant. Focus on high-yield habits to reverse trend.":"Range-bound. Accumulation phase — small consistent wins will break resistance."}
                  {technicals.netWorth<-10?" ⚠️ Debt exceeding assets.":technicals.netWorth>20?" 🌟 Strong asset base providing support.":""}
                  {streak>=7?` 🔥 ${streak}-day streak is adding daily compounding momentum.`:""}
                </p>
              </div>
            </Card>
          )}

          {/* event logger */}
          <Card>
            <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><Send size={16} className="text-[#333]"/>Log an Event</h2>
            <Textarea value={scenario} onChange={e=>setScenario(e.target.value)} placeholder="What happened? (e.g. 'Scored 90% in finals', 'Big fight with best friend')" className="w-full h-20 mb-2"/>
            <div className="flex gap-2">
              <Input value={scenarioImpact} onChange={e=>setScenarioImpact(e.target.value)} placeholder="% override" className="flex-1 font-mono"/>
              <Btn onClick={analyzeScenario}><Send size={15}/>Log</Btn>
            </div>
          </Card>

          {/* transaction log */}
          <Card>
            <h2 className="font-semibold text-[#e8e8e8] text-sm mb-4">Transaction Log</h2>
            {orderBook.length===0?<p className="text-[#2a2a2a] text-sm text-center py-8">No transactions yet.</p>:(
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {orderBook.slice(0,30).map(o=>(
                  <div key={o.id} className="flex items-center justify-between bg-[#0a0a0a] border border-[#141414] rounded-xl px-4 py-3">
                    <div><p className="text-sm text-[#999] truncate max-w-52 sm:max-w-64">{o.desc}</p><p className="text-[10px] text-[#2a2a2a]">{o.date} · {o.time}{o.tag?` · ${o.tag}`:""}</p></div>
                    <div className="text-right"><p className={`text-sm font-bold font-mono ${o.change>=0?"text-green-600":"text-red-600"}`}>{o.change>0?"+":""}{fmt(o.change)}%</p><p className="text-[10px] text-[#2a2a2a] font-mono">{curr}{o.newIndex}</p></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>)}

        {/* ── COACH ─── */}
        {view==="coach" && (
          <AICoach config={config} lifeIndex={lifeIndex} orderBook={orderBook} skills={skills} weaknesses={weaknesses} phases={phases} habits={habits}/>
        )}

        {/* ── PRESS ─── */}
        {view==="press" && (<>
          <Card>
            <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><Newspaper size={16} className="text-[#333]"/>Publish Press Release</h2>
            <div className="space-y-3">
              <Input value={prTitle} onChange={e=>setPrTitle(e.target.value)} placeholder="Headline" className="w-full"/>
              <Textarea value={prBody} onChange={e=>setPrBody(e.target.value)} placeholder="Write your full press release — your thoughts, what happened, why it matters..." className="w-full h-28"/>
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-1">
                  {[["positive","🟢"],["neutral","⚪"],["negative","🔴"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setPrType(v)} className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${prType===v?"bg-[#e8e8e8] text-[#080808] border-[#e8e8e8]":"bg-[#0e0e0e] text-[#444] border-[#1e1e1e] hover:border-[#333]"}`}>{l} {v}</button>
                  ))}
                </div>
                <Input value={prImpact} onChange={e=>setPrImpact(e.target.value)} placeholder="% impact" className="w-24 font-mono"/>
                <Btn onClick={()=>{
                  if(!prTitle.trim()||!prBody.trim()) return;
                  const impact=prImpact?parseFloat(prImpact):prType==="positive"?3:prType==="negative"?-3:0;
                  const now=new Date();
                  setPressReleases(p=>[{id:uid(),title:prTitle,body:prBody,type:prType,impact,date:now.toISOString().split("T")[0],time:now.toLocaleTimeString()},...p]);
                  if(impact!==0) execute(`📰 ${prTitle}`,impact,"press");
                  setPrTitle("");setPrBody("");setPrImpact("");setPrType("neutral");
                }} disabled={!prTitle.trim()||!prBody.trim()}><Newspaper size={15}/>Publish</Btn>
              </div>
            </div>
          </Card>
          {pressReleases.map(pr=>(
            <div key={pr.id} className={`border rounded-2xl p-5 ${pr.type==="positive"?"bg-green-950/10 border-green-900/20":pr.type==="negative"?"bg-red-950/10 border-red-900/20":"bg-[#0e0e0e] border-[#1a1a1a]"}`}>
              <div className="flex items-start justify-between mb-3">
                <div><p className="font-semibold text-[#ccc] text-sm">{pr.title}</p><p className="text-[10px] text-[#2a2a2a] mt-1">{pr.date} · {pr.time}</p></div>
                <div className="flex gap-2">
                  {pr.impact!==0&&<span className={`text-xs font-bold font-mono px-2 py-1 rounded-lg ${pr.type==="positive"?"bg-green-950/40 text-green-600":pr.type==="negative"?"bg-red-950/40 text-red-600":"bg-[#111] text-[#555]"}`}>{pr.impact>0?"+":""}{pr.impact}%</span>}
                  <button onClick={()=>setPressReleases(p=>p.filter(x=>x.id!==pr.id))} className="text-[#222] hover:text-red-600"><X size={14}/></button>
                </div>
              </div>
              <p className="text-sm text-[#444] leading-relaxed">{pr.body}</p>
            </div>
          ))}
        </>)}

        {/* ── HABITS ─── */}
        {view==="habits" && (<>
          <div className="grid sm:grid-cols-2 gap-3">
            {habits.map(h=>(
              <div key={h.id} className={`${C.card} border ${C.border} rounded-2xl p-4 flex items-center justify-between`}>
                <div><p className="font-medium text-[#ccc] text-sm">{h.emoji} {h.name}</p><p className={`text-xs mt-0.5 font-mono ${h.impact>=0?"text-green-600":"text-red-600"}`}>{h.impact>0?"+":""}{h.impact}%</p></div>
                <div className="flex gap-2">
                  <Btn variant={h.impact>=0?"success":"danger"} onClick={()=>execute(h.name, h.impact, "habit")} className="text-xs py-2 px-3">Log</Btn>
                  <button onClick={()=>setHabits(p=>p.filter(x=>x.id!==h.id))} className="text-[#222] hover:text-red-600"><Trash2 size={15}/></button>
                </div>
              </div>
            ))}
          </div>
          <Card>
            <h3 className="font-semibold text-[#ccc] text-sm mb-4">Add Habit</h3>
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Name" className="flex-1 min-w-32" id="hn"/>
              <Input type="number" step="0.5" placeholder="%" className="w-16 font-mono" id="hi"/>
              <select className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-xs text-[#888] focus:outline-none" id="ht">
                <option value="positive">+ Positive</option><option value="negative">− Negative</option>
              </select>
              <select className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-xs text-[#888] focus:outline-none" id="hs">
                <option value="auto">🤖 Auto-detect</option>
                {SECTORS.map(s=><option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
              </select>
              <Btn onClick={()=>{
                const name=document.getElementById("hn").value, imp=document.getElementById("hi").value, type=document.getElementById("ht").value;
                const sectorEl = document.getElementById("hs");
                if(!name||!imp) return;
                const impact=parseFloat(imp)*(type==="negative"?-1:1);
                const autoSector = sectorEl.value === "auto" ? classifyHabit(name) : sectorEl.value;
                setHabits(p=>[...p,{id:uid(),name,impact,type,emoji:type==="positive"?"✅":"❌",sector:autoSector}]);
                document.getElementById("hn").value="";document.getElementById("hi").value="";
              }}><Plus size={16}/></Btn>
            </div>
          </Card>
          {/* P&L */}
          <Card>
            <h3 className="font-semibold text-[#ccc] text-sm mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-[#333]"/>Monthly P&L</h3>
            {pnl.length===0?<p className="text-[#2a2a2a] text-sm text-center py-4">No data yet.</p>:(
              <div className="space-y-2">
                {pnl.map(m=>(
                  <div key={m.month} className="flex items-center justify-between bg-[#0a0a0a] border border-[#141414] rounded-xl px-4 py-3">
                    <span className="text-xs text-[#555] font-mono">{m.month}</span>
                    <div className="flex gap-4">
                      <span className="text-xs text-green-600 font-mono">+{fmt(m.gain)}%</span>
                      <span className="text-xs text-red-600 font-mono">{fmt(m.loss)}%</span>
                      <span className={`text-xs font-bold font-mono ${m.gain+m.loss>=0?"text-green-500":"text-red-500"}`}>{m.gain+m.loss>=0?"+":""}{fmt(m.gain+m.loss)}%</span>
                    </div>
                    <span className="text-[10px] text-[#2a2a2a]">{m.count} logs</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>)}

        {/* ── ASSETS ─── */}
        {view==="assets" && (<>
          <Card>
            <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><Star size={16} className="text-[#333]"/>Skills <span className="text-[#333] font-normal">— Assets</span></h2>
            <div className="space-y-3 mb-5">
              {skills.length===0&&<p className="text-[#2a2a2a] text-sm text-center py-4">No skills yet.</p>}
              {skills.map(sk=>(
                <div key={sk.id} className="bg-[#0a0a0a] border border-[#141414] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div><p className="font-medium text-[#ccc] text-sm">{sk.name}</p><p className="text-xs text-[#333]">{sk.category} · {SKILL_LEVELS[sk.level]}</p></div>
                    <div className="flex gap-2">
                      <span className="text-xs font-bold text-green-700 bg-green-950/30 px-2 py-1 rounded-lg">+{(sk.level+1)*5}pts</span>
                      <button onClick={()=>{setSkills(p=>p.map(x=>x.id===sk.id?{...x,level:Math.min(4,x.level+1)}:x));execute(`📈 Levelled up: ${sk.name}`,(sk.level+1)*0.8,"skill");}} className="text-[10px] bg-[#111] border border-[#1e1e1e] hover:border-[#333] px-2 py-1 rounded-lg text-[#555] hover:text-[#999] transition-all">Level Up</button>
                      <button onClick={()=>setSkills(p=>p.filter(x=>x.id!==sk.id))} className="text-[#222] hover:text-red-600"><X size={13}/></button>
                    </div>
                  </div>
                  <div className="flex gap-1">{SKILL_LEVELS.map((_,i)=><div key={i} className={`flex-1 h-1 rounded-full ${i<=sk.level?"bg-green-800":"bg-[#141414]"}`}/>)}</div>
                  {sk.developingHabit&&<p className="text-[10px] text-[#2a2a2a] mt-2">🔁 Via: {sk.developingHabit}</p>}
                </div>
              ))}
            </div>
            <div className="border-t border-[#141414] pt-4 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Input value={newSkill.name} onChange={e=>setNewSkill(p=>({...p,name:e.target.value}))} placeholder="Skill name" className="flex-1 min-w-32"/>
                <select value={newSkill.category} onChange={e=>setNewSkill(p=>({...p,category:e.target.value}))} className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-xs text-[#888] focus:outline-none">
                  {["Technical","Creative","Social","Physical","Mental","Academic","Leadership"].map(c=><option key={c}>{c}</option>)}
                </select>
                <select value={newSkill.sector} onChange={e=>setNewSkill(p=>({...p,sector:e.target.value}))} className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-xs text-[#888] focus:outline-none">
                  <option value="auto">🤖 Auto-detect</option>
                  {SECTORS.map(s=><option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <select value={newSkill.level} onChange={e=>setNewSkill(p=>({...p,level:parseInt(e.target.value)}))} className="flex-1 bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-sm text-[#888] focus:outline-none">
                  {SKILL_LEVELS.map((l,i)=><option key={l} value={i}>{l}</option>)}
                </select>
                <Input value={newSkill.developingHabit} onChange={e=>setNewSkill(p=>({...p,developingHabit:e.target.value}))} placeholder="Developing via habit (optional)" className="flex-1"/>
              </div>
              <Btn onClick={()=>{if(!newSkill.name.trim()) return;setSkills(p=>[...p,{...newSkill,id:uid()}]);execute(`💡 Asset added: ${newSkill.name}`,2,"skill");setNewSkill({name:"",level:0,category:"Technical",sector:"skills",developingHabit:""});}} className="w-full"><Plus size={15}/>Add Skill</Btn>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><AlertTriangle size={16} className="text-[#333]"/>Weaknesses <span className="text-[#333] font-normal">— Debt</span></h2>
            <div className="space-y-3 mb-5">
              {weaknesses.length===0&&<p className="text-[#2a2a2a] text-sm text-center py-4">No weaknesses logged.</p>}
              {weaknesses.map(w=>(
                <div key={w.id} className="bg-red-950/5 border border-red-950/20 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div><p className="font-medium text-[#ccc] text-sm">{w.name}</p><p className="text-xs text-[#333]">{w.category} · {DEBT_SEVERITY[w.severity]}</p></div>
                    <div className="flex gap-2">
                      <span className="text-xs font-bold text-red-800 bg-red-950/30 px-2 py-1 rounded-lg">−{(w.severity+1)*8}pts</span>
                      <button onClick={()=>{if(w.severity>0){setWeaknesses(p=>p.map(x=>x.id===w.id?{...x,severity:x.severity-1}:x));execute(`Improved: ${w.name}`,1.5,"debt");}else{setWeaknesses(p=>p.filter(x=>x.id!==w.id));execute(`✅ Overcame: ${w.name}`,3,"debt");}}} className="text-[10px] bg-green-950/20 border border-green-900/30 px-2 py-1 rounded-lg text-green-700 hover:text-green-500 transition-all">Improve</button>
                      <button onClick={()=>setWeaknesses(p=>p.filter(x=>x.id!==w.id))} className="text-[#222] hover:text-red-600"><X size={13}/></button>
                    </div>
                  </div>
                  <div className="flex gap-1">{DEBT_SEVERITY.map((_,i)=><div key={i} className={`flex-1 h-1 rounded-full ${i<=w.severity?"bg-red-900":"bg-[#141414]"}`}/>)}</div>
                  {w.plan&&<p className="text-[10px] text-[#2a2a2a] mt-2">📋 {w.plan}</p>}
                </div>
              ))}
            </div>
            <div className="border-t border-[#141414] pt-4 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Input value={newDebt.name} onChange={e=>setNewDebt(p=>({...p,name:e.target.value}))} placeholder="Weakness name" className="flex-1 min-w-32"/>
                <select value={newDebt.category} onChange={e=>setNewDebt(p=>({...p,category:e.target.value}))} className="bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-xs text-[#888] focus:outline-none">
                  {["Mental","Social","Physical","Academic","Financial","Emotional"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <select value={newDebt.severity} onChange={e=>setNewDebt(p=>({...p,severity:parseInt(e.target.value)}))} className="flex-1 bg-[#0e0e0e] border border-[#1e1e1e] rounded-xl px-3 py-2.5 text-sm text-[#888] focus:outline-none">
                  {DEBT_SEVERITY.map((l,i)=><option key={l} value={i}>{l}</option>)}
                </select>
                <Input value={newDebt.plan} onChange={e=>setNewDebt(p=>({...p,plan:e.target.value}))} placeholder="Improvement plan" className="flex-1"/>
              </div>
              <Btn variant="ghost" onClick={()=>{if(!newDebt.name.trim()) return;setWeaknesses(p=>[...p,{...newDebt,id:uid()}]);execute(`⚠️ Debt: ${newDebt.name}`,-(newDebt.severity+1)*1.5,"debt");setNewDebt({name:"",severity:0,category:"Mental",plan:""});}} className="w-full"><Plus size={15}/>Log Weakness</Btn>
            </div>
          </Card>

          {/* Goals as IPOs */}
          <Card>
            <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><Target size={16} className="text-[#333]"/>Goals <span className="text-[#333] font-normal">— Pending IPOs</span></h2>
            <div className="space-y-2 mb-4">
              {goals.map(g=>(
                <div key={g.id} className={`border rounded-xl px-4 py-3 flex items-center justify-between ${g.achieved?"border-green-900/20 bg-green-950/5":"border-[#141414] bg-[#0a0a0a]"}`}>
                  <div><p className="text-sm text-[#ccc]">{g.title}</p><p className="text-xs text-[#333]">{g.sector} · +{g.reward}% on achievement</p></div>
                  <div className="flex gap-2">
                    {!g.achieved&&<button onClick={()=>{setGoals(p=>p.map(x=>x.id===g.id?{...x,achieved:true}:x));execute(`🏆 IPO Listed: ${g.title}`,g.reward,"goal");}} className="text-[10px] bg-[#111] border border-[#1e1e1e] px-3 py-1.5 rounded-lg text-[#555] hover:text-green-500 hover:border-green-900 transition-all">Achieve 🚀</button>}
                    {g.achieved&&<span className="text-xs text-green-700">✓ Listed</span>}
                    <button onClick={()=>setGoals(p=>p.filter(x=>x.id!==g.id))} className="text-[#222] hover:text-red-600"><X size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap border-t border-[#141414] pt-4">
              <Input value={newGoal.title} onChange={e=>setNewGoal(p=>({...p,title:e.target.value}))} placeholder="Goal title" className="flex-1 min-w-32"/>
              <Input type="number" value={newGoal.reward} onChange={e=>setNewGoal(p=>({...p,reward:parseFloat(e.target.value)||0}))} placeholder="% reward" className="w-20 font-mono"/>
              <Btn onClick={()=>{if(!newGoal.title.trim()) return;setGoals(p=>[...p,{...newGoal,id:uid(),achieved:false}]);setNewGoal({title:"",target:"",sector:"academics",reward:0});}}><Plus size={15}/></Btn>
            </div>
          </Card>
        </>)}

        {/* ── PHASES ─── */}
        {view==="phases" && (<>
          {phases.map(ph=>(
            <div key={ph.id} className={`${C.card} border rounded-2xl p-5`} style={{borderColor:ph.color+"20"}}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2"><span className="text-xl">{ph.emoji}</span>
                  <div><p className="font-semibold text-[#ccc]">{ph.name}</p><p className="text-xs text-[#333]">{ph.start} → {ph.end||"Ongoing"}</p></div>
                  <span className="text-xs px-2 py-0.5 rounded-lg" style={{backgroundColor:ph.color+"15",color:ph.color}}>{TREND_OPTIONS.find(t=>t.value===ph.trend)?.label?.split(" ").slice(1).join(" ")||"Flat"}</span>
                </div>
                <button onClick={()=>setPhases(p=>p.filter(x=>x.id!==ph.id))} className="text-[#222] hover:text-red-600"><Trash2 size={14}/></button>
              </div>
              {ph.desc&&<p className="text-sm text-[#444] leading-relaxed mt-3 border-t border-[#141414] pt-3">{ph.desc}</p>}
            </div>
          ))}
          {phases.length===0&&<p className="text-[#2a2a2a] text-sm text-center py-10">No phases yet.</p>}
          <Card><p className="font-semibold text-[#ccc] text-sm mb-4">Add Phase</p><PhaseForm onAdd={ph=>setPhases(p=>[...p,ph])}/></Card>
        </>)}

        {/* ── SETTINGS (dedicated tab) ─── */}
        {view==="settings" && (
          <div className="space-y-4">
            <Card>
              <h2 className="font-semibold text-[#e8e8e8] text-sm mb-4 flex items-center gap-2"><Settings size={15} className="text-[#333]"/>Profile</h2>
              {[["Name",config.name],["Ticker",`${ticker}`],["Country",config.country],["Currency",`${curr} · ${CURRENCIES[config.country]?.code}`],["IPO Price",`${curr}${fmt(config.startPrice)}`],["Date of Birth",config.dob||"—"]].map(([k,v])=>(
                <div key={k} className="flex justify-between items-center py-3 border-b border-[#111] last:border-0">
                  <span className="text-sm text-[#333]">{k}</span><span className="text-sm text-[#777]">{v}</span>
                </div>
              ))}
            </Card>
            <Card>
              <h2 className="font-semibold text-[#e8e8e8] text-sm mb-1 flex items-center gap-2"><Download size={15} className="text-[#333]"/>Export Data</h2>
              <p className="text-xs text-[#333] mb-4">Download a full backup of your index, habits, phases, skills, press releases and more as a JSON file.</p>
              <Btn variant="ghost" className="w-full" onClick={()=>{
                const blob=new Blob([JSON.stringify({config,chartData,orderBook,habits,phases,skills,weaknesses,pressReleases,moodLog,goals,timeCapsules,exportDate:new Date().toISOString(),version:"3.0"},null,2)],{type:"application/json"});
                const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`mylife-index-${today()}.json`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
              }}><Download size={15}/>Export All Data as JSON</Btn>
            </Card>
            <Card>
              <h2 className="font-semibold text-[#e8e8e8] text-sm mb-1 flex items-center gap-2"><Upload size={15} className="text-[#333]"/>Import Data</h2>
              <p className="text-xs text-[#333] mb-4">Restore from a previously exported JSON backup. This will overwrite your current data.</p>
              <label className="w-full px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 bg-[#161616] border border-[#1e1e1e] text-[#888] hover:bg-[#1a1a1a] hover:text-[#e8e8e8] cursor-pointer">
                <Upload size={15}/>Choose Backup File (.json)
                <input type="file" accept=".json" className="hidden" onChange={e=>{
                  const f=e.target.files[0]; if(!f) return;
                  const r=new FileReader();
                  r.onload=ev=>{
                    try {
                      const d=JSON.parse(ev.target.result);
                      let imported = { chart: null, orders: null, habits: null, phases: null, format: "unknown" };

                      // ── Detect OLD Nikshep Life Index format ──────────────
                      // Old app saved as: { lifeIndex, chartData, orderBook, habits, majorEventUsed, timestamp }
                      if (d.chartData && d.orderBook !== undefined && !d.version) {
                        imported.format = "nikshep-v1";

                        // Convert chartData: old = [{date, value, timestamp}] — same shape, just remap
                        if (Array.isArray(d.chartData)) {
                          imported.chart = d.chartData.map(p => ({
                            date: p.date,
                            value: parseFloat(p.value),
                            timestamp: p.timestamp || new Date(p.date).getTime()
                          }));
                        }

                        // Convert orderBook: old = [{id, time, date, description, change, newIndex}]
                        // New format uses "desc" not "description"
                        if (Array.isArray(d.orderBook)) {
                          imported.orders = d.orderBook.map(o => ({
                            id: o.id || uid(),
                            time: o.time || "00:00:00",
                            date: o.date || today(),
                            desc: o.description || o.desc || "Imported entry",
                            change: parseFloat(o.change) || 0,
                            newIndex: o.newIndex || o.description,
                            tag: "imported"
                          }));
                        }

                        // Convert habits: old = [{id, name, impacts:[...], tiers:[...], type, failurePenalty}]
                        // New format uses single impact value + emoji
                        if (Array.isArray(d.habits)) {
                          const converted = [];
                          d.habits.forEach(h => {
                            // Multi-tier old habits → one new habit per tier
                            if (Array.isArray(h.impacts) && h.impacts.length > 0) {
                              h.impacts.forEach((imp, i) => {
                                const tierName = Array.isArray(h.tiers) && h.tiers[i] ? ` (${h.tiers[i]})` : "";
                                const impact = parseFloat(imp) || 0;
                                converted.push({
                                  id: uid(),
                                  name: `${h.name}${tierName}`,
                                  impact,
                                  type: impact >= 0 ? "positive" : "negative",
                                  emoji: impact >= 0 ? "✅" : "❌",
                                  sector: "health"
                                });
                              });
                              // Also add failure penalty as a separate habit if it exists
                              if (h.failurePenalty !== null && h.failurePenalty !== undefined) {
                                converted.push({
                                  id: uid(),
                                  name: `${h.name} (Failed)`,
                                  impact: parseFloat(h.failurePenalty) || 0,
                                  type: "negative",
                                  emoji: "❌",
                                  sector: "health"
                                });
                              }
                            } else {
                              // Already flat format
                              const impact = parseFloat(h.impact) || 0;
                              converted.push({
                                id: h.id || uid(),
                                name: h.name || "Unnamed",
                                impact,
                                type: impact >= 0 ? "positive" : "negative",
                                emoji: impact >= 0 ? "✅" : "❌",
                                sector: "health"
                              });
                            }
                          });
                          imported.habits = converted;
                        }
                      }

                      // ── Detect NEW MyLife Index format (v2/v3) ────────────
                      else if (d.version || (d.chartData && d.habits && d.phases !== undefined)) {
                        imported.format = "mylife-v2";
                        imported.chart   = d.chartData   || null;
                        imported.orders  = d.orderBook   || null;
                        imported.habits  = d.habits      || null;
                        imported.phases  = d.phases      || null;
                      }

                      // ── Apply what we found ───────────────────────────────
                      let count = 0;
                      if (imported.chart && imported.chart.length) {
                        // sanitise every data point
                        setChartData(imported.chart.map(p => ({
                          ...p,
                          value: isNaN(parseFloat(p.value)) ? 500 : parseFloat(p.value),
                          timestamp: p.timestamp || new Date(p.date).getTime()
                        })));
                        count++;
                      }
                      if (imported.orders && imported.orders.length) {
                        // sanitise every order — coerce change & newIndex to numbers
                        setOrderBook(imported.orders.map(o => ({
                          ...o,
                          desc: o.desc || o.description || "Imported entry",
                          change: isNaN(parseFloat(o.change)) ? 0 : parseFloat(o.change),
                          newIndex: isNaN(parseFloat(o.newIndex)) ? "" : parseFloat(o.newIndex).toFixed(2),
                        })));
                        count++;
                      }
                      if (imported.habits  && imported.habits.length)  { setHabits(imported.habits);     count++; }
                      if (imported.phases  && imported.phases.length)  { setPhases(imported.phases);     count++; }
                      if (d.skills)         setSkills(d.skills);
                      if (d.weaknesses)     setWeaknesses(d.weaknesses);
                      if (d.pressReleases)  setPressReleases(d.pressReleases);
                      if (d.moodLog)        setMoodLog(d.moodLog);
                      if (d.goals)          setGoals(d.goals);
                      if (d.timeCapsules)   setTimeCapsules(d.timeCapsules);

                      if (count === 0) {
                        alert("⚠️ File was read but no recognisable data was found. Make sure it's a Nikshep Life or MyLife Index export.");
                      } else {
                        alert(`✅ Migrated successfully from ${imported.format === "nikshep-v1" ? "Nikshep Life Index (old format)" : "MyLife Index"}!\n\n• Chart history: ${imported.chart?.length || 0} data points\n• Order book: ${imported.orders?.length || 0} transactions\n• Habits: ${imported.habits?.length || 0} habits\n• Phases: ${imported.phases?.length || 0} phases`);
                      }
                    } catch(err) {
                      alert("❌ Could not read file. Make sure it's a valid JSON export from Nikshep Life or MyLife Index.");
                      console.error(err);
                    }
                  };
                  r.readAsText(f); e.target.value="";
                }}/>
              </label>
              <div className="mt-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
                <p className="text-xs text-[#444] font-medium mb-2">📦 Supported import formats</p>
                <div className="space-y-1.5">
                  {[["Nikshep Life Index (old)","Auto-detected & converted","text-green-700"],["MyLife Index v2/v3","Native format — full restore","text-green-700"],].map(([name,desc,c])=>(
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-xs text-[#555]">{name}</span>
                      <span className={`text-[10px] ${c}`}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold text-[#e8e8e8] text-sm mb-1 flex items-center gap-2"><AlertTriangle size={15} className="text-red-900"/>Danger Zone</h2>
              <p className="text-xs text-[#333] mb-4">Permanently delete all your data and start from scratch. This cannot be undone.</p>
              <Btn variant="danger" className="w-full" onClick={()=>{if(window.confirm("This will permanently delete ALL your data. Are you absolutely sure?")){"mli_chart3 mli_orders3 mli_habits3 mli_phases3 mli_skills3 mli_debts3 mli_press3 mli_mood mli_goals mli_ach mli_capsules mli_config3 mli_sectors".split(" ").forEach(k=>localStorage.removeItem(k));onReset();}}}>
                <Trash2 size={15}/>Reset Everything
              </Btn>
            </Card>
          </div>
        )}

        {/* ── MORE ─── */}
        {view==="more" && (<>
          <div className="flex gap-2 flex-wrap mb-2">
            {[["heatmap","📅 Heatmap"],["achievements","🏆 Achievements"],["capsule","⏰ Time Capsule"],["settings","⚙️ Settings"]].map(([id,l])=>(
              <button key={id} onClick={()=>setMoreTab(id)} className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${moreTab===id?"bg-[#e8e8e8] text-[#080808] border-[#e8e8e8]":"bg-[#0e0e0e] text-[#444] border-[#1e1e1e] hover:border-[#333]"}`}>{l}</button>
            ))}
          </div>

          {moreTab==="heatmap" && (
            <Card>
              <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><Calendar size={16} className="text-[#333]"/>Activity Heatmap {new Date().getFullYear()}</h2>
              <Heatmap orderBook={orderBook}/>
            </Card>
          )}

          {moreTab==="achievements" && (
            <Card>
              <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><Award size={16} className="text-[#333]"/>Achievements</h2>
              <div className="grid grid-cols-2 gap-3">
                {ACHIEVEMENTS.map(a=>{
                  const unlocked=unlockedAch.includes(a.id);
                  return (
                    <div key={a.id} className={`border rounded-xl p-4 transition-all ${unlocked?"border-[#2a2a2a] bg-[#0e0e0e]":"border-[#141414] bg-[#0a0a0a] opacity-40"}`}>
                      <div className="text-2xl mb-2">{unlocked?a.icon:"🔒"}</div>
                      <p className="text-xs font-semibold text-[#ccc]">{a.title}</p>
                      <p className="text-[10px] text-[#333] mt-1">{a.desc}</p>
                      {unlocked&&<p className="text-[10px] text-green-700 mt-2">✓ Unlocked</p>}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {moreTab==="capsule" && (<>
            <Card>
              <h2 className="font-semibold text-[#e8e8e8] text-sm flex items-center gap-2 mb-4"><Moon size={16} className="text-[#333]"/>Time Capsule</h2>
              <p className="text-xs text-[#333] mb-4">Write a message to your future self. It unlocks on the date you choose.</p>
              <div className="space-y-3">
                <Textarea value={capsule.message} onChange={e=>setCapsule(p=>({...p,message:e.target.value}))} placeholder="Dear future me..." className="w-full h-28"/>
                <Input type="date" min={today()} value={capsule.unlockDate} onChange={e=>setCapsule(p=>({...p,unlockDate:e.target.value}))} className="w-full"/>
                <Btn onClick={()=>{if(!capsule.message.trim()||!capsule.unlockDate) return;setTimeCapsules(p=>[...p,{...capsule,id:uid(),createdDate:today(),opened:false}]);setCapsule({message:"",unlockDate:""}); }} disabled={!capsule.message.trim()||!capsule.unlockDate} className={`w-full ${!capsule.message.trim()||!capsule.unlockDate?"opacity-30":""}`}><Moon size={15}/>Seal Capsule</Btn>
              </div>
            </Card>
            {timeCapsules.map(c=>(
              <div key={c.id} className={`border rounded-2xl p-4 ${c.opened?"border-[#141414] opacity-40":"border-[#1e1e1e]"} bg-[#0a0a0a]`}>
                <div className="flex justify-between items-start">
                  <div><p className="text-xs text-[#444]">Unlocks: {c.unlockDate}</p><p className="text-xs text-[#2a2a2a]">Written: {c.createdDate}</p></div>
                  <button onClick={()=>setTimeCapsules(p=>p.filter(x=>x.id!==c.id))} className="text-[#222] hover:text-red-600"><X size={13}/></button>
                </div>
                {(c.opened||c.unlockDate<=today())?<p className="text-sm text-[#666] mt-3 leading-relaxed">{c.message}</p>:<p className="text-xs text-[#222] mt-3">🔒 Sealed until {c.unlockDate}</p>}
              </div>
            ))}
          </>)}

          {moreTab==="settings" && (
            <div className="space-y-4">
              <Card>
                <h2 className="font-semibold text-[#e8e8e8] text-sm mb-4">Profile</h2>
                {[["Name",config.name],["Ticker",`$${ticker}`],["Country",config.country],["Currency",`${curr} · ${CURRENCIES[config.country]?.code}`],["IPO Price",`${curr}${fmt(config.startPrice)}`]].map(([k,v])=>(
                  <div key={k} className="flex justify-between items-center py-3 border-b border-[#111] last:border-0">
                    <span className="text-sm text-[#333]">{k}</span><span className="text-sm text-[#888]">{v}</span>
                  </div>
                ))}
              </Card>
              <Card>
                <h2 className="font-semibold text-[#e8e8e8] text-sm mb-4">Data</h2>
                <div className="space-y-2">
                  <Btn variant="ghost" className="w-full" onClick={()=>{
                    const blob=new Blob([JSON.stringify({config,chartData,orderBook,habits,phases,skills,weaknesses,pressReleases,moodLog,goals,timeCapsules},null,2)],{type:"application/json"});
                    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`mylife-index-${today()}.json`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
                  }}><Download size={15}/>Export All Data</Btn>
                  <label className={`w-full px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 bg-[#161616] border border-[#1e1e1e] text-[#888] hover:bg-[#1a1a1a] hover:text-[#e8e8e8] cursor-pointer`}>
                    <Upload size={15}/>Import Data
                    <input type="file" accept=".json" className="hidden" onChange={e=>{
                      const f=e.target.files[0];if(!f) return;
                      const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.chartData)setChartData(d.chartData);if(d.habits)setHabits(d.habits);if(d.phases)setPhases(d.phases);if(d.skills)setSkills(d.skills);if(d.weaknesses)setWeaknesses(d.weaknesses);if(d.pressReleases)setPressReleases(d.pressReleases);if(d.orderBook)setOrderBook(d.orderBook);if(d.moodLog)setMoodLog(d.moodLog);if(d.goals)setGoals(d.goals);alert("Imported!");}catch{alert("Invalid file.");}};r.readAsText(f);e.target.value="";
                    }}/>
                  </label>
                  <Btn variant="danger" className="w-full" onClick={()=>{if(window.confirm("Reset ALL data?")){"mli_chart3 mli_orders3 mli_habits3 mli_phases3 mli_skills3 mli_debts3 mli_press3 mli_mood mli_goals mli_ach mli_capsules mli_config3 mli_sectors".split(" ").forEach(k=>localStorage.removeItem(k));onReset();}}}>Reset Everything</Btn>
                </div>
              </Card>
            </div>
          )}
        </>)}

      </div>
    </div>
  );
};

export default function App() {
  const [config,setConfig]=useState(()=>load("mli_config3",null));
  const [key,setKey]=useState(0);
  const [importing,setImporting]=useState(false);

  const finish=p=>{save("mli_config3",p);setConfig(p);};
  const reset=()=>{setConfig(null);setKey(k=>k+1);};

  const handleDirectImport = (e) => {
    const f = e.target.files[0]; if(!f) return;
    setImporting(true);
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);

        // pull config from export or reconstruct from old nikshep format
        let cfg = d.config || null;
        if (!cfg && d.lifeIndex !== undefined) {
          // old Nikshep Life format — build a minimal config
          cfg = {
            name: "Imported User",
            ticker: "USER",
            country: "Other",
            startPrice: d.chartData?.[0]?.value || 500,
            dob: "",
            phases: [],
            habits: [],
          };
        }
        if (!cfg) { alert("❌ Could not find profile data in this file."); setImporting(false); return; }

        // save config
        save("mli_config3", cfg);

        // migrate chart
        if (Array.isArray(d.chartData)) {
          save("mli_chart3", d.chartData.map(p => ({
            ...p,
            value: isNaN(parseFloat(p.value)) ? 500 : parseFloat(p.value),
            timestamp: p.timestamp || new Date(p.date).getTime()
          })));
        }

        // migrate orderBook
        if (Array.isArray(d.orderBook)) {
          save("mli_orders3", d.orderBook.map(o => ({
            ...o,
            desc: o.desc || o.description || "Imported entry",
            change: isNaN(parseFloat(o.change)) ? 0 : parseFloat(o.change),
            newIndex: isNaN(parseFloat(o.newIndex)) ? "" : parseFloat(o.newIndex).toFixed(2),
          })));
        }

        // migrate habits — handle old multi-tier format
        if (Array.isArray(d.habits)) {
          const converted = [];
          d.habits.forEach(h => {
            if (Array.isArray(h.impacts) && h.impacts.length > 0) {
              h.impacts.forEach((imp, i) => {
                const tierName = Array.isArray(h.tiers) && h.tiers[i] ? ` (${h.tiers[i]})` : "";
                const impact = parseFloat(imp) || 0;
                converted.push({ id: uid(), name: `${h.name}${tierName}`, impact, type: impact>=0?"positive":"negative", emoji: impact>=0?"✅":"❌", sector: classifyHabit(h.name) });
              });
              if (h.failurePenalty != null) {
                const fp = parseFloat(h.failurePenalty) || 0;
                converted.push({ id: uid(), name: `${h.name} (Failed)`, impact: fp, type:"negative", emoji:"❌", sector: classifyHabit(h.name) });
              }
            } else {
              const impact = parseFloat(h.impact) || 0;
              converted.push({ id: h.id||uid(), name: h.name||"Unnamed", impact, type: impact>=0?"positive":"negative", emoji: impact>=0?"✅":"❌", sector: classifyHabit(h.name) });
            }
          });
          save("mli_habits3", converted);
        }

        // migrate rest
        if (d.phases)        save("mli_phases3",    d.phases);
        if (d.skills)        save("mli_skills3",    d.skills);
        if (d.weaknesses)    save("mli_debts3",     d.weaknesses);
        if (d.pressReleases) save("mli_press3",     d.pressReleases);
        if (d.moodLog)       save("mli_mood",       d.moodLog);
        if (d.goals)         save("mli_goals",      d.goals);
        if (d.timeCapsules)  save("mli_capsules",   d.timeCapsules);

        setConfig(cfg);
        setKey(k=>k+1);
      } catch(err) {
        alert("❌ Could not read file. Make sure it's a valid JSON export from Nikshep Life or MyLife Index.");
        console.error(err);
      }
      setImporting(false);
    };
    r.readAsText(f);
    e.target.value="";
  };

  if (!config) return (
    <>
      <Onboarding key={key} onComplete={finish}/>
      {/* floating import button on welcome screen */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 px-6">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl px-5 py-4 flex flex-col items-center gap-3 shadow-2xl w-full max-w-sm">
          <p className="text-xs text-[#444] text-center">Already have a backup? Skip onboarding.</p>
          <label className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#2a2a2a] bg-[#161616] text-[#888] hover:text-[#ccc] hover:border-[#333] text-sm font-medium transition-all cursor-pointer ${importing?"opacity-50 cursor-wait":""}`}>
            <Upload size={16}/>{importing ? "Importing…" : "Import & Restore Backup"}
            <input type="file" accept=".json" className="hidden" onChange={handleDirectImport} disabled={importing}/>
          </label>
        </div>
      </div>
    </>
  );

  return <Dashboard key={config.name+key} config={config} onReset={reset}/>;
}
