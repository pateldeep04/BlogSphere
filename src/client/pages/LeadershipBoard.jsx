import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Users, Target, Clock, Medal, Star, Flame, Eye, Heart, MessageSquare, ArrowUp, X } from 'lucide-react';
import api from '../utils/api.js';

export default function LeadershipBoard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [activeTab, setActiveTab] = useState('views');
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/users/leaderboard?range=${timeRange}`);
      setLeaderboard(res.data.report || []);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeRange]);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Medal className="w-6 h-6 text-amber-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
    return <span className="text-sm font-bold text-slate-400">#{rank}</span>;
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20';
    if (rank === 2) return 'bg-gradient-to-r from-slate-300 to-slate-500 text-white shadow-md shadow-slate-500/20';
    if (rank === 3) return 'bg-gradient-to-r from-amber-700 to-amber-900 text-white shadow-md shadow-amber-800/20';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 animate-pulse space-y-8">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/2" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  const tabs = [
    { id: 'views', label: 'Most Views', icon: TrendingUp },
    { id: 'engagement', label: 'Top Engagement', icon: Flame },
    { id: 'posts', label: 'Most Posts', icon: Target },
  ];

  // Sort leaderboard based on active tab
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (activeTab === 'posts') return (b.totalPosts || 0) - (a.totalPosts || 0);
    if (activeTab === 'engagement') {
      const scoreA = (a.totalLikes || 0) + (a.totalReactions || 0) + (a.totalComments || 0) * 2;
      const scoreB = (b.totalLikes || 0) + (b.totalReactions || 0) + (b.totalComments || 0) * 2;
      return scoreB - scoreA;
    }
    return (b.totalViews || 0) - (a.totalViews || 0);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            Leadership Board
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Community rankings based on content performance, readership, and engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 text-sm border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
            <option value="today">Today</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Rank</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Creator</th>
                {activeTab === 'views' && (
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Total Views</th>
                )}
                {activeTab === 'engagement' && (
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Engagement Score</th>
                )}
                {activeTab === 'posts' && (
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Total Articles</th>
                )}
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-semibold">No creators found for this period</p>
                    <p className="text-xs mt-1">Start publishing articles to appear on the leaderboard!</p>
                  </td>
                </tr>
              ) : (
                sortedLeaderboard.map((user, index) => {
                  const rank = index + 1;
                  const totalViews = user.totalViews || 0;
                  const totalPosts = user.totalPosts || 0;
                  const totalLikes = user.totalLikes || 0;
                  const totalReactions = user.totalReactions || 0;
                  const totalComments = user.totalComments || 0;
                  const engagementScore = totalLikes + totalReactions + totalComments * 2;

                  return (
                    <tr
                      key={user._id}
                      onClick={() => setSelectedUser(user)}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                        rank <= 3 ? 'bg-gradient-to-r from-amber-50/30 to-transparent dark:from-amber-950/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getRankClass(rank)}`}>
                          {getRankIcon(rank)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</p>
                            <p className="text-xs text-slate-400 capitalize">@{user.username || 'creator'} · {user.role || 'Author'}</p>
                          </div>
                        </div>
                      </td>
                      {activeTab === 'views' && (
                        <td className="px-6 py-4 text-center font-extrabold text-sky-600 dark:text-sky-400 text-base">
                          {formatNumber(totalViews)}
                        </td>
                      )}
                      {activeTab === 'engagement' && (
                        <td className="px-6 py-4 text-center font-extrabold text-rose-600 dark:text-rose-400 text-base">
                          {formatNumber(engagementScore)}
                        </td>
                      )}
                      {activeTab === 'posts' && (
                        <td className="px-6 py-4 text-center font-extrabold text-indigo-600 dark:text-indigo-400 text-base">
                          {totalPosts}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold inline-flex items-center gap-1 justify-end"
                        >
                          <span>View Performance</span>
                          <ArrowUp className="w-3.5 h-3.5 rotate-45" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {sortedLeaderboard.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{sortedLeaderboard.length}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Creators</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400">
                  {formatNumber(sortedLeaderboard.reduce((sum, u) => sum + (u.totalViews || 0), 0))}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Views</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {formatNumber(sortedLeaderboard.reduce((sum, u) => sum + (u.totalPosts || 0), 0))}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published Articles</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <span>Reputation & Badges System</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-3 bg-sky-50 dark:bg-sky-950/30 rounded-2xl border border-sky-100/50 dark:border-sky-900/30">
              <span className="flex items-center gap-2 font-semibold text-sky-700 dark:text-sky-400"><span>👁️</span> Article Views</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">+50 Points / 1K Views</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
              <span className="flex items-center gap-2 font-semibold text-indigo-700 dark:text-indigo-400"><span>📝</span> Published Posts</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">+50 Points / Post</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100/50 dark:border-rose-900/30">
              <span className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-400"><span>❤️</span> Likes & Reactions</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">+10 Points / Like</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-violet-50 dark:bg-violet-950/30 rounded-2xl border border-violet-100/50 dark:border-violet-900/30">
              <span className="flex items-center gap-2 font-semibold text-violet-700 dark:text-violet-400"><span>💬</span> Reader Comments</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">+5 Points / Comment</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span>How Leaderboard Works</span>
          </h3>
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] flex items-center justify-center flex-shrink-0">1</div>
              <span>Rankings dynamically aggregate creator performance across readership, post count, and audience reactions.</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] flex items-center justify-center flex-shrink-0">2</div>
              <span>Switch between Views, Engagement, and Articles tabs to view specialized rankings.</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] flex items-center justify-center flex-shrink-0">3</div>
              <span>Click on any creator row to view detailed performance metrics and their top performing article.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Creator Details Modal */}
      {selectedUser && (
        <CreatorDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

function CreatorDetailsModal({ user, onClose }) {
  if (!user) return null;

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
              alt={user.name}
              className="w-11 h-11 rounded-full border-2 border-white/50 object-cover shadow-sm"
            />
            <div>
              <p className="text-white font-extrabold text-sm">{user.name}</p>
              <p className="text-white/80 text-xs">@{user.username || 'creator'} · {user.role || 'Author'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {formatNumber(user.totalViews || 0)}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-0.5">Total Article Views</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center gap-3">
              <Eye className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <div>
                <span className="block text-sm font-extrabold text-indigo-700 dark:text-indigo-300">{formatNumber(user.totalViews || 0)}</span>
                <span className="block text-[10px] font-bold text-indigo-400 uppercase">Views</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100/50 dark:border-sky-900/30 flex items-center gap-3">
              <Target className="w-5 h-5 text-sky-500 flex-shrink-0" />
              <div>
                <span className="block text-sm font-extrabold text-sky-700 dark:text-sky-300">{user.totalPosts || 0}</span>
                <span className="block text-[10px] font-bold text-sky-400 uppercase">Articles</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100/50 dark:border-rose-900/30 flex items-center gap-3">
              <Heart className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <div>
                <span className="block text-sm font-extrabold text-rose-700 dark:text-rose-300">{formatNumber((user.totalLikes || 0) + (user.totalReactions || 0))}</span>
                <span className="block text-[10px] font-bold text-rose-400 uppercase">Reactions</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100/50 dark:border-violet-900/30 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-violet-500 flex-shrink-0" />
              <div>
                <span className="block text-sm font-extrabold text-violet-700 dark:text-violet-300">{formatNumber(user.totalComments || 0)}</span>
                <span className="block text-[10px] font-bold text-violet-400 uppercase">Comments</span>
              </div>
            </div>
          </div>

          {user.topPost && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <span>🏆</span> Top Performing Article
              </p>
              <a
                href={`/blog/${user.topPost.slug}`}
                onClick={onClose}
                className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2 block leading-snug"
              >
                {user.topPost.title}
              </a>
              <p className="text-[10px] text-slate-400 font-medium pt-0.5">{user.topPost.views?.toLocaleString() || 0} views</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}