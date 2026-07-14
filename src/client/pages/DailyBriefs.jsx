import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useToast } from '../context/ToastContext.jsx';
import { 
  Sparkles, 
  Calendar, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Brain, 
  FileText, 
  Tag, 
  BarChart2, 
  Compass, 
  Activity, 
  ArrowRight, 
  BookOpen 
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import api from '../utils/api.js';

export default function DailyBriefs() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { showToast } = useToast();
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/blogs/daily-briefs');
      const data = res.data.report || [];
      setReport(data);
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      // If there is a report for today, default to today, else select the most recent date with activity
      if (!selectedDate) {
        const hasTodayReport = data.some(r => r.date === todayStr);
        if (hasTodayReport) {
          setSelectedDate(todayStr);
        } else if (data.length > 0) {
          setSelectedDate(data[0].date);
        } else {
          setSelectedDate(todayStr);
        }
      }
    } catch (err) {
      console.error('Failed to fetch daily briefs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReport();
    }
  }, [isAuthenticated]);

  const weekDays = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  });

  const getBriefForDate = (dateStr) => report.find(r => r.date === dateStr);
  const getBlogsCountForDate = (dateStr) => {
    const brief = getBriefForDate(dateStr);
    return brief?.blogsCount || 0;
  };
  const hasBriefForDate = (dateStr) => !!getBriefForDate(dateStr)?.hasBrief;

  const handleGenerateBrief = async (dateStr) => {
    setIsGenerating(true);
    try {
      const res = await api.post('/api/blogs/daily-brief/generate', { date: dateStr });
      showToast(`AI summary for ${format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')} generated successfully!`, 'success');
      await fetchReport();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to generate AI summary.';
      showToast(errorMsg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-[80vh] flex items-center justify-center bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden px-4">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-md w-full p-8 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl shadow-xl shadow-slate-100/50 dark:shadow-none text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-650 dark:text-indigo-400 mx-auto border border-indigo-500/10">
            <Brain className="w-10 h-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-500/10 rounded-full border border-indigo-500/20 mx-auto">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Premium Feature</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-3">Daily AI Briefs</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              Unlock daily AI summaries, category activity metrics, tag trends, and structural themes synthesized from our writing community.
            </p>
          </div>
          <div className="pt-4">
            <Link
              to="/login"
              className="w-full inline-block px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/10 transition-all text-center active:scale-95"
            >
              Sign In to Unlock
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 animate-pulse space-y-8">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 py-12 space-y-8 relative z-10">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-500/10 rounded-full border border-indigo-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Intelligence Dashboard</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              Daily AI Briefs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-base max-w-xl">
              Unlocking insights from community writing. Explore trends, themes, and summaries synthesized daily by AI.
            </p>
          </div>

          {/* Week Selector Controls */}
          <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md p-2 rounded-2xl self-start md:self-center shadow-sm">
            <button
              onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-3 uppercase tracking-wider">
              {format(currentWeekStart, 'MMM d')} – {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekly Grid Picker */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
          {weekDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
            const isSelected = selectedDate === dateStr;
            const count = getBlogsCountForDate(dateStr);
            const hasBrief = hasBriefForDate(dateStr);

            let statusBg = "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 hover:border-indigo-500/50 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10";
            
            if (hasBrief) {
              statusBg = "bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200/60 dark:border-indigo-900/40 hover:from-indigo-100 hover:to-indigo-100 dark:hover:from-indigo-950/30 shadow-indigo-500/5";
            } else if (count > 0) {
              statusBg = "bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/10 dark:to-emerald-900/10 border-emerald-200/60 dark:border-emerald-900/40 hover:from-emerald-100 dark:hover:from-emerald-950/20 shadow-emerald-500/5";
            }

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(dateStr)}
                className={`group relative flex flex-col items-center justify-center p-4 border rounded-2xl transition-all duration-300 shadow-sm active:scale-95 ${statusBg} ${isSelected ? 'ring-2 ring-indigo-650 dark:ring-indigo-400 border-transparent shadow-lg shadow-indigo-500/15 scale-102 z-10' : ''} ${isToday && !isSelected ? 'border-dashed border-indigo-400' : ''}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-550 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                  {format(day, 'EEEE')}
                </span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 leading-none">
                  {format(day, 'd')}
                </span>
                
                <div className="mt-3 flex items-center justify-center gap-1.5 h-5">
                  {hasBrief && (
                    <div className="flex items-center gap-1 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border border-indigo-500/10">
                      <Brain className="w-2.5 h-2.5 animate-pulse" />
                      <span>Brief</span>
                    </div>
                  )}
                  {count > 0 && !hasBrief && (
                    <div className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border border-emerald-500/10">
                      <CalendarDays className="w-2.5 h-2.5" />
                      <span>{count} {count === 1 ? 'Blog' : 'Blogs'}</span>
                    </div>
                  )}
                  {count === 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-800 group-hover:bg-indigo-400/50 transition-colors" />
                  )}
                </div>

                {isToday && (
                  <span className="absolute top-1.5 right-2 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Details Dashboard */}
        <div className="bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl shadow-slate-100/50 dark:shadow-none min-h-[350px] relative">
          {selectedDate ? (
            <DailyBriefDetail
              date={selectedDate}
              brief={getBriefForDate(selectedDate)}
              onClose={() => setSelectedDate(null)}
              onGenerate={handleGenerateBrief}
              isGenerating={isGenerating}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 shadow-inner">
                <Calendar className="w-9 h-9 text-indigo-500 dark:text-indigo-450 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Unlock Community Insights</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select a day from the weekly calendar above to explore AI summaries, primary discussion themes, and overall publication analytics.
                </p>
              </div>
              <div className="flex gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-2 bg-slate-100/50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500/20 border border-indigo-500/40 inline-block" />
                  AI Brief Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
                  Published Content Only
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DailyBriefDetail({ date, brief, onClose, onGenerate, isGenerating }) {
  const formatFullDate = (dateStr) => format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  const blogs = brief?.blogs || [];
  const blogsCount = brief?.blogsCount || 0;

  // Compute stats dynamically
  const categoryCounts = {};
  blogs.forEach(b => {
    const cat = b.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const uniqueCategoriesCount = Object.keys(categoryCounts).length;
  const allTags = Array.from(new Set(blogs.flatMap(b => b.tags || []))).slice(0, 12);

  const parseTheme = (themeStr) => {
    const idx = themeStr.indexOf(':');
    if (idx !== -1) {
      return {
        title: themeStr.slice(0, idx).trim(),
        desc: themeStr.slice(idx + 1).trim()
      };
    }
    return { title: 'Theme Highlight', desc: themeStr };
  };

  return (
    <div className="space-y-8">
      
      {/* Detail header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-5 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-650 dark:text-indigo-400">Daily Insights Report</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{formatFullDate(date)}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-250 transition-all self-start sm:self-center"
          aria-label="Close details"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {brief?.hasBrief ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: AI Summary & Key Themes (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* AI Summary Block */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-purple-50/20 to-white dark:from-indigo-950/25 dark:via-purple-950/10 dark:to-slate-900 border border-indigo-150/40 dark:border-indigo-900/30 overflow-hidden group shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2.5 text-indigo-750 dark:text-indigo-300 mb-4">
                <div className="p-1.5 bg-indigo-500/15 dark:bg-indigo-400/20 rounded-lg">
                  <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="font-extrabold uppercase text-xs tracking-wider">AI Narrative Summary</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px] whitespace-pre-wrap font-medium">
                {brief.summary}
              </p>
            </div>

            {/* Key Themes Block */}
            {brief.keyThemes?.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  Primary Discussion Themes
                </h3>
                <div className="grid grid-cols-1 gap-4 animate-fade-in">
                  {brief.keyThemes.map((theme, idx) => {
                    const parsed = parseTheme(theme);
                    return (
                      <div
                        key={idx}
                        className="p-5 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-indigo-500 dark:border-l-indigo-400"
                      >
                        <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 text-xs font-black">
                            {idx + 1}
                          </span>
                          {parsed.title}
                        </h4>
                        <p className="text-slate-650 dark:text-slate-400 text-sm mt-2 leading-relaxed pl-8">
                          {parsed.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Analytics, Category Distribution, Published Articles (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center shadow-sm">
                <div className="flex justify-center mb-1 text-indigo-500"><FileText className="w-5 h-5" /></div>
                <div className="text-xl font-black text-slate-800 dark:text-white leading-none mt-1">{blogsCount}</div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1.5">Articles</div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center shadow-sm">
                <div className="flex justify-center mb-1 text-indigo-500"><Compass className="w-5 h-5" /></div>
                <div className="text-xl font-black text-slate-800 dark:text-white leading-none mt-1">{uniqueCategoriesCount}</div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1.5">Categories</div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center shadow-sm">
                <div className="flex justify-center mb-1 text-indigo-500"><Tag className="w-5 h-5" /></div>
                <div className="text-xl font-black text-slate-800 dark:text-white leading-none mt-1">{allTags.length}</div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1.5">Tags</div>
              </div>
            </div>

            {/* Category Distribution Visualization */}
            {uniqueCategoriesCount > 0 && (
              <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 animate-pulse" />
                  Category Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(categoryCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => {
                      const pct = Math.round((count / blogsCount) * 100);
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700 dark:text-slate-300">{category}</span>
                            <span className="text-slate-500 dark:text-slate-450">{count} {count === 1 ? 'post' : 'posts'} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-indigo-550 to-purple-550 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Tags Cloud */}
            {allTags.length > 0 && (
              <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Key Discussion Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-semibold bg-indigo-550/5 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/30 text-indigo-750 dark:text-indigo-350 rounded-lg transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Articles Published List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Articles Published Today ({blogsCount})
              </h3>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {blogs.map((b, idx) => (
                  <Link
                    key={idx}
                    to={b.slug ? `/blog/${b.slug}` : '#'}
                    className="flex flex-col p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/30 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 shadow-sm transition-all group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10">
                        {b.category || 'General'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors group-hover:translate-x-1" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {b.title}
                    </p>
                    {b.tags && b.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {b.tags.slice(0, 3).map((tag, tIdx) => (
                          <span key={tIdx} className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>
      ) : brief && blogsCount > 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 shadow-inner">
            <CalendarDays className="w-10 h-10 text-emerald-500 dark:text-emerald-450" />
          </div>
          
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              {blogsCount} article{blogsCount !== 1 ? 's' : ''} published today
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              A brief summary has not been generated for today's activity. Generate it now using the intelligence engine!
            </p>
          </div>

          <button
            onClick={() => onGenerate(date)}
            disabled={isGenerating}
            className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Synthesizing Community Data...</span>
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 animate-bounce" />
                <span>Generate AI Daily Brief</span>
              </>
            )}
          </button>

          {/* Published Articles List fallback */}
          <div className="w-full max-w-xl text-left border-t border-slate-200/50 dark:border-slate-800/50 pt-6 mt-6">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4" />
              Published Articles
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {blogs.map((b, idx) => (
                <Link
                  key={idx}
                  to={b.slug ? `/blog/${b.slug}` : '#'}
                  className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-slate-50/50 transition-all group shadow-sm"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{b.title}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">{b.category || 'General'}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center border border-slate-200/20">
            <Activity className="w-7 h-7 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-850 dark:text-slate-300">Quiet Day in the Community</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              No articles were published on {formatFullDate(date)}. Check out other dates on the weekly planner above!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}