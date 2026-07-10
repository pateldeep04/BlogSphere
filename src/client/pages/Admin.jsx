import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Shield, Users, BookOpen, AlertTriangle, ShieldCheck, Trash2, Edit3, ArrowLeft, X, Sparkles, TrendingUp, DollarSign, Eye, Heart, FileDown, RefreshCw, Award } from 'lucide-react';
import api from '../utils/api.js';

export default function Admin() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');
  const [usersList, setUsersList] = useState([]);
  const [blogsList, setBlogsList] = useState([]);
  const [restrictedWords, setRestrictedWords] = useState([]);
  const [flaggedBlogs, setFlaggedBlogs] = useState([]);
  const [newRestrictedWord, setNewRestrictedWord] = useState('');
  const [wordAdding, setWordAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [triggeringPost, setTriggeringPost] = useState(false);
  const [earningsReport, setEarningsReport] = useState([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Daily AI Brief states
  const [dailyReport, setDailyReport] = useState([]);
  const [dailyReportLoading, setDailyReportLoading] = useState(false);
  const [generatingBriefDate, setGeneratingBriefDate] = useState('');

  const fetchDailyReport = async () => {
    setDailyReportLoading(true);
    try {
      const res = await api.get('/api/blogs/admin/daily-analytics');
      setDailyReport(res.data.report || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch daily analytics report.');
    } finally {
      setDailyReportLoading(false);
    }
  };

  const handleGenerateDailyBrief = async (date) => {
    setGeneratingBriefDate(date);
    try {
      const res = await api.post('/api/blogs/admin/daily-brief/generate', { date });
      alert(`AI summary for ${date} generated successfully!`);
      // Update local report with generated brief
      setDailyReport(prev => prev.map(item => {
        if (item.date === date) {
          return {
            ...item,
            hasBrief: true,
            summary: res.data.brief.summary,
            keyThemes: res.data.brief.keyThemes
          };
        }
        return item;
      }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate AI summary brief.');
    } finally {
      setGeneratingBriefDate('');
    }
  };

  const handleTriggerAutoPost = async () => {
    setTriggeringPost(true);
    try {
      const res = await api.post('/api/blogs/trigger-trending-post');
      alert(`Successfully published AI Trending Article: "${res.data.blog.title}"`);
      const blogsRes = await api.get('/api/blogs?status=all');
      setBlogsList(blogsRes.data.blogs || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to trigger automated trending post.');
    } finally {
      setTriggeringPost(false);
    }
  };

  const fetchEarningsReport = async () => {
    setEarningsLoading(true);
    try {
      const res = await api.get('/api/users/earnings-report');
      setEarningsReport(res.data.report || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch earnings report.');
    } finally {
      setEarningsLoading(false);
    }
  };

  // Download as CSV (opens in Excel)
  const downloadExcel = () => {
    const headers = ['Rank','Name','Email','Username','Role','Posts','Views','Likes','Reactions','Comments','Est. Earnings ($)','Top Post'];
    const rows = earningsReport.map((r, i) => [
      i + 1,
      r.name,
      r.email,
      r.username,
      r.role,
      r.totalPosts,
      r.totalViews,
      r.totalLikes,
      r.totalReactions,
      r.totalComments,
      r.estimatedEarnings,
      r.topPost ? r.topPost.title : 'N/A'
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BlogSphere_Earnings_Report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Load Admin Data
  useEffect(() => {
    setLoading(true);
    setError('');

    Promise.all([
      api.get('/api/users'),
      api.get('/api/blogs?status=all'),
      api.get('/api/restricted-words'),
      api.get('/api/blogs/flagged')
    ])
      .then(([usersRes, blogsRes, wordsRes, flaggedRes]) => {
        setUsersList(usersRes.data.users || []);
        setBlogsList(blogsRes.data.blogs || []);
        setRestrictedWords(wordsRes.data.words || []);
        setFlaggedBlogs(flaggedRes.data.blogs || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to fetch administration data.');
        setLoading(false);
      });
  }, []);

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!newRestrictedWord.trim()) return;
    setWordAdding(true);
    try {
      const res = await api.post('/api/restricted-words', { word: newRestrictedWord.trim() });
      setRestrictedWords([...restrictedWords, res.data.word].sort((a, b) => a.word.localeCompare(b.word)));
      setNewRestrictedWord('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add restricted word.');
    } finally {
      setWordAdding(false);
    }
  };

  const handleDeleteWord = async (wordId) => {
    if (window.confirm('Are you sure you want to remove this word from restrictions?')) {
      try {
        await api.delete(`/api/restricted-words/${wordId}`);
        setRestrictedWords(restrictedWords.filter(w => w._id !== wordId));
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete restricted word.');
      }
    }
  };

  // User Administration Updates
  const handleUpdateRole = async (targetId, newRole) => {
    try {
      const res = await api.put(`/api/users/${targetId}`, { role: newRole });
      setUsersList(usersList.map(u => u._id === targetId ? { ...u, role: newRole } : u));
    } catch (e) {
      console.error(e);
      alert('Failed to update user role.');
    }
  };

  const handleDeleteUser = async (targetId) => {
    if (window.confirm('WARNING: Deleting this user will purge their account and delete all of their authored blogs. Are you sure?')) {
      try {
        await api.delete(`/api/users/${targetId}`);
        setUsersList(usersList.filter(u => u._id !== targetId));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Blog Administration Updates
  const handleDeleteBlog = async (blogId) => {
    if (window.confirm('Are you sure you want to delete this blog post? This action is permanent.')) {
      try {
        await api.delete(`/api/blogs/${blogId}`);
        setBlogsList(blogsList.filter(b => b._id !== blogId));
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse space-y-8">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[95%] 2xl:max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-wrap justify-between items-start sm:items-center gap-4 w-full max-w-full">
        <div className="flex items-center gap-3 min-w-0">
          <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Admin Control Panel</h1>
            <p className="text-xs text-slate-400 mt-1">Manage user accounts, roles, spam moderation, and content auditing.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleTriggerAutoPost}
          disabled={triggeringPost}
          className="flex shrink-0 items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-650 hover:from-primary-750 hover:to-indigo-750 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-primary-500/10 disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className={`w-4 h-4 ${triggeringPost ? 'animate-spin' : ''}`} />
          <span>{triggeringPost ? 'Generating AI Post...' : 'Trigger AI Auto-Post'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl dark:bg-rose-950/20 dark:border-rose-900/30">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-full w-fit mb-6 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'users'
              ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Profiles ({usersList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('blogs')}
          className={`px-6 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'blogs'
              ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Blogs Moderation ({blogsList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('restricted')}
          className={`px-6 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'restricted'
              ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Restricted Words ({restrictedWords.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('flagged'); }}
          className={`px-6 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'flagged'
              ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-455 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Flagged Posts ({flaggedBlogs.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('earnings'); if (earningsReport.length === 0) fetchEarningsReport(); }}
          className={`px-6 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'earnings'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span>Earnings Report</span>
        </button>
        <button
          onClick={() => { setActiveTab('dailyBrief'); fetchDailyReport(); }}
          className={`px-6 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'dailyBrief'
              ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>Daily AI Brief</span>
        </button>
      </div>

      {/* Content Container */}
      <div className="p-6 border rounded-3xl bg-white border-slate-100 dark:bg-slate-900 shadow-sm">
        {activeTab === 'users' ? (
          /* Users Management Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pl-2">User details</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3">Current Role</th>
                  <th className="pb-3">Update Role</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((usr) => (
                  <tr key={usr._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 pl-2 flex items-center gap-3">
                      <img src={usr.profileImage} className="w-9 h-9 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-slate-850 dark:text-slate-100 block">{usr.name}</span>
                        <span className="text-[10px] text-slate-400">Created: {new Date(usr.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-4 text-slate-600 dark:text-slate-400">{usr.email}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        usr.role === 'admin'
                          ? 'bg-indigo-50 text-indigo-655 dark:bg-indigo-950/20 dark:text-indigo-400'
                          : usr.role === 'author'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {usr.role}
                      </span>
                    </td>
                    <td className="py-4">
                      {usr._id !== user._id ? (
                        <select
                          value={usr.role}
                          onChange={(e) => handleUpdateRole(usr._id, e.target.value)}
                          className="px-2.5 py-1 text-xs border rounded-lg bg-slate-50 border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                        >
                          <option value="reader">Reader</option>
                          <option value="author">Author</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Self Account</span>
                      )}
                    </td>
                    <td className="py-4 text-right pr-2">
                      {usr._id !== user._id && (
                        <button
                          onClick={() => handleDeleteUser(usr._id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-colors"
                          title="Purge User Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'blogs' ? (
          /* Blogs Management Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pl-2">Article details</th>
                  <th className="pb-3">Author details</th>
                  <th className="pb-3 text-center">Views</th>
                  <th className="pb-3 text-center">Likes</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {blogsList.map((blog) => (
                  <tr key={blog._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 pl-2 font-semibold text-slate-800 dark:text-slate-100 max-w-xs truncate">
                      <Link to={`/blog/${blog.slug}`} className="hover:underline">{blog.title}</Link>
                      <span className="block text-[9px] text-slate-400 font-normal uppercase tracking-wider mt-0.5">
                        {blog.category ? `${blog.category} • ` : ''}{blog.status}
                      </span>
                    </td>
                    <td className="py-4 text-slate-600 dark:text-slate-400">
                      {blog.author?.name || 'Deleted Account'}
                    </td>
                    <td className="py-4 text-center font-semibold text-slate-700 dark:text-slate-300">{blog.views || 0}</td>
                    <td className="py-4 text-center font-semibold text-slate-700 dark:text-slate-300">{blog.likes?.length || 0}</td>
                    <td className="py-4 text-right pr-2">
                      <button
                        onClick={() => handleDeleteBlog(blog._id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-colors"
                        title="Delete Post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'restricted' ? (
          /* Restricted Words Tab */
          <div className="space-y-6">
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Content Moderation & Filter</h3>
              <p className="text-xs text-slate-400 mt-1">
                Add words that you want to restrict on the platform. Users will be blocked from submitting posts or comments containing these keywords.
              </p>
              
              <form onSubmit={handleAddWord} className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={newRestrictedWord}
                  onChange={(e) => setNewRestrictedWord(e.target.value)}
                  placeholder="e.g. spamword"
                  disabled={wordAdding}
                  className="flex-1 px-4 py-2.5 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={wordAdding || !newRestrictedWord.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-primary-500/10"
                >
                  {wordAdding ? 'Adding...' : 'Restrict Word'}
                </button>
              </form>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Restricted Word List</h4>
              {restrictedWords.length === 0 ? (
                <div className="p-6 text-center border border-dashed rounded-2xl text-slate-400 dark:border-slate-800 italic text-sm">
                  No restricted words configured yet. The platform is currently open!
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {restrictedWords.map((item) => (
                    <span
                      key={item._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200/50 dark:border-slate-800 transition-all"
                    >
                      <span>{item.word}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteWord(item._id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove word constraint"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'flagged' ? (
          /* Flagged Posts Tab */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pl-2">Flagged Article</th>
                  <th className="pb-3">Author</th>
                  <th className="pb-3 text-center">Flags</th>
                  <th className="pb-3">Last Reported Concern</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {flaggedBlogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                      No reported content! The community is safe and clean. ✨
                    </td>
                  </tr>
                ) : (
                  flaggedBlogs.map((blog) => (
                    <tr key={blog._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 pl-2 font-semibold text-slate-800 dark:text-slate-100 max-w-xs truncate">
                        <Link to={`/blog/${blog.slug}`} className="hover:underline">{blog.title}</Link>
                        <span className="block text-[9px] text-slate-400 font-normal uppercase tracking-wider mt-0.5">
                          {blog.category ? `${blog.category} • ` : ''}{blog.status}
                        </span>
                      </td>
                      <td className="py-4 text-slate-650 dark:text-slate-400">
                        {blog.author?.name || 'Anonymous'}
                      </td>
                      <td className="py-4 text-center font-bold text-rose-600 dark:text-rose-400">
                        🚨 {blog.reports?.length || 0}
                      </td>
                      <td className="py-4 text-slate-550 dark:text-slate-400 text-xs italic max-w-xs truncate">
                        {blog.reports?.[blog.reports.length - 1]?.reason || 'No details provided'}
                      </td>
                      <td className="py-4 text-right pr-2 space-x-2">
                        <button
                          onClick={async () => {
                            if (window.confirm('Dismiss all flag reports for this post?')) {
                              try {
                                await api.post(`/api/blogs/${blog._id}/dismiss-reports`);
                                setFlaggedBlogs(flaggedBlogs.filter(b => b._id !== blog._id));
                                alert('All report alerts dismissed successfully.');
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to dismiss reports.');
                              }
                            }
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-lg transition-all inline-block animate-scale-in"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this reported post? This action is permanent.')) {
                              try {
                                await api.delete(`/api/blogs/${blog._id}`);
                                setFlaggedBlogs(flaggedBlogs.filter(b => b._id !== blog._id));
                                setBlogsList(blogsList.filter(b => b._id !== blog._id));
                                alert('Reported post deleted successfully.');
                              } catch (err) {
                                alert(err.response?.data?.error || 'Failed to delete post.');
                              }
                            }
                          }}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-colors inline-block align-middle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* ── Earnings Report Tab ── */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            {/* Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  Creator Earnings Report
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Estimated earnings based on views, posts, likes, reactions &amp; comments.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchEarningsReport}
                  disabled={earningsLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${earningsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={downloadExcel}
                  disabled={earningsReport.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Download Excel (.csv)
                </button>
              </div>
            </div>

            {/* Earnings Formula Explanation */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Per View',      value: '$0.005', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400',         icon: '👁️' },
                { label: 'Per Post',      value: '$0.25',  color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400', icon: '📝' },
                { label: 'Per Like',      value: '$0.10',  color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',       icon: '❤️' },
                { label: 'Per Reaction',  value: '$0.05',  color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',   icon: '🎉' },
                { label: 'Per Comment',   value: '$0.02',  color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400', icon: '💬' },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${item.color} border border-current/10`}>
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{item.label}</p>
                    <p className="text-sm font-extrabold">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Loading State */}
            {earningsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-400 font-medium">Calculating creator earnings...</p>
              </div>
            ) : earningsReport.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold">No data yet. Click Refresh to load the report.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Creator</th>
                      <th className="px-4 py-3 text-center">Posts</th>
                      <th className="px-4 py-3 text-center">Views</th>
                      <th className="px-4 py-3 text-center">Likes</th>
                      <th className="px-4 py-3 text-center">Reactions</th>
                      <th className="px-4 py-3 text-center">Comments</th>
                      <th className="px-4 py-3 text-right">Est. Earnings</th>
                      <th className="px-4 py-3">Top Post</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {earningsReport.map((row, idx) => (
                      <tr
                        key={row._id}
                        className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors cursor-pointer"
                        onClick={() => setSelectedUser(row)}
                      >
                        <td className="px-4 py-3">
                          {idx === 0 ? <span className="text-lg">🥇</span> : idx === 1 ? <span className="text-lg">🥈</span> : idx === 2 ? <span className="text-lg">🥉</span> : <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img src={row.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${row.name}`} alt={row.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-white">{row.name}</p>
                              <p className="text-[10px] text-slate-400">@{row.username} · {row.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{row.totalPosts}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{row.totalViews.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{row.totalLikes}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{row.totalReactions}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{row.totalComments}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-extrabold ${
                            row.estimatedEarnings >= 10 ? 'text-emerald-600 dark:text-emerald-400'
                            : row.estimatedEarnings >= 2 ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-500'
                          }`}>
                            ${row.estimatedEarnings.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[160px] truncate">
                            {row.topPost ? row.topPost.title : '—'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Daily AI Brief Tab ── */}
        {activeTab === 'dailyBrief' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Community Daily AI Summaries
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">View daily publishing analytics and generate Gemini AI executive briefs summarizing community output.</p>
            </div>

            {dailyReportLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-650 rounded-full animate-spin" />
                <p className="text-sm text-slate-400 font-medium">Aggregating daily publishing telemetry...</p>
              </div>
            ) : dailyReport.length === 0 ? (
              <div className="text-center py-16 text-slate-405">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20 text-indigo-550" />
                <p className="font-semibold">No published blogs found on the platform yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyReport.map((day) => (
                  <div key={day.date} className="p-5 border rounded-2xl bg-slate-50 border-slate-150 dark:bg-slate-800/40 dark:border-slate-800 space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-white">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <span className="ml-3 px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-655 dark:bg-indigo-955/20 dark:text-indigo-400 rounded-full border border-indigo-100/30">
                          {day.blogsCount} {day.blogsCount === 1 ? 'article' : 'articles'} published
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleGenerateDailyBrief(day.date)}
                        disabled={generatingBriefDate === day.date}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gradient-to-r from-primary-600 to-indigo-605 hover:from-primary-700 hover:to-indigo-705 text-white rounded-xl transition-all shadow-md shadow-primary-500/10 disabled:opacity-50 cursor-pointer"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${generatingBriefDate === day.date ? 'animate-spin' : ''}`} />
                        <span>{generatingBriefDate === day.date ? 'Generating AI Brief...' : day.hasBrief ? 'Regenerate Daily AI Brief' : 'Generate Daily AI Brief'}</span>
                      </button>
                    </div>

                    {/* Brief Summary Content if exists */}
                    {day.hasBrief ? (
                      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 space-y-4">
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">AI Executive Briefing</h4>
                          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">{day.summary}</p>
                        </div>
                        {day.keyThemes && day.keyThemes.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Key Themes & Highlights</h4>
                            <ul className="grid sm:grid-cols-2 gap-2">
                              {day.keyThemes.map((theme, idx) => (
                                <li key={idx} className="text-xs text-slate-650 dark:text-slate-400 flex gap-2 items-start bg-slate-50 dark:bg-slate-955/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900">
                                  <span className="text-indigo-500 font-extrabold text-sm leading-3">•</span>
                                  <span>{theme}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 text-center text-xs text-slate-400 font-medium">
                        No AI Briefing generated for this day yet. Click "Generate Daily AI Brief" to create one.
                      </div>
                    )}

                    {/* List of articles published on that day */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Articles Feed</h4>
                      <div className="flex flex-col gap-2">
                        {day.blogs.map((b, bIdx) => (
                          <div key={bIdx} className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800 transition-all">
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{b.title}</span>
                              <span className="text-[9px] text-slate-400 mt-0.5 inline-block bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                                {b.category || 'General'}
                              </span>
                            </div>
                            {b.tags && b.tags.length > 0 && (
                              <div className="hidden sm:flex gap-1">
                                {b.tags.slice(0, 2).map((tg, tIdx) => (
                                  <span key={tIdx} className="text-[9px] font-semibold text-purple-650 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400 px-2 py-0.5 rounded-full border border-purple-100/30">
                                    #{tg}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Earnings Breakdown Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={selectedUser.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.name}`} alt={selectedUser.name} className="w-10 h-10 rounded-full border-2 border-white/40 object-cover" />
                <div>
                  <p className="text-white font-extrabold text-sm">{selectedUser.name}</p>
                  <p className="text-white/70 text-xs">@{selectedUser.username}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Total Earning */}
              <div className="text-center">
                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                  ${selectedUser.estimatedEarnings.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Estimated Total Earnings</p>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Earnings Breakdown</p>
                {[
                  { label: `${selectedUser.totalViews.toLocaleString()} Views`, value: selectedUser.breakdown.fromViews, color: 'bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400', icon: '👁️' },
                  { label: `${selectedUser.totalPosts} Posts`, value: selectedUser.breakdown.fromPosts, color: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400', icon: '📝' },
                  { label: `${selectedUser.totalLikes} Likes`, value: selectedUser.breakdown.fromLikes, color: 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400', icon: '❤️' },
                  { label: `${selectedUser.totalReactions} Reactions`, value: selectedUser.breakdown.fromReactions, color: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400', icon: '🎉' },
                  { label: `${selectedUser.totalComments} Comments`, value: selectedUser.breakdown.fromComments, color: 'bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400', icon: '💬' },
                ].map(item => (
                  <div key={item.label} className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${item.color}`}>
                    <span className="text-xs font-semibold flex items-center gap-2">
                      <span>{item.icon}</span>
                      {item.label}
                    </span>
                    <span className="text-xs font-extrabold">${item.value}</span>
                  </div>
                ))}
              </div>

              {/* Top Post */}
              {selectedUser.topPost && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">🏆 Top Performing Post</p>
                  <Link to={`/blog/${selectedUser.topPost.slug}`} onClick={() => setSelectedUser(null)} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline line-clamp-2">
                    {selectedUser.topPost.title}
                  </Link>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedUser.topPost.views.toLocaleString()} views</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
