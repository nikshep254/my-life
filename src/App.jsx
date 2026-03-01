import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";
import { Activity, Plus, Trash2, Send, ChevronRight, ChevronLeft, Check, X, Download, Upload, BarChart2, BookOpen, Settings, Zap, Newspaper, Star, AlertTriangle, Brain, Target, Calendar, Award, Flame, Moon, Layers, LogOut } from "lucide-react";

// ── Firebase loader ───────────────────────────────────────────────────────────
const loadFirebase = () => new Promise((resolve, reject) => {
  if (window.__firebaseReady) { resolve(window.__fb); return; }
  const s = document.createElement("script");
  s.type = "module";
  s.textContent = `
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
    const firebaseConfig = {
      apiKey: "AIzaSyBuPTw6WpRTWSDhs_L_W9OELFP6ff6Ki0c",
      authDomain: "copiumai-9f5b6.firebaseapp.com",
      projectId: "copiumai-9f5b6",
      storageBucket: "copiumai-9f5b6.firebasestorage.app",
      messagingSenderId: "164793994267",
      appId: "1:164793994267:web:f9d3594cca736c7fa67cbe"
    };
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    window.__fb = { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc };
    window.__firebaseReady = true;
    window.dispatchEvent(new Event("firebaseReady"));
  `;
  document.head.appendChild(s);
  window.addEventListener("firebaseReady", () => resolve(window.__fb), { once: true });
  setTimeout(() => reject(new Error("Firebase timeout")), 10000);
});

// ── utils ─────────────────────────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const fmt  = (n, d = 2) => parseFloat(n).toFixed(d);
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } };

const CURRENCIES = {
  "United States":{ symbol:"$",code:"USD" },"India":{ symbol:"₹",code:"INR" },
  "United Kingdom":{ symbol:"£",code:"GBP" },"European Union":{ symbol:"€",code:"EUR" },
  "Japan":{ symbol:"¥",code:"JPY" },"Australia":{ symbol:"A$",code:"AUD" },
  "Canada":{ symbol:"C$",code:"CAD" },"Brazil":{ symbol:"R$",code:"BRL" },
  "Singapore":{ symbol:"S$",code:"SGD" },"UAE":{ symbol:"د.إ",code:"AED" },
  "Other":{ symbol:"$",code:"USD" },
};
const SECTORS = [
  { id:"health",   label:"Health",    emoji:"💪", color:"#34d399" },
  { id:"academics",label:"Academics", emoji:"📚", color:"#60a5fa" },
  { id:"social",   label:"Social",    emoji:"👥", color:"#f59e0b" },
  { id:"mental",   label:"Mental",    emoji:"🧠", color:"#c084fc" },
  { id:"skills",   label:"Skills",    emoji:"⚡", color:"#fb923c" },
];
const TREND_OPTIONS = [
  { label:"Skyrocketing 🚀", value:2.5 },{ label:"Growing 📈", value:1.2 },
  { label:"Flat ➡️", value:0 },{ label:"Declining 📉", value:-1.2 },
  { label:"Crashing 🔻", value:-2.5 },
];
const EMOJIS = ["📅","🏫","🎓","💼","❤️","🌍","🏠","⚡","🌱","🔥","🏆","💔","🎯","🌙","⛈️"];
const COLORS = ["#a3a3a3","#60a5fa","#34d399","#f59e0b","#f87171","#c084fc","#fb923c","#e2e8f0"];
const SKILL_LEVELS  = ["Beginner","Developing","Proficient","Advanced","Expert"];
const DEBT_SEVERITY = ["Minor","Moderate","Significant","Critical"];
const MOOD_LABELS   = ["😞","😕","😐","🙂","😊","😄","🤩"];
const ACHIEVEMENTS  = [
  { id:"first_log",  icon:"🌱", title:"First Step",      desc:"Log your first habit",     check:(o)=>o.length>=1 },
  { id:"streak_7",   icon:"🔥", title:"Week Warrior",    desc:"7-day streak",              check:(_,__,s)=>s>=7 },
  { id:"streak_30",  icon:"🏆", title:"Iron Discipline", desc:"30-day streak",             check:(_,__,s)=>s>=30 },
  { id:"index_1000", icon:"💎", title:"Four Figures",    desc:"Index crosses 1000",        check:(_,i)=>i>=1000 },
  { id:"index_500",  icon:"⭐", title:"Milestone 500",   desc:"Index crosses 500",         check:(_,i)=>i>=500 },
  { id:"press_5",    icon:"📰", title:"Journalist",      desc:"5 press releases",          check:(_,__,___,pr)=>pr>=5 },
  { id:"skills_5",   icon:"🧪", title:"Renaissance",     desc:"Add 5 skills",              check:(_,__,___,____,sk)=>sk>=5 },
  { id:"overcome",   icon:"💪", title:"Debt Free",       desc:"Overcome a weakness",       check:(_,__,___,____,_____,ow)=>ow>=1 },
];

// ── classify habit ────────────────────────────────────────────────────────────
const classifyHabit = (name) => {
  const n = name.toLowerCase();
  if (/(study|exam|homework|read|book|math|science|class|course|learn|revision|notes|school|college|tutor|academic|physics|chemistry|biology|history|english|assignment)/.test(n)) return "academics";
  if (/(exercise|gym|run|walk|yoga|sport|swim|cycle|skipping|workout|fitness|sleep|water|diet|eat|food|junk|meal|health|doctor|medicine|steps|cardio|stretch|meditat)/.test(n)) return "health";
  if (/(friend|social|talk|call|meet|family|party|event|hang|connect|network|people|relationship|date|chat|message|community)/.test(n)) return "social";
  if (/(meditat|journal|reflect|gratitude|mental|stress|anxiety|mood|therapy|breathe|mindful|emotion|relax|calm|focus|think|pray|puja|prayer)/.test(n)) return "mental";
  if (/(code|program|design|build|project|skill|practice|draw|paint|music|instrument|write|blog|create|craft|develop|tool|language|chess|hobby)/.test(n)) return "skills";
  return "health";
};

// ── chart generation ──────────────────────────────────────────────────────────
const generateFromPhases = (phases, startPrice, dob) => {
  const data = [];
  const sorted = [...(phases||[])].filter(p=>p.start).sort((a,b)=>a.start.localeCompare(b.start));
  const birthDate = dob ? new Date(dob) : new Date("2008-01-01");
  const now = new Date();
  if (!sorted.length) {
    let v=startPrice, d=new Date(birthDate);
    while (d<=now) {
      const age=(d-birthDate)/(365.25*86400000);
      const trend=age<5?0.05:age<10?0.08:age<13?0.02:age<15?-0.05:age<17?0.04:0.06;
      v=Math.max(10,v+trend+(Math.random()-0.5)*2);
      data.push({date:d.toISOString().split("T")[0],value:parseFloat(v.toFixed(2)),timestamp:d.getTime()});
      d.setDate(d.getDate()+1);
    }
    return data;
  }
  const firstStart = new Date(sorted[0].start);
  if (birthDate < firstStart) {
    let v=startPrice, d=new Date(birthDate);
    while (d<firstStart) {
      const age=(d-birthDate)/(365.25*86400000);
      const trend=age<10?0.06:age<13?0.02:-0.04;
      v=Math.max(10,v+trend+(Math.random()-0.5)*1.5);
      data.push({date:d.toISOString().split("T")[0],value:parseFloat(v.toFixed(2)),timestamp:d.getTime()});
      d.setDate(d.getDate()+1);
    }
  }
  sorted.forEach((ph,pi)=>{
    const start=new Date(ph.start), end=ph.end?new Date(ph.end):(sorted[pi+1]?new Date(sorted[pi+1].start):now);
    let v=data.length?data[data.length-1].value:startPrice, d=new Date(start);
    while (d<=end) {
      v=Math.max(10,v+(ph.trend||0)+(Math.random()-0.5)*3);
      data.push({date:d.toISOString().split("T")[0],value:parseFloat(v.toFixed(2)),timestamp:d.getTime()});
      d.setDate(d.getDate()+1);
    }
  });
  return data;
};

// ── design system — BRIGHTENED ────────────────────────────────────────────────
// bg layers
const BG   = "bg-[#080808]";
const CARD = "bg-[#111]";
const CARD2= "bg-[#161616]";
const BORD = "border-[#2a2a2a]";
const BORD2= "border-[#222]";
// text
const TX1  = "text-[#f0f0f0]";   // headings / primary
const TX2  = "text-[#c0c0c0]";   // body
const TX3  = "text-[#888]";      // secondary / labels
const TX4  = "text-[#666]";      // meta / timestamps
const TX5  = "text-[#444]";      // very subtle (dividers, faint)
// input
const INP  = `bg-[#111] border-[#2a2a2a]`;

const Card = ({children,className=""}) => <div className={`${CARD} border ${BORD} rounded-2xl p-5 ${className}`}>{children}</div>;
const Input = ({className="",...p}) => <input className={`${INP} border rounded-xl px-4 py-2.5 ${TX2} placeholder-[#555] focus:outline-none focus:border-[#444] text-sm transition-all ${className}`} {...p}/>;
const Textarea = ({className="",...p}) => <textarea className={`${INP} border rounded-xl px-4 py-2.5 ${TX2} placeholder-[#555] focus:outline-none focus:border-[#444] text-sm resize-none transition-all ${className}`} {...p}/>;
const Sel = ({className="",...p}) => <select className={`${INP} border rounded-xl px-3 py-2.5 text-sm ${TX2} focus:outline-none focus:border-[#444] ${className}`} {...p}/>;
const Btn = ({children,variant="primary",className="",...p}) => {
  const v={
    primary:`bg-[#e8e8e8] text-[#080808] hover:bg-[#d4d4d4]`,
    ghost:`bg-[#181818] border ${BORD} ${TX3} hover:bg-[#1e1e1e] hover:${TX2}`,
    danger:`bg-[#1c0a0a] border border-[#3d1212] text-[#f87171] hover:bg-[#220d0d]`,
    success:`bg-[#0a1c12] border border-[#1a4d30] text-[#4ade80] hover:bg-[#0d2218]`,
  };
  return <button className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${v[variant]} ${className}`} {...p}>{children}</button>;
};

// ── Builder Footer ────────────────────────────────────────────────────────────
const BuilderCard = () => (
  <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
    <div className="relative rounded-2xl p-px overflow-hidden"
      style={{background:"linear-gradient(135deg,#b8860b,#ffd700,#daa520,#f5c518,#b8860b)"}}>
      <div className="rounded-2xl bg-[#0d0c08] px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🥷</div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5"
              style={{background:"linear-gradient(90deg,#ffd700,#daa520,#f5c518)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              Builder
            </p>
            <p className="text-sm font-semibold text-[#e8d9a0]">Nikshep Doggalli</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <a href="https://instagram.com/nikkk.exe" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-[#b09050] hover:text-[#ffd700] transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            nikkk.exe
          </a>
          <a href="https://nikshep.vercel.app" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-[#b09050] hover:text-[#ffd700] transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            nikshep.vercel.app
          </a>
        </div>
      </div>
    </div>
  </div>
);

// ── Google Login ──────────────────────────────────────────────────────────────
const GoogleLoginScreen = ({ onLogin }) => {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      const fb = await loadFirebase();
      const result = await fb.signInWithPopup(fb.auth, fb.provider);
      onLogin(result.user);
    } catch(e) {
      setError(e.message?.includes("popup") ? "Popup blocked — allow popups and retry." : "Sign-in failed. Please try again.");
      setLoading(false);
    }
  };
  return (
    <div className={`min-h-screen ${BG} flex flex-col items-center justify-center p-6`}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className={`w-16 h-16 ${CARD} border ${BORD} rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl`}>📈</div>
          <h1 className={`text-3xl font-semibold ${TX1} tracking-tight`}>MyLife Index</h1>
          <p className={`${TX3} text-sm mt-2`}>Your life, quantified.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[["📊","Life as a Stock","Track every habit, event and emotion."],["🧠","AI Coach","Personalised insights from your real data."],["💎","Skills & Debt","Assets, weaknesses, goals on one sheet."],["🗂️","Life Phases","Map your chapters. Shape your chart."]].map(([e,t,d])=>(
            <div key={t} className={`${CARD2} border ${BORD2} rounded-2xl p-4`}>
              <p className="text-2xl mb-2">{e}</p>
              <p className={`${TX2} text-xs font-semibold`}>{t}</p>
              <p className={`${TX3} text-[10px] mt-1 leading-relaxed`}>{d}</p>
            </div>
          ))}
          <div className={`col-span-2 ${CARD2} border ${BORD2} rounded-2xl p-5`}>
            <p className={`${TX3} text-xs mb-4 text-center leading-relaxed`}>Your data is private and tied to your Google account.</p>
            <button onClick={handleGoogle} disabled={loading}
              className={`w-full flex items-center justify-center gap-3 ${CARD} border ${BORD} hover:border-[#3a3a3a] hover:bg-[#181818] ${TX2} rounded-xl py-3.5 font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-wait`}>
              {loading
                ? <span className="w-4 h-4 border border-[#666] border-t-[#ccc] rounded-full animate-spin"/>
                : <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              }
              {loading ? "Signing in…" : "Continue with Google"}
            </button>
            {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
          </div>
        </div>
        <p className={`text-center ${TX5} text-[10px]`}>By signing in you agree to keep it real 📈</p>
      </div>
      <BuilderCard/>
    </div>
  );
};

// ── Onboarding shell ──────────────────────────────────────────────────────────
const STEPS = ["Welcome","Profile","Country","Price","Life Story","Habits","Review"];
const Shell = ({step,children,onNext,onBack,nextLabel="Continue",nextDisabled=false}) => (
  <div className={`min-h-screen ${BG} flex flex-col items-center justify-center p-6`}>
    <div className="w-full max-w-lg">
      <div className="flex items-center justify-center gap-1.5 mb-10">
        {STEPS.map((_,i)=>(
          <div key={i} className="flex items-center">
            <div className={`rounded-full flex items-center justify-center text-[10px] font-bold transition-all
              ${i<step?`w-5 h-5 bg-[#e8e8e8] text-[#080808]`:i===step?`w-6 h-6 border border-[#666] text-[#aaa]`:`w-4 h-4 border border-[#333] text-[#555]`}`}>
              {i<step?<Check size={10}/>:i+1}
            </div>
            {i<STEPS.length-1&&<div className={`w-4 h-px mx-1 ${i<step?"bg-[#666]":"bg-[#222]"}`}/>}
          </div>
        ))}
      </div>
      <Card>
        {children}
        <div className="flex gap-3 mt-8">
          {step>0&&<Btn variant="ghost" onClick={onBack} className="flex-1"><ChevronLeft size={15}/>Back</Btn>}
          <Btn onClick={onNext} disabled={nextDisabled} className={`flex-1 ${nextDisabled?"opacity-30 cursor-not-allowed":""}`}>{nextLabel}<ChevronRight size={15}/></Btn>
        </div>
      </Card>
      <BuilderCard/>
    </div>
  </div>
);

const PhaseForm = ({onAdd}) => {
  const [d,setD]=useState({name:"",start:"",end:"",trend:0,emoji:"📅",color:"#a3a3a3",desc:""});
  const add=()=>{if(!d.name.trim()||!d.start)return;onAdd({...d,id:uid()});setD({name:"",start:"",end:"",trend:0,emoji:"📅",color:"#a3a3a3",desc:""});};
  return(
    <div className={`${BG} border border-[#222] rounded-xl p-4 space-y-2.5`}>
      <div className="flex gap-2">
        <Sel value={d.emoji} onChange={e=>setD(p=>({...p,emoji:e.target.value}))} className="w-14">{EMOJIS.map(em=><option key={em}>{em}</option>)}</Sel>
        <Input value={d.name} onChange={e=>setD(p=>({...p,name:e.target.value}))} placeholder="Phase name" className="flex-1"/>
      </div>
      <Textarea value={d.desc} onChange={e=>setD(p=>({...p,desc:e.target.value}))} placeholder="Describe this phase…" className="w-full h-14"/>
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={d.start} onChange={e=>setD(p=>({...p,start:e.target.value}))} className="w-full"/>
        <Input type="date" value={d.end} onChange={e=>setD(p=>({...p,end:e.target.value}))} className="w-full"/>
      </div>
      <div className="grid gap-1">
        {TREND_OPTIONS.map(t=>(
          <button key={t.value} onClick={()=>setD(p=>({...p,trend:t.value}))}
            className={`px-3 py-2 rounded-lg text-xs border text-left transition-all ${d.trend===t.value?"bg-[#e8e8e8] text-[#080808] border-[#e8e8e8]":`${TX3} border-[#222] hover:border-[#444] hover:${TX2}`}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">{COLORS.map(c=><button key={c} onClick={()=>setD(p=>({...p,color:c}))} className={`w-5 h-5 rounded-full border-2 transition-all ${d.color===c?"border-white scale-110":"border-transparent opacity-60"}`} style={{backgroundColor:c}}/>)}</div>
      <Btn onClick={add} disabled={!d.name.trim()||!d.start} className={`w-full ${!d.name.trim()||!d.start?"opacity-30":""}`}><Plus size={15}/>Add Phase</Btn>
    </div>
  );
};

const Onboarding = ({onComplete,user}) => {
  const [step,setStep]=useState(0);
  const [prof,setProf]=useState({name:user?.displayName||"",ticker:"",dob:""});
  const [loc,setLoc]=useState({country:""});
  const [price,setPrice]=useState({startPrice:500});
  const [story,setStory]=useState({phases:[]});
  const [hab,setHab]=useState({habits:[]});
  const n=()=>setStep(s=>s+1), b=()=>setStep(s=>s-1);
  const finish=()=>{const ticker=prof.ticker||prof.name.slice(0,4).toUpperCase();onComplete({...prof,ticker,...loc,...price,...story,...hab});};
  const DEFS=[{name:"Morning Exercise",impact:2,type:"positive",emoji:"🏃",sector:"health"},{name:"Study Session",impact:3,type:"positive",emoji:"📚",sector:"academics"},{name:"Meditation",impact:1.5,type:"positive",emoji:"🧘",sector:"mental"},{name:"Junk Food",impact:-2.5,type:"negative",emoji:"🍔",sector:"health"},{name:"Good Sleep",impact:1,type:"positive",emoji:"😴",sector:"health"}];

  if(step===0)return(<Shell step={0} onNext={n} nextLabel="Begin">
    <div className="text-center">
      {user?.photoURL&&<img src={user.photoURL} alt="" className="w-12 h-12 rounded-full mx-auto mb-4 border border-[#2a2a2a]"/>}
      <h2 className={`text-xl font-semibold ${TX1} mb-1`}>Welcome, {user?.displayName?.split(" ")[0]||"friend"}</h2>
      <p className={`${TX3} text-sm mb-6`}>Set up your personal life index. Takes ~2 minutes.</p>
      <div className="grid grid-cols-3 gap-3">
        {[["📊","Chart"],["🧠","Coach"],["💎","Assets"]].map(([e,l])=>(
          <div key={l} className={`${CARD2} border ${BORD2} rounded-xl p-4`}><div className="text-2xl mb-2">{e}</div><div className={`text-xs ${TX3}`}>{l}</div></div>
        ))}
      </div>
    </div>
  </Shell>);

  if(step===1)return(<Shell step={1} onNext={n} onBack={b} nextDisabled={!prof.name.trim()||!prof.dob}>
    <h2 className={`text-xl font-semibold ${TX1} mb-5`}>Your Profile</h2>
    <div className="space-y-4">
      {[["Full Name","text","e.g. Alex Johnson","name"],["Ticker (optional)","text","AUTO","ticker"]].map(([l,t,p,k])=>(
        <div key={k}><label className={`text-xs ${TX3} uppercase tracking-wider block mb-2`}>{l}</label>
          <Input type={t} placeholder={p} value={prof[k]} onChange={e=>setProf(x=>({...x,[k]:k==="ticker"?e.target.value.toUpperCase():e.target.value}))} className="w-full"/></div>
      ))}
      <div><label className={`text-xs ${TX3} uppercase tracking-wider block mb-2`}>Date of Birth</label>
        <Input type="date" max={today()} min="1950-01-01" value={prof.dob} onChange={e=>setProf(x=>({...x,dob:e.target.value}))} className="w-full"/></div>
    </div>
  </Shell>);

  if(step===2)return(<Shell step={2} onNext={n} onBack={b} nextDisabled={!loc.country}>
    <h2 className={`text-xl font-semibold ${TX1} mb-5`}>Country & Currency</h2>
    <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
      {Object.keys(CURRENCIES).map(c=>(
        <button key={c} onClick={()=>setLoc({country:c})}
          className={`py-3 px-4 rounded-xl text-sm text-left border transition-all ${loc.country===c?"bg-[#e8e8e8] text-[#080808] border-[#e8e8e8]":`${CARD2} ${TX2} border-[#2a2a2a] hover:border-[#444]`}`}>
          <span className="block font-medium">{c}</span>
          <span className={`text-xs font-mono ${loc.country===c?"text-black/50":TX4}`}>{CURRENCIES[c]?.code}</span>
        </button>
      ))}
    </div>
  </Shell>);

  if(step===3)return(<Shell step={3} onNext={n} onBack={b} nextDisabled={!price.startPrice||price.startPrice<=0}>
    <h2 className={`text-xl font-semibold ${TX1} mb-5`}>IPO Price</h2>
    <div className="grid grid-cols-4 gap-2 mb-4">
      {[100,250,500,1000].map(p=>(
        <button key={p} onClick={()=>setPrice({startPrice:p})} className={`py-3 rounded-xl text-sm font-semibold border transition-all ${price.startPrice===p?"bg-[#e8e8e8] text-[#080808] border-[#e8e8e8]":`${CARD2} ${TX2} border-[#2a2a2a] hover:border-[#444]`}`}>{p}</button>
      ))}
    </div>
    <Input type="number" min={1} placeholder="Custom value" value={price.startPrice||""} onChange={e=>setPrice({startPrice:parseFloat(e.target.value)})} className="w-full"/>
  </Shell>);

  if(step===4)return(<Shell step={4} onNext={n} onBack={b}>
    <h2 className={`text-xl font-semibold ${TX1} mb-1`}>Life Story</h2>
    <p className={`${TX3} text-xs mb-4`}>Each phase shapes your chart curve.</p>
    <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
      {story.phases.map(ph=>(
        <div key={ph.id} className={`flex items-center gap-3 ${CARD2} border ${BORD2} rounded-xl px-4 py-2.5`}>
          <span>{ph.emoji}</span>
          <div className="flex-1"><p className={`text-sm ${TX2}`}>{ph.name}</p><p className={`text-xs ${TX4}`}>{ph.start}→{ph.end||"now"}</p></div>
          <button onClick={()=>setStory(s=>({...s,phases:s.phases.filter(p=>p.id!==ph.id)}))} className={`${TX4} hover:text-red-400`}><X size={13}/></button>
        </div>
      ))}
    </div>
    <PhaseForm onAdd={ph=>setStory(s=>({...s,phases:[...s.phases,ph]}))}/>
  </Shell>);

  if(step===5)return(<Shell step={5} onNext={n} onBack={b}>
    <h2 className={`text-xl font-semibold ${TX1} mb-1`}>Habits</h2>
    <p className={`${TX3} text-xs mb-4`}>These move your index daily.</p>
    <div className="flex flex-wrap gap-2 mb-4">
      {DEFS.map(h=>(
        <button key={h.name} onClick={()=>{if(!hab.habits.find(x=>x.name===h.name))setHab(d=>({...d,habits:[...d.habits,{...h,id:uid()}]}));}}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${hab.habits.find(x=>x.name===h.name)?`border-[#666] ${TX2} bg-[#1e1e1e]`:`border-[#2a2a2a] ${TX3} hover:border-[#444] hover:${TX2}`}`}>
          {h.emoji} {h.name}
        </button>
      ))}
    </div>
    <div className="space-y-1.5 max-h-32 overflow-y-auto mb-4">
      {hab.habits.map(h=>(
        <div key={h.id} className={`flex items-center justify-between ${CARD2} border ${BORD2} rounded-xl px-4 py-2`}>
          <span className={`text-sm ${TX2}`}>{h.emoji} {h.name}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${h.impact>=0?"text-green-400":"text-red-400"}`}>{h.impact>0?"+":""}{h.impact}%</span>
            <button onClick={()=>setHab(d=>({...d,habits:d.habits.filter(x=>x.id!==h.id)}))} className={`${TX4} hover:text-red-400`}><X size={12}/></button>
          </div>
        </div>
      ))}
    </div>
  </Shell>);

  return(<Shell step={6} onNext={finish} onBack={b} nextLabel="🚀 Launch">
    <h2 className={`text-xl font-semibold ${TX1} mb-4`}>Ready to Launch</h2>
    {[["👤 Name",prof.name],["📈 Ticker",`$${prof.ticker||prof.name.slice(0,4).toUpperCase()}`],["🌍 Country",`${loc.country} · ${CURRENCIES[loc.country]?.code}`],["💰 IPO",`${CURRENCIES[loc.country]?.symbol}${price.startPrice}`],["🗂️ Phases",`${story.phases.length} phases`],["✅ Habits",`${hab.habits.length} habits`]].map(([k,v])=>(
      <div key={k} className={`flex justify-between items-center ${CARD2} border ${BORD2} rounded-xl px-4 py-3 mb-2`}>
        <span className={`text-sm ${TX3}`}>{k}</span><span className={`text-sm ${TX2}`}>{v}</span>
      </div>
    ))}
  </Shell>);
};

// ── Dashboard helpers ─────────────────────────────────────────────────────────
const TABS=[
  {id:"chart",  icon:<BarChart2 size={16}/>, label:"Index"},
  {id:"coach",  icon:<Brain size={16}/>,     label:"Coach"},
  {id:"press",  icon:<Newspaper size={16}/>, label:"Press"},
  {id:"habits", icon:<Flame size={16}/>,     label:"Habits"},
  {id:"assets", icon:<Star size={16}/>,      label:"Assets"},
  {id:"phases", icon:<BookOpen size={16}/>,  label:"Phases"},
  {id:"more",   icon:<Layers size={16}/>,    label:"More"},
  {id:"settings",icon:<Settings size={16}/>,label:"Settings"},
];

const CustomTooltip=({active,payload,phases,curr})=>{
  if(!active||!payload?.length)return null;
  const d=payload[0].payload;
  const ph=phases?.find(p=>d.date>=p.start&&(!p.end||d.date<=p.end));
  return(<div className={`${CARD} border ${BORD} rounded-xl p-3 shadow-2xl`}>
    <p className={`text-xs ${TX4} mb-1`}>{d.date}</p>
    {ph&&<p className="text-xs mb-1.5" style={{color:ph.color}}>{ph.emoji} {ph.name}</p>}
    <p className={`text-base font-semibold ${TX1} font-mono`}>{curr}{parseFloat(d.value).toFixed(2)}</p>
    {d.mood!==undefined&&<p className={`text-xs ${TX4} mt-1`}>Mood: {MOOD_LABELS[d.mood]}</p>}
  </div>);
};

const Heatmap=({orderBook})=>{
  const year=new Date().getFullYear();
  const days=useMemo(()=>{const m={};orderBook.forEach(o=>{if(!m[o.date])m[o.date]=0;m[o.date]+=o.change;});return m;},[orderBook]);
  const months=useMemo(()=>{
    const ms=[];
    for(let m=0;m<12;m++){
      const weeks=[];let week=[];
      const first=new Date(year,m,1);
      for(let d=0;d<first.getDay();d++)week.push(null);
      const dim=new Date(year,m+1,0).getDate();
      for(let d=1;d<=dim;d++){const ds=`${year}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;week.push({date:ds,val:days[ds]||0,logged:!!days[ds]});if(week.length===7){weeks.push(week);week=[];}}
      if(week.length)weeks.push(week);
      ms.push({month:new Date(year,m).toLocaleDateString("en-US",{month:"short"}),weeks});
    }
    return ms;
  },[days,year]);
  const getColor=c=>{if(!c)return"transparent";if(!c.logged)return"#1a1a1a";if(c.val>5)return"#166534";if(c.val>2)return"#15803d";if(c.val>0)return"#16a34a";if(c.val>-2)return"#7f1d1d";return"#991b1b";};
  return(<div className="overflow-x-auto">
    <div className="flex gap-3 min-w-max">
      {months.map(({month,weeks})=>(
        <div key={month}><p className={`text-[10px] ${TX4} mb-1`}>{month}</p>
          <div className="flex gap-0.5">{weeks.map((week,wi)=>(
            <div key={wi} className="flex flex-col gap-0.5">{week.map((cell,di)=><div key={di} className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:getColor(cell)}} title={cell?.date}/>)}</div>
          ))}</div>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2 mt-2"><span className={`text-[10px] ${TX4}`}>Less</span>{["#1a1a1a","#7f1d1d","#16a34a","#166534"].map(c=><div key={c} className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:c}}/>)}<span className={`text-[10px] ${TX4}`}>More</span></div>
  </div>);
};

const SectorRadar=({sectorScores})=>{
  const data=SECTORS.map(s=>({subject:s.label,value:Math.min(100,Math.max(0,sectorScores[s.id]||50)),fullMark:100}));
  return(<ResponsiveContainer width="100%" height={200}>
    <RadarChart data={data}>
      <PolarGrid stroke="#2a2a2a"/>
      <PolarAngleAxis dataKey="subject" tick={{fill:"#888",fontSize:11}}/>
      <Radar dataKey="value" stroke="#aaa" fill="#aaa" fillOpacity={0.1} strokeWidth={1.5} dot={{r:3,fill:"#aaa"}}/>
    </RadarChart>
  </ResponsiveContainer>);
};

const AICoach=({config,lifeIndex,orderBook,skills,weaknesses,phases,habits})=>{
  const [messages,setMessages]=useState([{role:"assistant",content:`Hey ${config.name}! I'm your AI Life Coach. Index is at ${fmt(lifeIndex)}, you have ${phases.length} phases, ${skills.length} skills and ${orderBook.length} logged events. Ask me anything.`}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg={role:"user",content:input};
    setMessages(p=>[...p,userMsg]);setInput("");setLoading(true);
    try{
      const ctx=`Elite life coach in MyLife Index. Concise, data-driven. User: Name:${config.name}, Country:${config.country}, IPO:${config.startPrice}, Index:${fmt(lifeIndex)}, Phases:${phases.map(p=>`${p.name}(${p.start}–${p.end||"now"})`).join(",")||"none"}, Skills:${skills.map(s=>`${s.name}(${SKILL_LEVELS[s.level]})`).join(",")||"none"}, Weaknesses:${weaknesses.map(w=>`${w.name}(${DEBT_SEVERITY[w.severity]})`).join(",")||"none"}, Habits:${habits.map(h=>`${h.name}(${h.impact>0?"+":""}${h.impact}%)`).join(",")||"none"}, Recent:${orderBook.slice(0,10).map(o=>`${o.desc}:${o.change>0?"+":""}${fmt(o.change)}%`).join(",")||"none"}. Max 200 words.`;
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:ctx,messages:[...messages,userMsg].filter(m=>m.role!=="system")})});
      const data=await resp.json();
      setMessages(p=>[...p,{role:"assistant",content:data.content?.[0]?.text||"Sorry, try again."}]);
    }catch{setMessages(p=>[...p,{role:"assistant",content:"Connection error."}]);}
    setLoading(false);
  };
  return(<Card>
    <h2 className={`font-semibold ${TX1} text-sm flex items-center gap-2 mb-4`}><Brain size={16} className={TX4}/>AI Life Coach</h2>
    <div className="space-y-3 max-h-96 overflow-y-auto mb-4 pr-1">
      {messages.map((m,i)=>(
        <div key={i} className={`flex ${m.role==="user"?"justify-end":""}`}>
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role==="user"?`bg-[#1e1e1e] border border-[#2a2a2a] ${TX2}`:`${CARD2} border ${BORD2} ${TX3}`}`}>
            {m.role==="assistant"&&<p className={`text-[10px] ${TX5} mb-1 font-mono`}>COACH</p>}
            {m.content}
          </div>
        </div>
      ))}
      {loading&&<div className="flex"><div className={`${CARD2} border ${BORD2} rounded-2xl px-4 py-3 text-sm ${TX4}`}>Analysing…</div></div>}
    </div>
    <div className="flex gap-2">
      <Input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about your patterns, goals…" className="flex-1"/>
      <Btn onClick={send} disabled={loading||!input.trim()}><Send size={15}/></Btn>
    </div>
    <div className="flex flex-wrap gap-2 mt-3">
      {["What are my patterns?","Where am I weakest?","What should I focus on?","Predict my next 30 days"].map(q=>(
        <button key={q} onClick={()=>setInput(q)} className={`text-xs px-3 py-1.5 rounded-lg ${CARD2} border ${BORD2} ${TX3} hover:${TX2} hover:border-[#444] transition-all`}>{q}</button>
      ))}
    </div>
  </Card>);
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard=({config,onReset,user,onSignOut})=>{
  const curr=CURRENCIES[config.country]?.symbol||"$";
  const ticker=config.ticker||config.name.slice(0,4).toUpperCase();

  const [chartData,setChartData]=useState(()=>load("mli_chart3",null)||generateFromPhases(config.phases,config.startPrice,config.dob));
  const [orderBook,setOrderBook]=useState(()=>load("mli_orders3",[]));
  const [habits,setHabits]=useState(()=>load("mli_habits3",config.habits||[]));
  const [phases,setPhases]=useState(()=>load("mli_phases3",config.phases||[]));
  const [skills,setSkills]=useState(()=>load("mli_skills3",[]));
  const [weaknesses,setWeaknesses]=useState(()=>load("mli_debts3",[]));
  const [pressReleases,setPressReleases]=useState(()=>load("mli_press3",[]));
  const [moodLog,setMoodLog]=useState(()=>load("mli_mood",{}));
  const [goals,setGoals]=useState(()=>load("mli_goals",[]));
  const [unlockedAch,setUnlockedAch]=useState(()=>load("mli_ach",[]));
  const [timeCapsules,setTimeCapsules]=useState(()=>load("mli_capsules",[]));
  const [view,setView]=useState("chart");
  const [timeRange,setTimeRange]=useState("ALL");
  const [scenario,setScenario]=useState(""),[scenarioImpact,setScenarioImpact]=useState("");
  const [prTitle,setPrTitle]=useState(""),[prBody,setPrBody]=useState(""),[prImpact,setPrImpact]=useState(""),[prType,setPrType]=useState("neutral");
  const [newSkill,setNewSkill]=useState({name:"",level:0,category:"Technical",sector:"skills",developingHabit:""});
  const [newDebt,setNewDebt]=useState({name:"",severity:0,category:"Mental",plan:""});
  const [newGoal,setNewGoal]=useState({title:"",sector:"academics",reward:0});
  const [capsule,setCapsule]=useState({message:"",unlockDate:""});
  const [moreTab,setMoreTab]=useState("heatmap");

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

  const lifeIndex=chartData[chartData.length-1]?.value||config.startPrice;
  const todayOrders=orderBook.filter(o=>o.date===today());
  const todayChange=todayOrders.reduce((s,o)=>s+o.change,0);
  const allTime=((lifeIndex-config.startPrice)/config.startPrice)*100;
  const last7d=useMemo(()=>{const c=chartData.filter(d=>d.timestamp>=Date.now()-7*86400000);return c.length>1?((lifeIndex-c[0].value)/c[0].value)*100:0;},[chartData,lifeIndex]);
  const streak=useMemo(()=>{let s=0,d=new Date();while(true){const ds=d.toISOString().split("T")[0];if(orderBook.find(o=>o.date===ds)){s++;d.setDate(d.getDate()-1);}else break;}return s;},[orderBook]);

  const sectorScores=useMemo(()=>{
    const sc=Object.fromEntries(SECTORS.map(s=>[s.id,50]));
    orderBook.slice(0,50).forEach(o=>{const h=habits.find(h=>h.name===o.desc||(o.desc&&o.desc.includes(h.name)));if(h?.sector)sc[h.sector]=Math.min(100,Math.max(0,(sc[h.sector]||50)+(o.change>0?5:-5)));});
    skills.forEach(sk=>{if(sc[sk.sector]!==undefined)sc[sk.sector]=Math.min(100,sc[sk.sector]+(sk.level+1)*4);});
    return sc;
  },[orderBook,habits,skills]);

  useEffect(()=>{
    const ow=orderBook.filter(o=>o.tag==="debt"&&o.change>0).length;
    ACHIEVEMENTS.forEach(a=>{if(!unlockedAch.includes(a.id)&&a.check(orderBook,lifeIndex,streak,pressReleases.length,skills.length,ow))setUnlockedAch(p=>[...p,a.id]);});
  },[orderBook,lifeIndex,streak,pressReleases,skills]);

  const openCapsules=timeCapsules.filter(c=>c.unlockDate<=today()&&!c.opened);

  const execute=(desc,pct,tag="")=>{
    const prev=parseFloat(chartData[chartData.length-1]?.value)||config.startPrice;
    const safePct=parseFloat(pct);
    if(isNaN(prev)||isNaN(safePct))return;
    const next=Math.max(1,prev*(1+safePct/100));
    if(isNaN(next))return;
    const now=new Date(),dateStr=now.toISOString().split("T")[0];
    setChartData(p=>[...p,{date:dateStr,value:parseFloat(next.toFixed(2)),timestamp:now.getTime(),mood:moodLog[dateStr]||undefined}]);
    setOrderBook(p=>[{id:uid(),time:now.toLocaleTimeString(),date:dateStr,desc,change:safePct,newIndex:next.toFixed(2),tag},...p.slice(0,99)]);
  };

  const filteredData=useMemo(()=>{const ranges={"1M":30,"3M":90,"6M":180,"1Y":365,"ALL":99999};return chartData.filter(d=>d.timestamp>=Date.now()-ranges[timeRange]*86400000);},[chartData,timeRange]);

  const analyzeScenario=()=>{
    if(!scenario.trim())return;
    const t=scenario.toLowerCase();let impact=0;
    if(/(exam|test|score|result)/.test(t))impact=/(great|high|90|95|100|excellent|pass)/.test(t)?5:/(fail|bad|poor|low)/.test(t)?-5:1;
    if(/(fight|lost.*friend|breakup)/.test(t))impact=-4;
    if(/(made up|new friend|reconcile)/.test(t))impact=3;
    if(/(sick|fever|hospital)/.test(t))impact=-2.5;
    if(/(award|won|prize|achieve)/.test(t))impact=4;
    if(/(vacation|trip|travel)/.test(t))impact=2.5;
    if(scenarioImpact.trim()&&!isNaN(parseFloat(scenarioImpact)))impact=parseFloat(scenarioImpact);
    if(!impact){alert("Add a % override.");return;}
    execute(`📌 ${scenario.slice(0,70)}`,impact,"event");
    setScenario("");setScenarioImpact("");
  };

  const technicals=useMemo(()=>{
    const recent=chartData.slice(-30).map(d=>d.value);
    if(recent.length<5)return null;
    const sma14=recent.slice(-14).reduce((a,b)=>a+b,0)/14;
    const sma30=recent.reduce((a,b)=>a+b,0)/recent.length;
    const last52=chartData.filter(d=>d.timestamp>=Date.now()-365*86400000);
    const high52=Math.max(...last52.map(d=>d.value)),low52=Math.min(...last52.map(d=>d.value));
    const mean=recent.reduce((a,b)=>a+b)/recent.length;
    const vol=Math.sqrt(recent.reduce((s,v)=>s+(v-mean)**2,0)/recent.length);
    let g=0,l=0;for(let i=1;i<recent.length;i++){const d=recent[i]-recent[i-1];d>0?g+=d:l-=d;}
    const rsi=100-100/(1+g/(l||1));
    const mom=recent[recent.length-1]-recent[0];
    const assetScore=skills.reduce((s,sk)=>s+(sk.level+1)*5,0);
    const debtScore=weaknesses.reduce((s,w)=>s+(w.severity+1)*8,0);
    const netWorth=assetScore-debtScore;
    const signals=[];
    if(rsi>70)signals.push({label:"Overbought",color:"text-yellow-400",icon:"⚠️"});
    if(rsi<30)signals.push({label:"Oversold",color:"text-blue-400",icon:"💎"});
    if(lifeIndex>sma14&&lifeIndex>sma30)signals.push({label:"Above All MAs",color:"text-green-400",icon:"📈"});
    if(lifeIndex<sma14&&lifeIndex<sma30)signals.push({label:"Below MAs",color:"text-red-400",icon:"📉"});
    if(streak>=7)signals.push({label:`${streak}d Streak`,color:"text-orange-400",icon:"🔥"});
    if(netWorth>20)signals.push({label:"Asset Rich",color:"text-purple-400",icon:"💡"});
    const rating=mom>10?"STRONG BUY":mom>3?"BUY":mom<-10?"SELL":mom<-3?"WEAK HOLD":"HOLD";
    return{sma14,sma30,high52,low52,vol,rsi,mom,assetScore,debtScore,netWorth,signals,rating};
  },[chartData,skills,weaknesses,lifeIndex,streak]);

  useEffect(()=>{if(streak>0&&streak%7===0)execute(`🏅 Dividend: ${streak}-day streak`,streak*0.5,"dividend");},[streak]);

  const pnl=useMemo(()=>{const bm={};orderBook.forEach(o=>{const m=o.date.slice(0,7);if(!bm[m])bm[m]={month:m,gain:0,loss:0,count:0};if(o.change>0)bm[m].gain+=o.change;else bm[m].loss+=o.change;bm[m].count++;});return Object.values(bm).sort((a,b)=>b.month.localeCompare(a.month)).slice(0,6);},[orderBook]);

  const applyImport=(d)=>{
    const isOld=d.chartData&&d.orderBook!==undefined&&!d.version;
    if(d.chartData?.length)setChartData(d.chartData.map(p=>({...p,value:isNaN(parseFloat(p.value))?500:parseFloat(p.value),timestamp:p.timestamp||new Date(p.date).getTime()})));
    if(d.orderBook?.length)setOrderBook(d.orderBook.map(o=>({...o,desc:o.desc||o.description||"Imported",change:isNaN(parseFloat(o.change))?0:parseFloat(o.change),newIndex:isNaN(parseFloat(o.newIndex))?"":parseFloat(o.newIndex).toFixed(2)})));
    if(d.habits?.length){
      if(isOld){const conv=[];d.habits.forEach(h=>{if(Array.isArray(h.impacts)&&h.impacts.length>0){h.impacts.forEach((imp,i)=>{const tn=Array.isArray(h.tiers)&&h.tiers[i]?` (${h.tiers[i]})`:"",impact=parseFloat(imp)||0;conv.push({id:uid(),name:`${h.name}${tn}`,impact,type:impact>=0?"positive":"negative",emoji:impact>=0?"✅":"❌",sector:classifyHabit(h.name)});});if(h.failurePenalty!=null){const fp=parseFloat(h.failurePenalty)||0;conv.push({id:uid(),name:`${h.name} (Failed)`,impact:fp,type:"negative",emoji:"❌",sector:classifyHabit(h.name)});}}else{const impact=parseFloat(h.impact)||0;conv.push({id:h.id||uid(),name:h.name||"Unnamed",impact,type:impact>=0?"positive":"negative",emoji:impact>=0?"✅":"❌",sector:classifyHabit(h.name)});}});setHabits(conv);}
      else setHabits(d.habits);
    }
    if(d.phases?.length)setPhases(d.phases);
    if(d.skills)setSkills(d.skills);
    if(d.weaknesses)setWeaknesses(d.weaknesses);
    if(d.pressReleases)setPressReleases(d.pressReleases);
    if(d.moodLog)setMoodLog(d.moodLog);
    if(d.goals)setGoals(d.goals);
    if(d.timeCapsules)setTimeCapsules(d.timeCapsules);
    alert(`✅ Import complete!\n• Chart: ${d.chartData?.length||0} pts\n• Orders: ${d.orderBook?.length||0}\n• Habits: ${d.habits?.length||0}`);
  };

  const statCard=(l,v,s,c)=>(
    <div key={l} className={`${CARD} border ${BORD} rounded-2xl p-3 text-center`}>
      <p className={`text-[10px] ${TX4} mb-1`}>{l}</p>
      <p className={`text-sm font-semibold font-mono ${c||TX2}`}>{v}</p>
      {s&&<p className={`text-[10px] ${TX5} mt-0.5`}>{s}</p>}
    </div>
  );

  return(
    <div className={`min-h-screen ${BG} ${TX1}`}>
      {openCapsules.map(c=>(
        <div key={c.id} className={`fixed top-4 left-4 right-4 z-50 ${CARD} border border-[#3a3a3a] rounded-2xl p-4 shadow-2xl`}>
          <p className={`text-xs ${TX4} mb-1`}>⏰ Time Capsule Unlocked</p>
          <p className={`text-sm ${TX2} font-medium mb-2`}>{c.message}</p>
          <p className={`text-xs ${TX4}`}>Written on {c.createdDate}</p>
          <Btn variant="ghost" onClick={()=>setTimeCapsules(p=>p.map(x=>x.id===c.id?{...x,opened:true}:x))} className="mt-2 w-full text-xs py-2">Dismiss</Btn>
        </div>
      ))}

      {/* topbar */}
      <div className={`border-b border-[#1e1e1e] px-5 py-4 flex items-center justify-between sticky top-0 ${BG}/95 backdrop-blur z-20`}>
        <div className="flex items-center gap-3">
          {user?.photoURL?<img src={user.photoURL} alt="" className="w-8 h-8 rounded-xl border border-[#2a2a2a]"/>
            :<div className={`w-8 h-8 ${CARD} border ${BORD} rounded-xl flex items-center justify-center text-base`}>📈</div>}
          <div><p className={`font-semibold ${TX1} text-sm leading-none`}>{config.name}</p><p className={`text-xs ${TX4} font-mono`}>${ticker} · {CURRENCIES[config.country]?.code}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-xl font-semibold ${TX1} font-mono`}>{curr}{fmt(lifeIndex)}</p>
            <p className={`text-xs font-mono ${todayChange>=0?"text-green-400":"text-red-400"}`}>{todayChange>=0?"+":""}{fmt(todayChange)}% today</p>
          </div>
          <button onClick={onSignOut} title="Sign out" className={`${TX4} hover:text-red-400 transition-colors ml-1`}><LogOut size={16}/></button>
        </div>
      </div>

      {streak>=3&&<div className={`${BG} border-b border-[#1e1e1e] px-5 py-2 flex items-center gap-2`}><Flame size={13} className="text-orange-400"/><span className={`text-xs ${TX3}`}>{streak}-day streak · Keep going</span><span className={`ml-auto text-xs ${TX4}`}>Next dividend at {Math.ceil(streak/7)*7}d</span></div>}

      <div className={`border-b border-[#1e1e1e] flex ${BG} sticky top-[57px] z-10 overflow-x-auto`}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 text-[10px] font-medium transition-all border-b-2 ${view===t.id?`border-[#888] ${TX2}`:`border-transparent ${TX4} hover:${TX3}`}`}>
            {t.icon}<span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-6 space-y-4">

        {/* INDEX */}
        {view==="chart"&&(<>
          <div className="grid grid-cols-4 gap-2">
            {[{l:"IPO",v:`${curr}${fmt(config.startPrice)}`,s:"Listing"},{l:"All-Time",v:`${allTime>=0?"+":""}${fmt(allTime)}%`,c:allTime>=0?"text-green-400":"text-red-400"},{l:"7 Day",v:`${last7d>=0?"+":""}${fmt(last7d)}%`,c:last7d>=0?"text-green-400":"text-red-400"},{l:"Streak",v:`${streak}d 🔥`,s:"consecutive"}].map(s=>statCard(s.l,s.v,s.s,s.c))}
          </div>
          <Card>
            <div className="flex items-center justify-between">
              <p className={`text-xs ${TX3}`}>Today's Mood</p>
              <div className="flex gap-2">{MOOD_LABELS.map((m,i)=>(
                <button key={i} onClick={()=>{setMoodLog(p=>({...p,[today()]:i}));execute(`Mood: ${m}`,i*0.3-0.9,"mood");}}
                  className={`text-lg transition-all ${moodLog[today()]===i?"scale-125":"opacity-50 hover:opacity-80"}`}>{m}</button>
              ))}</div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className={`font-semibold ${TX1} flex items-center gap-2 text-sm`}><Activity size={16} className={TX4}/>Performance</h2>
              <div className="flex gap-1">
                {["1M","3M","6M","1Y","ALL"].map(r=>(
                  <button key={r} onClick={()=>setTimeRange(r)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${timeRange===r?"bg-[#e8e8e8] text-[#080808]":`${TX3} hover:${TX2}`}`}>{r}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={filteredData}>
                <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e8e8e8" stopOpacity={0.07}/><stop offset="95%" stopColor="#e8e8e8" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e"/>
                <XAxis dataKey="date" stroke="#1e1e1e" tick={{fill:"#666",fontSize:10}} tickFormatter={v=>new Date(v).toLocaleDateString("en-US",{month:"short",year:"2-digit"})}/>
                <YAxis stroke="#1e1e1e" tick={{fill:"#666",fontSize:10}} domain={["dataMin - 20","dataMax + 20"]}/>
                <Tooltip content={<CustomTooltip phases={phases} curr={curr}/>}/>
                {phases.map(ph=>ph.start&&<ReferenceLine key={ph.id} x={ph.start} stroke={ph.color} strokeDasharray="4 3" strokeOpacity={0.5} label={{value:ph.emoji,fill:ph.color,fontSize:12,position:"insideTopLeft"}}/>)}
                <Area type="monotone" dataKey="value" stroke="#888" strokeWidth={1.5} fill="url(#grad)" dot={false} activeDot={{r:4,fill:"#e8e8e8",stroke:"#080808",strokeWidth:2}}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {technicals&&(<Card>
            <h2 className={`font-semibold ${TX1} text-sm flex items-center gap-2 mb-4`}><Zap size={16} className={TX4}/>Technicals</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${technicals.rating.includes("BUY")?"border-green-800 text-green-400 bg-green-950/30":technicals.rating.includes("SELL")?"border-red-800 text-red-400 bg-red-950/30":`border-[#2a2a2a] ${TX3}`}`}>{technicals.rating}</span>
              {technicals.signals.map(s=><span key={s.label} className={`px-3 py-1.5 rounded-lg text-xs ${CARD2} border ${BORD2} ${s.color}`}>{s.icon} {s.label}</span>)}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[["RSI (14)",fmt(technicals.rsi),technicals.rsi>70?"text-yellow-400":technicals.rsi<30?"text-blue-400":TX2],["SMA 14",`${curr}${fmt(technicals.sma14)}`,TX2],["SMA 30",`${curr}${fmt(technicals.sma30)}`,TX2],["Momentum",`${technicals.mom>=0?"+":""}${fmt(technicals.mom)}`,technicals.mom>=0?"text-green-400":"text-red-400"],["52W High",`${curr}${fmt(technicals.high52)}`,TX2],["52W Low",`${curr}${fmt(technicals.low52)}`,TX2],["Volatility",`${fmt(technicals.vol)}σ`,technicals.vol>15?"text-red-400":technicals.vol>7?"text-yellow-400":"text-green-400"],["Net Worth",`${technicals.netWorth>=0?"+":""}${technicals.netWorth}pts`,technicals.netWorth>=0?"text-green-400":"text-red-400"]].map(([l,v,c])=>(
                <div key={l} className={`${CARD2} border ${BORD2} rounded-xl px-4 py-3 flex justify-between items-center`}>
                  <span className={`text-xs ${TX3}`}>{l}</span><span className={`text-sm font-semibold font-mono ${c}`}>{v}</span>
                </div>
              ))}
            </div>
            <div className={`border-t border-[#222] pt-4 mb-4`}>
              <p className={`text-xs ${TX3} mb-3`}>Sector Breakdown</p>
              <SectorRadar sectorScores={sectorScores}/>
              <div className="grid grid-cols-5 gap-1 mt-2">{SECTORS.map(s=><div key={s.id} className="text-center"><p className="text-base">{s.emoji}</p><p className={`text-[10px] ${TX3}`}>{Math.round(sectorScores[s.id]||50)}</p></div>)}</div>
            </div>
            <div className={`${CARD2} border ${BORD2} rounded-xl p-4 mb-3`}>
              <p className={`text-xs ${TX3} mb-3`}>Balance Sheet</p>
              <div className="flex items-center gap-4">
                <div className="flex-1"><p className="text-xs text-green-500 mb-1">Assets</p><div className="h-1.5 bg-[#111] rounded-full"><div className="h-full bg-green-700 rounded-full" style={{width:`${Math.min(100,technicals.assetScore)}%`}}/></div><p className={`text-[10px] ${TX3} mt-1`}>+{technicals.assetScore}pts</p></div>
                <div className="flex-1"><p className="text-xs text-red-500 mb-1">Debt</p><div className="h-1.5 bg-[#111] rounded-full"><div className="h-full bg-red-800 rounded-full" style={{width:`${Math.min(100,technicals.debtScore)}%`}}/></div><p className={`text-[10px] ${TX3} mt-1`}>−{technicals.debtScore}pts</p></div>
                <div className="text-center"><p className={`text-xs ${TX3}`}>Net</p><p className={`text-base font-bold font-mono ${technicals.netWorth>=0?"text-green-400":"text-red-400"}`}>{technicals.netWorth>=0?"+":""}{technicals.netWorth}</p></div>
              </div>
            </div>
            <div className={`${CARD2} border ${BORD2} rounded-xl p-4`}>
              <p className={`text-[10px] ${TX4} mb-2 uppercase tracking-wider`}>AI Signal</p>
              <p className={`text-xs ${TX3} leading-relaxed`}>
                {technicals.rsi>70?"Running hot — gains may be overdone.":technicals.rsi<30?"Deeply oversold. Strong recovery potential.":technicals.mom>5?"Positive momentum building.":technicals.mom<-5?"Negative momentum — focus on high-yield habits.":"Range-bound. Small consistent wins will break resistance."}
                {technicals.netWorth<-10?" ⚠️ Debt exceeding assets.":technicals.netWorth>20?" 🌟 Strong asset base.":""}
                {streak>=7?` 🔥 ${streak}-day streak compounding.`:""}
              </p>
            </div>
          </Card>)}

          <Card>
            <h2 className={`font-semibold ${TX1} text-sm flex items-center gap-2 mb-4`}><Send size={16} className={TX4}/>Log an Event</h2>
            <Textarea value={scenario} onChange={e=>setScenario(e.target.value)} placeholder="What happened? (e.g. 'Scored 90% in finals')" className="w-full h-20 mb-2"/>
            <div className="flex gap-2">
              <Input value={scenarioImpact} onChange={e=>setScenarioImpact(e.target.value)} placeholder="% override" className="flex-1 font-mono"/>
              <Btn onClick={analyzeScenario}><Send size={15}/>Log</Btn>
            </div>
          </Card>
          <Card>
            <h2 className={`font-semibold ${TX1} text-sm mb-4`}>Transaction Log</h2>
            {orderBook.length===0?<p className={`${TX4} text-sm text-center py-8`}>No transactions yet.</p>:(
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {orderBook.slice(0,30).map(o=>(
                  <div key={o.id} className={`flex items-center justify-between ${CARD2} border ${BORD2} rounded-xl px-4 py-3`}>
                    <div><p className={`text-sm ${TX2} truncate max-w-52 sm:max-w-64`}>{o.desc}</p><p className={`text-[10px] ${TX4}`}>{o.date} · {o.time}{o.tag?` · ${o.tag}`:""}</p></div>
                    <div className="text-right"><p className={`text-sm font-bold font-mono ${o.change>=0?"text-green-400":"text-red-400"}`}>{o.change>0?"+":""}{fmt(o.change)}%</p><p className={`text-[10px] ${TX4} font-mono`}>{curr}{o.newIndex}</p></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>)}

        {view==="coach"&&<AICoach config={config} lifeIndex={lifeIndex} orderBook={orderBook} skills={skills} weaknesses={weaknesses} phases={phases} habits={habits}/>}

        {/* PRESS */}
        {view==="press"&&(<>
          <Card>
            <h2 className={`font-semibold ${TX1} text-sm flex items-center gap-2 mb-4`}><Newspaper size={16} className={TX4}/>Publish Press Release</h2>
            <div className="space-y-3">
              <Input value={prTitle} onChange={e=>setPrTitle(e.target.value)} placeholder="Headline" className="w-full"/>
              <Textarea value={prBody} onChange={e=>setPrBody(e.target.value)} placeholder="Write your full press release…" className="w-full h-28"/>
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-1">
                  {[["positive","🟢"],["neutral","⚪"],["negative","🔴"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setPrType(v)} className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${prType===v?"bg-[#e8e8e8] text-[#080808] border-[#e8e8e8]":`${CARD2} ${TX3} border-[#2a2a2a] hover:border-[#444]`}`}>{l} {v}</button>
                  ))}
                </div>
                <Input value={prImpact} onChange={e=>setPrImpact(e.target.value)} placeholder="% impact" className="w-24 font-mono"/>
                <Btn onClick={()=>{if(!prTitle.trim()||!prBody.trim())return;const impact=prImpact?parseFloat(prImpact):prType==="positive"?3:prType==="negative"?-3:0;const now=new Date();setPressReleases(p=>[{id:uid(),title:prTitle,body:prBody,type:prType,impact,date:now.toISOString().split("T")[0],time:now.toLocaleTimeString()},...p]);if(impact!==0)execute(`📰 ${prTitle}`,impact,"press");setPrTitle("");setPrBody("");setPrImpact("");setPrType("neutral");}} disabled={!prTitle.trim()||!prBody.trim()}><Newspaper size={15}/>Publish</Btn>
              </div>
            </div>
          </Card>
          {pressReleases.map(pr=>(
            <div key={pr.id} className={`border rounded-2xl p-5 ${pr.type==="positive"?"bg-green-950/10 border-green-900/30":pr.type==="negative"?"bg-red-950/10 border-red-900/30":`${CARD} border-[#2a2a2a]`}`}>
              <div className="flex items-start justify-between mb-3">
                <div><p className={`font-semibold ${TX1} text-sm`}>{pr.title}</p><p className={`text-[10px] ${TX4} mt-1`}>{pr.date} · {pr.time}</p></div>
                <div className="flex gap-2">
                  {pr.impact!==0&&<span className={`text-xs font-bold font-mono px-2 py-1 rounded-lg ${pr.type==="positive"?"bg-green-950/40 text-green-400":pr.type==="negative"?"bg-red-950/40 text-red-400":`${CARD2} ${TX3}`}`}>{pr.impact>0?"+":""}{pr.impact}%</span>}
                  <button onClick={()=>setPressReleases(p=>p.filter(x=>x.id!==pr.id))} className={`${TX4} hover:text-red-400`}><X size={14}/></button>
                </div>
              </div>
              <p className={`text-sm ${TX3} leading-relaxed`}>{pr.body}</p>
            </div>
          ))}
        </>)}

        {/* HABITS */}
        {view==="habits"&&(<>
          <div className="grid sm:grid-cols-2 gap-3">
            {habits.map(h=>(
              <div key={h.id} className={`${CARD} border ${BORD} rounded-2xl p-4 flex items-center justify-between`}>
                <div>
                  <p className={`font-medium ${TX1} text-sm`}>{h.emoji} {h.name}</p>
                  <p className={`text-xs mt-0.5 font-mono ${h.impact>=0?"text-green-400":"text-red-400"}`}>{h.impact>0?"+":""}{h.impact}%</p>
                  <p className={`text-[10px] ${TX4} mt-0.5`}>{SECTORS.find(s=>s.id===h.sector)?.emoji} {SECTORS.find(s=>s.id===h.sector)?.label||"General"}</p>
                </div>
                <div className="flex gap-2">
                  <Btn variant={h.impact>=0?"success":"danger"} onClick={()=>execute(h.name,h.impact,"habit")} className="text-xs py-2 px-3">Log</Btn>
                  <button onClick={()=>setHabits(p=>p.filter(x=>x.id!==h.id))} className={`${TX4} hover:text-red-400`}><Trash2 size={15}/></button>
                </div>
              </div>
            ))}
          </div>
          <Card>
            <h3 className={`font-semibold ${TX1} text-sm mb-4`}>Add Habit</h3>
            <div className="flex gap-2 flex-wrap">
              <Input placeholder="Name" className="flex-1 min-w-32" id="hn"/>
              <Input type="number" step="0.5" placeholder="%" className="w-16 font-mono" id="hi"/>
              <Sel id="ht" className="w-28"><option value="positive">+ Positive</option><option value="negative">− Negative</option></Sel>
              <Sel id="hs" className="w-36">
                <option value="auto">🤖 Auto-detect</option>
                {SECTORS.map(s=><option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
              </Sel>
              <Btn onClick={()=>{
                const name=document.getElementById("hn").value,imp=document.getElementById("hi").value,type=document.getElementById("ht").value,sEl=document.getElementById("hs");
                if(!name||!imp)return;
                const impact=parseFloat(imp)*(type==="negative"?-1:1);
                const sector=sEl.value==="auto"?classifyHabit(name):sEl.value;
                setHabits(p=>[...p,{id:uid(),name,impact,type,emoji:type==="positive"?"✅":"❌",sector}]);
                document.getElementById("hn").value="";document.getElementById("hi").value="";
              }}><Plus size={16}/></Btn>
            </div>
          </Card>
          <Card>
            <h3 className={`font-semibold ${TX1} text-sm mb-4 flex items-center gap-2`}><Award size={15} className={TX4}/>Monthly P&L</h3>
            {pnl.length===0?<p className={`${TX4} text-sm text-center py-4`}>No data yet.</p>:(
              <div className="space-y-2">
                {pnl.map(m=>(
                  <div key={m.month} className={`flex items-center justify-between ${CARD2} border ${BORD2} rounded-xl px-4 py-3`}>
                    <span className={`text-xs ${TX3} font-mono`}>{m.month}</span>
                    <div className="flex gap-4"><span className="text-xs text-green-400 font-mono">+{fmt(m.gain)}%</span><span className="text-xs text-red-400 font-mono">{fmt(m.loss)}%</span><span className={`text-xs font-bold font-mono ${m.gain+m.loss>=0?"text-green-400":"text-red-400"}`}>{m.gain+m.loss>=0?"+":""}{fmt(m.gain+m.loss)}%</span></div>
                    <span className={`text-[10px] ${TX4}`}>{m.count} logs</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>)}

        {/* ASSETS */}
        {view==="assets"&&(<>
          <Card>
            <h2 className={`font-semibold ${TX1} text-sm flex items-center gap-2 mb-4`}><Star size={16} className={TX4}/>Skills <span className={`${TX3} font-normal`}>— Assets</span></h2>
            <div className="space-y-3 mb-5">
              {skills.length===0&&<p className={`${TX4} text-sm text-center py-4`}>No skills yet.</p>}
              {skills.map(sk=>(
                <div key={sk.id} className={`${CARD2} border ${BORD2} rounded-xl p-4`}>
                  <div className="flex items-start justify-between mb-2">
                    <div><p className={`font-medium ${TX1} text-sm`}>{sk.name}</p><p className={`text-xs ${TX3}`}>{sk.category} · {SKILL_LEVELS[sk.level]}</p></div>
                    <div className="flex gap-2">
                      <span className="text-xs font-bold text-green-400 bg-green-950/30 px-2 py-1 rounded-lg">+{(sk.level+1)*5}pts</span>
                      <button onClick={()=>{setSkills(p=>p.map(x=>x.id===sk.id?{...x,level:Math.min(4,x.level+1)}:x));execute(`📈 Levelled up: ${sk.name}`,(sk.level+1)*0.8,"skill");}} className={`text-[10px] ${CARD} border ${BORD} hover:border-[#444] px-2 py-1 rounded-lg ${TX3} hover:${TX2} transition-all`}>Level Up</button>
                      <button onClick={()=>setSkills(p=>p.filter(x=>x.id!==sk.id))} className={`${TX4} hover:text-red-400`}><X size={13}/></button>
                    </div>
                  </div>
                  <div className="flex gap-1">{SKILL_LEVELS.map((_,i)=><div key={i} className={`flex-1 h-1 rounded-full ${i<=sk.level?"bg-green-700":"bg-[#222]"}`}/>)}</div>
                  {sk.developingHabit&&<p className={`text-[10px] ${TX4} mt-2`}>🔁 Via: {sk.developingHabit}</p>}
                </div>
              ))}
            </div>
            <div className="border-t border-[#222] pt-4 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Input value={newSkill.name} onChange={e=>setNewSkill(p=>({...p,name:e.target.value}))} placeholder="Skill name" className="flex-1 min-w-32"/>
                <Sel value={newSkill.category} onChange={e=>setNewSkill(p=>({...p,category:e.target.value}))} className="w-36">{["Technical","Creative","Social","Physical","Mental","Academic","Leadership"].map(c=><option key={c}>{c}</option>)}</Sel>
                <Sel value={newSkill.sector} onChange={e=>setNewSkill(p=>({...p,sector:e.target.value}))} className="w-36"><option value="auto">🤖 Auto</option>{SECTORS.map(s=><option key={s.id
