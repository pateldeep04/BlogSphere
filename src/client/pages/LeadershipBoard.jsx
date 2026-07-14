import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Users, Target, DollarSign, Clock, ArrowUp, ArrowDown, Minus, Medal, Star, Flame } from 'lucide-react';
import api from '../utils/api.js';

export default function LeadershipBoard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [activeTab, setActiveTab] = useState('earnings');
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Medal className="w-6 h-6 text-amber-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
    return <span className="text-sm font-bold text-slate-400">#{rank}</span>;
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-slate-300 to-slate-500 text-white';
    if (rank === 3) return 'bg-gradient-to-r from-amber-700 to-amber-900 text-white';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 animate-pulse space-y-8">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  const tabs = [
    { id: 'earnings', label: 'Top Earners', icon: DollarSign },
    { id: 'posts', label: 'Most Posts', icon: Target },
    { id: 'views', label: 'Most Views', icon: TrendingUp },
    { id: 'engagement', label: 'Top Engagement', icon: Flame },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            Leadership Board
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Community rankings based on content performance and engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 text-sm border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
            <option value="today">Today</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Rank</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Creator</th>
                {activeTab === 'earnings' && (
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Est. Earnings</th>
                )}
                {activeTab === 'posts' && (
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Posts</th>
                )}
                {activeTab === 'views' && (
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Total Views</th>
                )}
                {activeTab === 'engagement' && (
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Engagement Score</th>
                )}
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No data available for this period</p>
                    <p className="text-sm mt-1">Start writing to climb the ranks!</p>
                  </td>
                </tr>
              ) : (
                leaderboard.map((user, index) => {
                  const rank = index + 1;
                  const earnings = user.estimatedEarnings || 0;
                  const totalViews = user.totalViews || 0;
                  const totalPosts = user.totalPosts || 0;
                  const totalLikes = user.totalLikes || 0;
                  const totalReactions = user.totalReactions || 0;
                  const totalComments = user.totalComments || 0;
                  const engagementScore = totalLikes + totalReactions + totalComments * 2;

                  let sortValue = earnings;
                  if (activeTab === 'posts') sortValue = totalPosts;
                  if (activeTab === 'views') sortValue = totalViews;
                  if (activeTab === 'engagement') sortValue = engagementScore;

                  return (
                    <tr
                      key={user._id}
                      onClick={() => setSelectedUser(user)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        rank <= 3 ? 'bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/10' : ''
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
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-500/20"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-slate-400 capitalize">@{user.username} · {user.role}</p>
                          </div>
                        </div>
                      </td>
                      {activeTab === 'earnings' && (
                        <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                          {formatCurrency(earnings)}
                        </td>
                      )}
                      {activeTab === 'posts' && (
                        <td className="px-6 py-4 text-center font-bold text-primary-600 dark:text-primary-400 text-lg">
                          {totalPosts}
                        </td>
                      )}
                      {activeTab === 'views' && (
                        <td className="px-6 py-4 text-center font-bold text-sky-600 dark:text-sky-400 text-lg">
                          {formatNumber(totalViews)}
                        </td>
                      )}
                      {activeTab === 'engagement' && (
                        <td className="px-6 py-4 text-center font-bold text-rose-600 dark:text-rose-400 text-lg">
                          {formatNumber(engagementScore)}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1 justify-end"
                        >
                          View Details <ArrowUp className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {leaderboard.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{leaderboard.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active Creators</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(leaderboard.reduce((sum, u) => sum + (u.estimatedEarnings || 0), 0))}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Earnings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {formatNumber(leaderboard.reduce((sum, u) => sum + (u.totalPosts || 0), 0))}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Posts</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                  {formatNumber(leaderboard.reduce((sum, u) => sum + (u.totalViews || 0), 0))}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Views</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Earnings Formula
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl">
              <span className="flex items-center gap-2 text-sky-700 dark:text-sky-400"><span>👁️</span> Per View</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">$0.005</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <span className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400"><span>📝</span> Per Post</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">$0.25</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
              <span className="flex items-center gap-2 text-rose-700 dark:text-rose-400"><span>❤️</span> Per Like</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">$0.10</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400"><span>🎉</span> Per Reaction</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">$0.05</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl">
              <span className="flex items-center gap-2 text-violet-700 dark:text-violet-400"><span>💬</span> Per Comment</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">$0.02</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            How Rankings Work
          </h3>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs flex-shrink-0">1</div>
              <span>Earnings are calculated based on your content's performance metrics</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs flex-shrink-0">2</div>
              <span>Switch tabs to see rankings by posts, views, or engagement</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs flex-shrink-0">3</div>
              <span>Click any creator to see their detailed breakdown and top performing post</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs flex-shrink-0">4</div>
              <span>Rankings update in real-time as you publish and engage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EarningsBreakdownModal({ user, onClose }) {
  if (!user) return null;

  const breakdown = user.breakdown || {
    fromViews: (user.totalViews || 0) * 0.005,
    fromPosts: (user.totalPosts || 0) * 0.25,
    fromLikes: (user.totalLikes || 0) * 0.10,
    fromReactions: (user.totalReactions || 0) * 0.05,
    fromComments: (user.totalComments || 0) * 0.02,
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} className="w-10 h-10 rounded-full border-2 border-white/40 object-cover" />
            <div>
              <p className="text-white font-extrabold text-sm">{user.name}</p>
              <p className="text-white/70 text-xs">@{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(user.estimatedEarnings || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Estimated Total Earnings</p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Earnings Breakdown</p>
            {[
              { label: `${user.totalViews || 0} Views`, value: breakdown.fromViews, color: 'bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400', icon: '👁️' },
              { label: `${user.totalPosts || 0} Posts`, value: breakdown.fromPosts, color: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400', icon: '📝' },
              { label: `${user.totalLikes || 0} Likes`, value: breakdown.fromLikes, color: 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400', icon: '❤️' },
              { label: `${user.totalReactions || 0} Reactions`, value: breakdown.fromReactions, color: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400', icon: '🎉' },
              { label: `${user.totalComments || 0} Comments`, value: breakdown.fromComments, color: 'bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400', icon: '💬' },
            ].map(item => (
              <div key={item.label} className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${item.color}`}>
                <span className="text-xs font-semibold flex items-center gap-2">
                  <span>{item.icon}</span>
                  {item.label}
                </span>
                <span className="text-xs font-extrabold">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>

          {user.topPost && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">🏆 Top Performing Post</p>
              <a href={`/blog/${user.topPost.slug}`} onClick={onClose} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline line-clamp-2 block">
                {user.topPost.title}
              </a>
              <p className="text-[10px] text-slate-400 mt-0.5">{user.topPost.views?.toLocaleString() || 0} views</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}