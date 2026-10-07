'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, BedDouble, BookOpenText, Brain, CalendarDays, Check,
  ChevronRight, CircleAlert, Clock3, Database, Download, FileSpreadsheet,
  Flame, Headphones, Home, Map, Mic2, Pause, Play,
  Plus, RotateCcw, Search, Settings, SkipForward, Sparkles, Target, Upload, X,
} from 'lucide-react';
import { allTasks, errorsSeed, grammarSeed, roadmap, StudyBlock, StudyDay, StudyTask, Traffic, vocabularySeed } from './data';
import { loadState, saveState } from './db';

type NavId = 'today' | 'roadmap' | 'progress' | 'grammar' | 'vocabulary' | 'speaking' | 'listening' | 'errors' | 'calendar' | 'settings';
type GrammarItem = { id: string; title: string; status: Traffic; rule: string; mistake: string; correction: string; examples: string[]; reviews: number; lastReview?: string; nextReview?: string };
type ErrorItem = { id: string; date: string; mistake: string; correction: string; type: string; rule: string; status: Traffic };
type VocabItem = { id: string; front: string; back: string; pattern: string; interval: number; due: string };
type SpeakingEntry = { id: string; date: string; topic: string; duration: number; target: string; mistakes: string; attempt1: Traffic; attempt2: Traffic };
type ListeningEntry = { id: string; date: string; title: string; url: string; duration: number; subtitles: boolean; comprehension: number; chunks: number; summary: boolean; difficulty: string };
type AppState = {
  completed: Record<string, boolean>;
  notes: Record<string, string>;
  dayStatus: Record<string, 'missed' | 'skipped' | 'rest'>;
  grammar: GrammarItem[];
  errors: ErrorItem[];
  vocabulary: VocabItem[];
  speaking: SpeakingEntry[];
  listening: ListeningEntry[];
  reflections: Record<string, { difficult: string; improved: string; priority: string }>;
  startDate: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const defaultState = (): AppState => ({
  completed: {}, notes: {}, dayStatus: {}, grammar: grammarSeed.map((item) => ({ ...item })),
  errors: errorsSeed.map((item) => ({ ...item })), vocabulary: vocabularySeed.map((item) => ({ ...item })),
  speaking: [{ id: 's1', date: todayISO(), topic: 'A choice I would make differently', duration: 12, target: 'should have / might have', mistakes: 'V3 after should have', attempt1: 'yellow', attempt2: 'green' }],
  listening: [{ id: 'l1', date: todayISO(), title: 'Why habits are hard to change', url: '', duration: 14, subtitles: false, comprehension: 3, chunks: 4, summary: true, difficulty: 'Medium' }],
  reflections: {}, startDate: '2026-08-24',
});

const navItems: { id: NavId; label: string; icon: typeof Home }[] = [
  { id: 'today', label: 'Today', icon: Home }, { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'progress', label: 'Progress', icon: BarChart3 }, { id: 'grammar', label: 'Grammar', icon: Target },
  { id: 'vocabulary', label: 'Vocabulary', icon: Brain }, { id: 'speaking', label: 'Speaking', icon: Mic2 },
  { id: 'listening', label: 'Listening', icon: Headphones }, { id: 'errors', label: 'Error log', icon: BookOpenText },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
];

const statusLabel: Record<Traffic, string> = { red: 'Still difficult', yellow: 'Improving', green: 'Learned' };
const statusDot: Record<Traffic, string> = { red: '●', yellow: '●', green: '●' };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

function dateForDay(startDate: string, week: number, day: number) {
  const date = new Date(`${startDate}T12:00:00`); date.setDate(date.getDate() + (week - 1) * 7 + day - 1); return date;
}

function dayProgress(day: StudyDay, state: AppState) {
  const tasks = day.blocks.flatMap((item) => item.tasks);
  const done = tasks.filter((task) => state.completed[task.id]);
  const minutes = done.reduce((sum, task) => sum + task.minutes, 0);
  return { done: done.length, total: tasks.length, minutes, percent: tasks.length ? Math.round(done.length / tasks.length * 100) : 0 };
}

export default function HomePage() {
  const [active, setActive] = useState<NavId>('today');
  const [state, setState] = useState<AppState>(defaultState);
  const [ready, setReady] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedGrammar, setSelectedGrammar] = useState('g1');
  const [grammarFilter, setGrammarFilter] = useState<'all' | Traffic>('all');
  const [errorFilter, setErrorFilter] = useState<'all' | Traffic>('all');
  const [errorSearch, setErrorSearch] = useState('');
  const [showErrorForm, setShowErrorForm] = useState(false);
  const [showVocabForm, setShowVocabForm] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [focus, setFocus] = useState<{ task: StudyTask; block: StudyBlock } | null>(null);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [toast, setToast] = useState('');
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadState<AppState>().then((saved) => { if (saved) setState(saved); setReady(true); }).catch(() => setReady(true));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    const installHandler = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('beforeinstallprompt', installHandler);
    return () => window.removeEventListener('beforeinstallprompt', installHandler);
  }, []);

  useEffect(() => { if (!ready) return; const id = window.setTimeout(() => saveState(state), 220); return () => clearTimeout(id); }, [state, ready]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 2200); return () => clearTimeout(id); }, [toast]);
  useEffect(() => {
    if (!focusRunning) return;
    const id = window.setInterval(() => setFocusSeconds((value) => {
      if (value <= 1) { window.clearInterval(id); setFocusRunning(false); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [focusRunning]);

  const current = useMemo(() => {
    const start = new Date(`${state.startDate}T12:00:00`);
    const now = new Date(); now.setHours(12, 0, 0, 0);
    const offset = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
    const week = clamp(Math.floor(offset / 7) + 1, 1, 12);
    const day = clamp(offset % 7 + 1, 1, 7);
    return { week, day, plan: roadmap[week - 1].days[day - 1] };
  }, [state.startDate]);
  const todayProgress = dayProgress(current.plan, state);
  const totalDone = allTasks.filter((task) => state.completed[task.id]).length;
  const totalMinutes = allTasks.filter((task) => state.completed[task.id]).reduce((sum, task) => sum + task.minutes, 0);
  const totalPossibleMinutes = allTasks.reduce((sum, task) => sum + task.minutes, 0);
  const b2Percent = Math.round(totalDone / allTasks.length * 100);
  const thisWeekDays = roadmap[current.week - 1].days;
  const weekTasks = thisWeekDays.flatMap((day) => day.blocks.flatMap((item) => item.tasks));
  const weekDone = weekTasks.filter((task) => state.completed[task.id]);
  const weekPercent = Math.round(weekDone.length / weekTasks.length * 100);
  const grammarCounts = (['red', 'yellow', 'green'] as Traffic[]).map((status) => state.grammar.filter((item) => item.status === status).length);

  const patchState = (patch: Partial<AppState>) => setState((value) => ({ ...value, ...patch }));
  const toggleTask = (task: StudyTask) => setState((value) => ({ ...value, completed: { ...value.completed, [task.id]: !value.completed[task.id] } }));
  const openFocus = (task: StudyTask, block: StudyBlock) => { setFocus({ task, block }); setFocusSeconds(task.minutes * 60); setFocusRunning(false); };
  const finishFocus = () => { if (!focus) return; setState((value) => ({ ...value, completed: { ...value.completed, [focus.task.id]: true } })); setFocus(null); setFocusRunning(false); setToast('Focus session completed'); };
  const goToday = () => { setActive('today'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const renderCheckbox = (task: StudyTask, block: StudyBlock) => {
    const checked = Boolean(state.completed[task.id]);
    return (
      <div className={`task-row ${checked ? 'checked' : ''}`} key={task.id}>
        <label>
          <input type="checkbox" checked={checked} onChange={() => toggleTask(task)} />
          <span className="checkmark"><Check size={11} strokeWidth={3} /></span><span>{task.label}</span>
        </label>
        <button className="icon-button ghost-on-hover" onClick={() => openFocus(task, block)} aria-label={`Start focus: ${task.label}`}><Play size={12} fill="currentColor" /></button>
      </div>
    );
  };

  const Today = () => (
    <div className="page-content today-page">
      <section className="hero">
        <div>
          <p className="eyebrow">WEEK {current.week} · DAY {current.day}</p>
          <h1>{current.day === 7 ? 'Weekly reset.' : 'Good morning.'}</h1>
          <p className="lede">{current.day === 7 ? 'Reflect, close the loop, and choose one priority.' : 'Your plan is ready. One calm session at a time.'}</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => document.getElementById('today-plan')?.scrollIntoView({ behavior: 'smooth' })}>Continue today’s plan <ArrowRight size={14} /></button>
            <span><b>{Math.max(0, current.plan.minutes - todayProgress.minutes)} min</b> remaining</span>
          </div>
        </div>
        <div className={`progress-ring ${todayProgress.percent === 100 ? 'complete' : ''}`} style={{ '--progress': `${todayProgress.percent * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{todayProgress.percent}%</strong><span>TODAY</span></div>
          {todayProgress.percent === 100 && <Sparkles className="ring-spark" size={20} />}
        </div>
      </section>

      <section id="today-plan">
        <div className="section-heading">
          <div><p className="eyebrow">TODAY’S PLAN</p><h2>{current.plan.minutes} minutes · {todayProgress.done} of {todayProgress.total} tasks</h2></div>
          <div className="mini-progress"><span style={{ width: `${todayProgress.percent}%` }} /></div>
        </div>
        <div className="task-grid">
          {current.plan.blocks.map((block) => (
            <article className="task-card" key={block.id}>
              <div className="task-card-head"><div><span className={`dot ${block.accent}`} /><h3>{block.title}</h3></div><span>{block.minutes} min</span></div>
              <div className="task-list">{block.tasks.map((task) => renderCheckbox(task, block))}</div>
              <button className="focus-link" onClick={() => openFocus(block.tasks.find((task) => !state.completed[task.id]) ?? block.tasks[0], block)}>Start focus session <ArrowRight size={12} /></button>
            </article>
          ))}
        </div>
      </section>

      <section className="notes-card">
        <div><p className="eyebrow">NOTES</p><h3>Anything worth remembering?</h3></div>
        <textarea aria-label="Notes for today" value={state.notes[current.plan.id] ?? ''} onChange={(event) => patchState({ notes: { ...state.notes, [current.plan.id]: event.target.value } })} placeholder="Today I noticed…" />
        <span className="autosave"><Database size={12} /> Saved automatically</span>
      </section>

      {current.day === 7 && <WeeklyReflection week={current.week} state={state} setState={setState} />}
    </div>
  );

  const Roadmap = () => {
    const week = roadmap[selectedWeek - 1]; const day = week.days[selectedDay - 1]; const progress = dayProgress(day, state);
    return (
      <div className="page-content">
        <PageTitle eyebrow="12-WEEK PROGRAMME" title="Roadmap" subtitle="A complete path from shaky B1 habits to confident B2 performance." />
        <div className="roadmap-layout">
          <div className="week-list">
            {roadmap.map((item) => {
              const tasks = item.days.flatMap((d) => d.blocks.flatMap((b) => b.tasks)); const done = tasks.filter((task) => state.completed[task.id]).length; const percent = Math.round(done / tasks.length * 100);
              return <button key={item.number} onClick={() => { setSelectedWeek(item.number); setSelectedDay(1); }} className={`week-row ${selectedWeek === item.number ? 'active' : ''}`}><span className="week-node">{percent === 100 ? <Check size={12} /> : item.number}</span><span><b>Week {item.number}</b><small>{item.focus}</small></span>{item.checkpoint && <em>{item.checkpoint}</em>}<strong>{percent}%</strong></button>;
            })}
          </div>
          <div className="roadmap-detail">
            <div className="detail-head"><div><p className="eyebrow">WEEK {week.number}</p><h2>{week.focus}</h2><p>{week.outcome}</p></div>{week.checkpoint && <span className="checkpoint-badge"><Sparkles size={13} /> {week.checkpoint}</span>}</div>
            <div className="day-tabs">{week.days.map((item) => <button className={selectedDay === item.day ? 'active' : ''} onClick={() => setSelectedDay(item.day)} key={item.id}><span>{item.name.slice(0, 3)}</span><b>{dayProgress(item, state).percent}%</b></button>)}</div>
            <div className="day-summary"><div><p className="eyebrow">{day.name.toUpperCase()}</p><h3>{day.title}</h3></div><span>{day.minutes} min · {progress.done}/{progress.total} tasks</span></div>
            <div className="roadmap-blocks">{day.blocks.map((block) => <section key={block.id}><header><span className={`dot ${block.accent}`} /><b>{block.title}</b><small>{block.minutes} min</small></header>{block.tasks.map((task) => renderCheckbox(task, block))}</section>)}</div>
            <div className="missed-actions"><span>Plans change. This day can be:</span><button onClick={() => patchState({ dayStatus: { ...state.dayStatus, [day.id]: 'missed' } })}><CircleAlert size={13} /> Missed</button><button onClick={() => patchState({ dayStatus: { ...state.dayStatus, [day.id]: 'skipped' } })}><SkipForward size={13} /> Skip</button><button onClick={() => patchState({ dayStatus: { ...state.dayStatus, [day.id]: 'rest' } })}><BedDouble size={13} /> Rest day</button>{state.dayStatus[day.id] && <em>{state.dayStatus[day.id]}</em>}</div>
          </div>
        </div>
      </div>
    );
  };

  const Progress = () => {
    const listeningMinutes = state.listening.reduce((sum, item) => sum + item.duration, 0); const speakingMinutes = state.speaking.reduce((sum, item) => sum + item.duration, 0);
    return <div className="page-content"><PageTitle eyebrow="USEFUL SIGNALS, NOT VANITY" title="Progress" subtitle="See effort, accuracy and consistency in one glance." />
      <div className="stat-grid"><Stat label="Today" value={`${todayProgress.percent}%`} sub={`${todayProgress.minutes} / ${current.plan.minutes} min`} color="violet" /><Stat label="This week" value={`${weekPercent}%`} sub={`${weekDone.length} tasks completed`} color="blue" /><Stat label="Total" value={`${Math.round(totalMinutes / 60)}h`} sub={`of ${Math.round(totalPossibleMinutes / 60)} planned hours`} color="green" /><Stat label="Road to B2" value={`${b2Percent}%`} sub={`${totalDone} of ${allTasks.length} tasks`} color="orange" /></div>
      <div className="dashboard-grid"><section className="panel"><div className="panel-title"><div><p className="eyebrow">CONSISTENCY</p><h3>Activity</h3></div><span className="streak"><Flame size={13} fill="currentColor" /> 6 days</span></div><Heatmap state={state} startDate={state.startDate} compact /></section>
      <section className="panel"><div className="panel-title"><div><p className="eyebrow">GRAMMAR</p><h3>Traffic lights</h3></div></div><div className="traffic-stats">{(['red','yellow','green'] as Traffic[]).map((status, i) => <div key={status}><span className={`traffic ${status}`}>{statusDot[status]}</span><strong>{grammarCounts[i]}</strong><small>{statusLabel[status]}</small></div>)}</div><button className="secondary full" onClick={() => setActive('grammar')}>Review grammar <ChevronRight size={14} /></button></section>
      <section className="panel wide"><div className="panel-title"><div><p className="eyebrow">SKILL TIME</p><h3>Practice balance</h3></div><span>This programme</span></div><div className="skill-bars"><SkillBar label="Listening" value={listeningMinutes} max={Math.max(listeningMinutes, speakingMinutes, 60)} color="blue" /><SkillBar label="Speaking" value={speakingMinutes} max={Math.max(listeningMinutes, speakingMinutes, 60)} color="orange" /><SkillBar label="Completed plan" value={totalMinutes} max={totalPossibleMinutes} color="violet" /></div></section></div>
    </div>;
  };

  const Grammar = () => {
    const filtered = state.grammar.filter((item) => grammarFilter === 'all' || item.status === grammarFilter); const item = state.grammar.find((entry) => entry.id === selectedGrammar) ?? state.grammar[0];
    const updateStatus = (status: Traffic) => {
      const now = new Date(); const next = new Date(now); next.setDate(next.getDate() + (status === 'red' ? 2 : status === 'yellow' ? 5 : 14));
      patchState({ grammar: state.grammar.map((entry) => entry.id === item.id ? { ...entry, status, reviews: entry.reviews + 1, lastReview: now.toISOString(), nextReview: next.toISOString() } : entry) }); setToast(`${item.title}: ${statusLabel[status]}`);
    };
    return <div className="page-content"><PageTitle eyebrow="REVIEW BY EVIDENCE" title="Grammar" subtitle="Red needs attention. Yellow needs retrieval. Green still returns on schedule." />
      <div className="filter-row">{(['all','red','yellow','green'] as const).map((value) => <button className={grammarFilter === value ? 'active' : ''} onClick={() => setGrammarFilter(value)} key={value}>{value === 'all' ? 'All topics' : <><span className={`traffic ${value}`}>●</span>{statusLabel[value]}</>}</button>)}</div>
      <div className="master-detail"><div className="master-list">{filtered.map((entry) => <button key={entry.id} onClick={() => setSelectedGrammar(entry.id)} className={item.id === entry.id ? 'active' : ''}><span className={`traffic ${entry.status}`}>●</span><span><b>{entry.title}</b><small>{entry.reviews} successful reviews</small></span><ChevronRight size={14} /></button>)}</div>
      <article className="grammar-detail"><div className="detail-head"><div><p className="eyebrow">CURRENT TOPIC</p><h2>{item.title}</h2></div><span className={`status-pill ${item.status}`}>{statusLabel[item.status]}</span></div><div className="rule-box"><small>SHORT RULE</small><p>{item.rule}</p></div><div className="correction-grid"><div><small>MY TYPICAL ERROR</small><code>{item.mistake}</code></div><div><small>CORRECT VERSION</small><code>{item.correction}</code></div></div><div className="examples"><small>MY EXAMPLES</small>{item.examples.map((example) => <p key={example}>{example}</p>)}</div><div className="review-meta"><span><b>{item.reviews}</b> successful reviews</span><span><b>{item.lastReview ? new Date(item.lastReview).toLocaleDateString() : '—'}</b> last review</span><span><b>{item.nextReview ? new Date(item.nextReview).toLocaleDateString() : 'Today'}</b> next review</span></div><div className="status-actions">{(['red','yellow','green'] as Traffic[]).map((status) => <button key={status} className={status} onClick={() => updateStatus(status)}><span>●</span>{statusLabel[status]}</button>)}</div></article></div>
    </div>;
  };

  const Vocabulary = () => {
    const now = Date.now(); const due = state.vocabulary.filter((item) => new Date(item.due).getTime() <= now); const card = due[0] ?? state.vocabulary[0];
    const rateCard = (rating: 'Again' | 'Hard' | 'Good' | 'Easy') => {
      if (!card) return; const multiplier = { Again: 0, Hard: 1.4, Good: 2.3, Easy: 3.7 }[rating]; const interval = rating === 'Again' ? 1 : Math.max(2, Math.round(card.interval * multiplier)); const next = new Date(); next.setDate(next.getDate() + interval);
      patchState({ vocabulary: state.vocabulary.map((item) => item.id === card.id ? { ...item, interval, due: next.toISOString() } : item) }); setShowBack(false); setToast(`Next review in ${interval} day${interval === 1 ? '' : 's'}`);
    };
    return <div className="page-content"><div className="page-title-row"><PageTitle eyebrow="ACTIVE LANGUAGE" title="Vocabulary" subtitle="Chunks, collocations and patterns you actually want to say." /><button className="secondary" onClick={() => setShowVocabForm(!showVocabForm)}><Plus size={14} /> Add card</button></div>
      {showVocabForm && <VocabForm onAdd={(front, back, pattern) => { patchState({ vocabulary: [{ id: uid('v'), front, back, pattern, interval: 1, due: new Date().toISOString() }, ...state.vocabulary] }); setShowVocabForm(false); }} />}
      <div className="srs-layout"><section className="srs-card" onClick={() => setShowBack(true)}><div className="srs-top"><span>{due.length} due now</span><span>{card?.pattern}</span></div><div className="srs-content"><small>{showBack ? 'BACK' : 'FRONT'}</small><h2>{showBack ? card?.back : card?.front}</h2>{!showBack && <p>Click or press Space to reveal</p>}{showBack && <code>{card?.pattern}</code>}</div><div className="srs-actions">{showBack ? ['Again','Hard','Good','Easy'].map((rating) => <button key={rating} onClick={(event) => { event.stopPropagation(); rateCard(rating as 'Again' | 'Hard' | 'Good' | 'Easy'); }}>{rating}<small>{rating === 'Again' ? '1d' : rating === 'Hard' ? '3d' : rating === 'Good' ? '6d' : '12d'}</small></button>) : <button className="primary" onClick={(event) => { event.stopPropagation(); setShowBack(true); }}>Show answer</button>}</div></section>
      <section className="panel vocab-list"><div className="panel-title"><div><p className="eyebrow">LIBRARY</p><h3>{state.vocabulary.length} active cards</h3></div></div>{state.vocabulary.slice(0, 8).map((item) => <div className="vocab-row" key={item.id}><div><b>{item.back}</b><small>{item.pattern}</small></div><span>{new Date(item.due).toLocaleDateString()}</span></div>)}</section></div>
    </div>;
  };

  const Speaking = () => <LogPage type="speaking" state={state} patchState={patchState} />;
  const Listening = () => <LogPage type="listening" state={state} patchState={patchState} />;

  const Errors = () => {
    const filtered = state.errors.filter((item) => (errorFilter === 'all' || item.status === errorFilter) && `${item.mistake} ${item.correction} ${item.rule}`.toLowerCase().includes(errorSearch.toLowerCase()));
    return <div className="page-content"><div className="page-title-row"><PageTitle eyebrow="CORRECT, RETRIEVE, REPEAT" title="Error log" subtitle="Turn recurring mistakes into evidence of improvement." /><button className="secondary" onClick={() => setShowErrorForm(!showErrorForm)}><Plus size={14} /> Add error</button></div>
      {showErrorForm && <ErrorForm onAdd={(entry) => { patchState({ errors: [{ ...entry, id: uid('e'), date: todayISO() }, ...state.errors] }); setShowErrorForm(false); }} />}
      <div className="filters"><label className="search"><Search size={14} /><input value={errorSearch} onChange={(event) => setErrorSearch(event.target.value)} placeholder="Search mistakes, corrections or rules" /></label><div className="segmented">{(['all','red','yellow','green'] as const).map((value) => <button className={errorFilter === value ? 'active' : ''} onClick={() => setErrorFilter(value)} key={value}>{value === 'all' ? 'All' : statusLabel[value]}</button>)}</div></div>
      <div className="error-table"><div className="error-header"><span>Date</span><span>My mistake</span><span>Correct version</span><span>Type</span><span>Rule</span><span>Status</span></div>{filtered.map((item) => <div className="error-row" key={item.id}><span>{new Date(item.date).toLocaleDateString()}</span><code>{item.mistake}</code><code className="correct">{item.correction}</code><span>{item.type}</span><span>{item.rule}</span><button className={`traffic-button ${item.status}`} onClick={() => patchState({ errors: state.errors.map((entry) => entry.id === item.id ? { ...entry, status: entry.status === 'red' ? 'yellow' : entry.status === 'yellow' ? 'green' : 'red' } : entry) })}>●</button></div>)}</div>
    </div>;
  };

  const Calendar = () => <div className="page-content"><PageTitle eyebrow="YOUR CONSISTENCY, AT A GLANCE" title="Calendar" subtitle="Intensity reflects completed study minutes, never perfection." /><section className="panel calendar-panel"><div className="panel-title"><div><p className="eyebrow">12 WEEKS</p><h3>Activity heatmap</h3></div><span>Less &nbsp; ▪ ▪ ▪ ▪ &nbsp; More</span></div><Heatmap state={state} startDate={state.startDate} /></section><div className="calendar-legend"><p><b>Missed a day?</b> Your programme is still intact.</p><span>Move tasks only when you choose. Nothing doubles automatically.</span></div></div>;

  const SettingsPage = () => (
    <div className="page-content narrow"><PageTitle eyebrow="LOCAL-FIRST & PRIVATE" title="Settings" subtitle="Your data stays on this device unless you export it." />
      <section className="settings-section"><div><h3>Programme start</h3><p>This date determines which Week and Day appears on Today.</p></div><input type="date" value={state.startDate} onChange={(event) => patchState({ startDate: event.target.value })} /></section>
      <section className="settings-section"><div><h3>Install on Windows</h3><p>Pin Level Up to Start or the taskbar and use it like a native app.</p></div><button className="secondary" disabled={!installPrompt} onClick={async () => { const prompt = installPrompt as Event & { prompt?: () => Promise<void> }; await prompt.prompt?.(); setInstallPrompt(null); }}><Download size={14} /> {installPrompt ? 'Install app' : 'Use browser install menu'}</button></section>
      <section className="settings-section"><div><h3>Backup</h3><p>Export everything to JSON or restore a previous backup.</p></div><div className="button-group"><button className="secondary" onClick={() => download(`level-up-backup-${todayISO()}.json`, JSON.stringify(state, null, 2), 'application/json')}><Download size={14} /> Export JSON</button><button className="secondary" onClick={() => importRef.current?.click()}><Upload size={14} /> Import JSON</button><input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; file.text().then((text) => { try { setState(JSON.parse(text) as AppState); setToast('Backup restored'); } catch { setToast('This backup could not be read'); } }); }} /></div></section>
      <section className="settings-section"><div><h3>Progress spreadsheet</h3><p>One row per day, ready for Excel or Google Sheets.</p></div><button className="secondary" onClick={() => { const rows = ['Week,Day,Date,Minutes,Completed tasks,Total tasks,Status']; roadmap.forEach((week) => week.days.forEach((day) => { const p = dayProgress(day, state); rows.push(`${week.number},${day.name},${dateForDay(state.startDate, week.number, day.day).toISOString().slice(0,10)},${p.minutes},${p.done},${p.total},${state.dayStatus[day.id] ?? ''}`); })); download(`level-up-progress-${todayISO()}.csv`, rows.join('\n'), 'text/csv'); }}><FileSpreadsheet size={14} /> Export CSV</button></section>
      <section className="settings-section danger-zone"><div><h3>Reset progress</h3><p>Export a backup first. This clears completion and notes, but keeps your libraries.</p></div><button className="secondary" onClick={() => { if (window.confirm('Clear completed tasks and daily notes?')) patchState({ completed: {}, notes: {}, dayStatus: {} }); }}><RotateCcw size={14} /> Clear progress</button></section>
    </div>
  );

  let screen: React.ReactNode;
  switch (active) {
    case 'roadmap': screen = Roadmap(); break;
    case 'progress': screen = Progress(); break;
    case 'grammar': screen = Grammar(); break;
    case 'vocabulary': screen = Vocabulary(); break;
    case 'speaking': screen = Speaking(); break;
    case 'listening': screen = Listening(); break;
    case 'errors': screen = Errors(); break;
    case 'calendar': screen = Calendar(); break;
    case 'settings': screen = SettingsPage(); break;
    default: screen = Today();
  }

  return (
    <main className={`app-shell ${ready ? 'ready' : ''}`}>
      <aside className="sidebar">
        <button className="brand" onClick={goToday}><span className="brand-mark">L</span><span><strong>Level Up</strong><small>English B1 → B2</small></span></button>
        <nav aria-label="Main navigation">{navItems.map((item) => { const Icon = item.icon; return <button aria-current={active === item.id ? 'page' : undefined} className={active === item.id ? 'active' : ''} key={item.id} onClick={() => { setActive(item.id); window.scrollTo(0,0); }}><Icon size={16} strokeWidth={1.8} /><span>{item.label}</span></button>; })}</nav>
        <button className={`settings ${active === 'settings' ? 'active' : ''}`} onClick={() => setActive('settings')}><Settings size={16} /><span>Settings</span></button>
      </aside>
      <section className="main-panel">
        <header className="topbar"><span className="eyebrow" suppressHydrationWarning>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()}</span><button className="streak" onClick={() => setActive('calendar')}><Flame size={13} fill="currentColor" /> 6 day streak</button></header>
        {screen}
      </section>
      {focus && <FocusSheet focus={focus} seconds={focusSeconds} running={focusRunning} onToggle={() => setFocusRunning((value) => !value)} onDone={finishFocus} onClose={() => { setFocus(null); setFocusRunning(false); }} />}
      {toast && <div className="toast" role="status"><Check size={14} />{toast}</div>}
    </main>
  );
}

function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <header className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></header>; }
function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) { return <article className="stat"><span className={`stat-icon ${color}`} /><small>{label}</small><strong>{value}</strong><p>{sub}</p></article>; }
function SkillBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) { return <div><span><b>{label}</b><em>{value} min</em></span><div><i className={color} style={{ width: `${clamp(value / max * 100, 2, 100)}%` }} /></div></div>; }

function Heatmap({ state, startDate, compact = false }: { state: AppState; startDate: string; compact?: boolean }) {
  const days = roadmap.flatMap((week) => week.days).slice(0, compact ? 49 : 84);
  return <div className={`heatmap ${compact ? 'compact' : ''}`}>{days.map((day) => { const p = dayProgress(day, state); const level = p.percent === 0 ? 0 : p.percent < 35 ? 1 : p.percent < 70 ? 2 : p.percent < 100 ? 3 : 4; const date = dateForDay(startDate, day.week, day.day); return <div className={`heat-cell level-${level}`} key={day.id} title={`${date.toLocaleDateString()} · ${p.minutes} min · ${p.done}/${p.total} tasks`}><span>{date.toLocaleDateString()}<br />{p.minutes} min · {p.done}/{p.total} tasks</span></div>; })}</div>;
}

function WeeklyReflection({ week, state, setState }: { week: number; state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const key = `week-${week}`; const value = state.reflections[key] ?? { difficult: '', improved: '', priority: '' };
  const update = (field: keyof typeof value, text: string) => setState((current) => ({ ...current, reflections: { ...current.reflections, [key]: { ...value, [field]: text } } }));
  return <section className="reflection"><p className="eyebrow">WEEKLY REVIEW</p><h2>Close the week with three honest answers.</h2><div>{([['difficult','What felt difficult?'],['improved','What improved?'],['priority','What should be the priority next week?']] as const).map(([field,label]) => <label key={field}><span>{label}</span><textarea value={value[field]} onChange={(event) => update(field,event.target.value)} placeholder="Write one clear thought…" /></label>)}</div></section>;
}

function FocusSheet({ focus, seconds, running, onToggle, onDone, onClose }: { focus: { task: StudyTask; block: StudyBlock }; seconds: number; running: boolean; onToggle: () => void; onDone: () => void; onClose: () => void }) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2,'0'); const secs = (seconds % 60).toString().padStart(2,'0');
  return <div className="sheet-scrim" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="focus-sheet" role="dialog" aria-modal="true" aria-label="Focus session"><button className="sheet-close" onClick={onClose}><X size={18} /></button><span className={`focus-orb ${focus.block.accent}`}><Clock3 size={23} /></span><p className="eyebrow">FOCUS SESSION · {focus.block.title.toUpperCase()}</p><div className="timer">{minutes}:{secs}</div><p className="focus-task">{focus.task.label}</p><div className="focus-controls"><button className="primary round" onClick={onToggle}>{running ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}{running ? 'Pause' : 'Start'}</button><button className="secondary round" onClick={onDone}><Check size={18} /> Done</button></div></section></div>;
}

function VocabForm({ onAdd }: { onAdd: (front: string, back: string, pattern: string) => void }) {
  const [front,setFront]=useState(''); const [back,setBack]=useState(''); const [pattern,setPattern]=useState('');
  return <form className="inline-form" onSubmit={(event) => { event.preventDefault(); if (front && back) onAdd(front,back,pattern || 'chunk'); }}><label><span>Front</span><input value={front} onChange={(e)=>setFront(e.target.value)} placeholder="Мне следовало…" required /></label><label><span>Back</span><input value={back} onChange={(e)=>setBack(e.target.value)} placeholder="I should have…" required /></label><label><span>Pattern</span><input value={pattern} onChange={(e)=>setPattern(e.target.value)} placeholder="should have + V3" /></label><button className="primary">Add to review</button></form>;
}

function ErrorForm({ onAdd }: { onAdd: (entry: Omit<ErrorItem,'id'|'date'>) => void }) {
  const [mistake,setMistake]=useState(''); const [correction,setCorrection]=useState(''); const [type,setType]=useState('Grammar'); const [rule,setRule]=useState('');
  return <form className="inline-form error-form" onSubmit={(event) => { event.preventDefault(); if(mistake&&correction) onAdd({mistake,correction,type,rule,status:'red'}); }}><label><span>My mistake</span><input value={mistake} onChange={(e)=>setMistake(e.target.value)} placeholder="I have saw…" required /></label><label><span>Correct version</span><input value={correction} onChange={(e)=>setCorrection(e.target.value)} placeholder="I have seen…" required /></label><label><span>Type</span><select value={type} onChange={(e)=>setType(e.target.value)}>{['Grammar','Vocabulary','Collocation','Word order','Pronunciation','Unnatural phrasing'].map((item)=><option key={item}>{item}</option>)}</select></label><label><span>Rule</span><input value={rule} onChange={(e)=>setRule(e.target.value)} placeholder="have + V3" /></label><button className="primary">Save error</button></form>;
}

function LogPage({ type, state, patchState }: { type: 'speaking' | 'listening'; state: AppState; patchState: (patch: Partial<AppState>) => void }) {
  const speaking = type === 'speaking'; const [open,setOpen]=useState(false); const [title,setTitle]=useState(''); const [duration,setDuration]=useState(20); const [target,setTarget]=useState('');
  const entries = speaking ? state.speaking : state.listening; const total = entries.reduce((sum,item)=>sum+item.duration,0);
  const add = (event: React.FormEvent) => { event.preventDefault(); if(!title) return; if(speaking) patchState({speaking:[{id:uid('s'),date:todayISO(),topic:title,duration,target,mistakes:'',attempt1:'yellow',attempt2:'green'},...state.speaking]}); else patchState({listening:[{id:uid('l'),date:todayISO(),title,url:'',duration,subtitles:false,comprehension:3,chunks:0,summary:false,difficulty:'Medium'},...state.listening]}); setTitle('');setOpen(false); };
  return <div className="page-content"><div className="page-title-row"><PageTitle eyebrow={speaking?'SAY IT, CORRECT IT, SAY IT AGAIN':'LISTEN FOR MEANING FIRST'} title={speaking?'Speaking':'Listening'} subtitle={speaking?'Track the second attempt—the one where feedback becomes skill.':'Measure comprehension before captions, then close the gaps.'} /><button className="secondary" onClick={()=>setOpen(!open)}><Plus size={14}/> Add session</button></div>
    {open&&<form className="inline-form" onSubmit={add}><label><span>{speaking?'Topic':'Video title'}</span><input value={title} onChange={(e)=>setTitle(e.target.value)} required /></label><label><span>Duration</span><input type="number" min="1" value={duration} onChange={(e)=>setDuration(Number(e.target.value))}/></label>{speaking&&<label><span>Grammar target</span><input value={target} onChange={(e)=>setTarget(e.target.value)} /></label>}<button className="primary">Save session</button></form>}
    <div className="log-summary"><Stat label="Total practice" value={`${total} min`} sub={`${entries.length} recorded sessions`} color={speaking?'orange':'blue'} />{!speaking&&<Stat label="Average comprehension" value={`${(state.listening.reduce((s,i)=>s+i.comprehension,0)/Math.max(1,state.listening.length)).toFixed(1)}/5`} sub="before subtitles" color="green" />}{speaking&&<Stat label="Improved attempts" value={`${state.speaking.filter((i)=>i.attempt2==='green').length}`} sub="finished green" color="green" />}</div>
    <div className="log-list">{speaking ? state.speaking.map((item)=><article key={item.id}><div className="log-icon orange"><Mic2 size={17}/></div><div><small>{new Date(item.date).toLocaleDateString()} · {item.duration} min</small><h3>{item.topic}</h3><p>Target: <code>{item.target||'Fluency'}</code></p></div><div className="attempts"><span>Attempt 1 <i className={`traffic ${item.attempt1}`}>●</i></span><ArrowRight size={13}/><span>After feedback <i className={`traffic ${item.attempt2}`}>●</i></span></div></article>) : state.listening.map((item)=><article key={item.id}><div className="log-icon blue"><Headphones size={17}/></div><div><small>{new Date(item.date).toLocaleDateString()} · {item.duration} min</small><h3>{item.title}</h3><p>{item.subtitles?'With':'Without'} subtitles first · {item.chunks} new chunks</p></div><div className="comprehension"><strong>{item.comprehension}/5</strong><span>comprehension</span></div></article>)}</div>
  </div>;
}
