import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Calendar, CalendarDays, ChevronLeft, ChevronRight, Brain } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import api from '../utils/api.js';

export default function DailyBriefs() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/blogs/daily-briefs');
      setReport(res.data.report || []);
    } catch (err) {
      console.error('Failed to fetch daily briefs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

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

  const formatDateLabel = (date) => format(date, 'EEE, MMM d');
  const formatFullDate = (dateStr) => format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');

  const handleGenerateBrief = async (dateStr) => {
    const btn = event?.target?.closest('button');
    if (btn) btn.disabled = true;
    try {
      const res = await api.post('/api/blogs/daily-brief/generate', { date: dateStr });
      alert(`AI summary for ${formatFullDate(dateStr)} generated successfully!`);
      fetchReport();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to generate AI summary.';
      if (errorMsg.includes('No published blogs found')) {
        // This is expected for days with no posts - show a nice message instead of alert
        return; // The UI will handle showing "no updates" message
      }
      alert(errorMsg);
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-8">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Daily AI Briefs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            AI-generated daily summaries of community blog activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Week of {format(currentWeekStart, 'MMM d')} – {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDays.map((day, idx) => (
          <button
            key={idx}
            onClick={() => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const brief = getBriefForDate(dateStr);
              if (brief && (brief.blogsCount > 0 || brief.hasBrief)) {
                setSelectedDate(dateStr);
              }
            }}
            disabled={!getBriefForDate(format(day, 'yyyy-MM-dd')) || getBlogsCountForDate(format(day, 'yyyy-MM-dd')) === 0}
            className={`relative p-3 rounded-xl text-center transition-all ${
              format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                ? 'ring-2 ring-primary-500 dark:ring-primary-400'
                : ''
            } ${getBriefForDate(format(day, 'yyyy-MM-dd')) ? (
              hasBriefForDate(format(day, 'yyyy-MM-dd'))
                ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/50'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 cursor-pointer'
            ) : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed'} ${selectedDate === format(day, 'yyyy-MM-dd') ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''}`}
          >
            <div className="text-xs font-medium">{format(day, 'EEE')}</div>
            <div className="text-lg font-bold mt-1">{format(day, 'd')}</div>
            {getBriefForDate(format(day, 'yyyy-MM-dd')) && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                {hasBriefForDate(format(day, 'yyyy-MM-dd')) && (
                  <Brain className="w-3 h-3 text-indigo-500" title="AI Brief available" />
                )}
                {getBlogsCountForDate(format(day, 'yyyy-MM-dd')) > 0 && !hasBriefForDate(format(day, 'yyyy-MM-dd')) && (
                  <CalendarDays className="w-3 h-3 text-emerald-500" title={`${getBlogsCountForDate(format(day, 'yyyy-MM-dd'))} blog(s) published`} />
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
        {selectedDate ? (
          <DailyBriefDetail
            date={selectedDate}
            brief={getBriefForDate(selectedDate)}
            onClose={() => setSelectedDate(null)}
            onGenerate={handleGenerateBrief}
          />
        ) : (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Select a day to view the daily brief</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Days with an <Brain className="w-4 h-4 inline text-indigo-500" /> have an AI summary. 
              Days with a <CalendarDays className="w-4 h-4 inline text-emerald-500" /> have published blogs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DailyBriefDetail({ date, brief, onClose, onGenerate }) {
  const formatFullDate = (dateStr) => format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Daily Brief</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{formatFullDate(date)}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close brief"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {brief?.hasBrief ? (
        <div className="space-y-6">
          <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 mb-3">
              <Brain className="w-5 h-5" />
              <span className="font-semibold">AI Summary</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{brief.summary}</p>
          </div>

          {brief.keyThemes?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Key Themes
              </h3>
              <div className="flex flex-wrap gap-2">
                {brief.keyThemes.map((theme, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-700 dark:text-slate-300"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Articles Published ({brief.blogsCount})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {brief.blogs.map((b, idx) => (
                <Link
                  key={idx}
                  to={`/blog/${b.slug}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{b.title}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{b.category || 'General'}</span>
                  </div>
                  {b.tags && b.tags.length > 0 && (
                    <div className="flex gap-1 ml-3">
                      {b.tags.slice(0, 2).map((tag, tIdx) => (
                        <span key={tIdx} className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded-full border border-purple-100/30">
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
      ) : brief && brief.blogsCount > 0 ? (
        <div className="text-center py-12">
          <CalendarDays className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {brief.blogsCount} article{brief.blogsCount !== 1 ? 's' : ''} published today
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            No AI brief has been generated for this day yet.
          </p>
          <button
            onClick={() => onGenerate(date)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 mx-auto"
          >
            <Brain className="w-5 h-5" />
            Generate AI Daily Brief
          </button>
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Articles Published</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {brief.blogs.map((b, idx) => (
                <Link
                  key={idx}
                  to={`/blog/${b.slug}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{b.title}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{b.category || 'General'}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No activity on this day</h3>
          <p className="text-slate-500 dark:text-slate-400">No blogs were published on {formatFullDate(date)}.</p>
        </div>
      )}
    </div>
  );
}