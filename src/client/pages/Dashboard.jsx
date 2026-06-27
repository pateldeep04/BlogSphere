import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { BookOpen, Eye, Heart, Users, PenSquare, Trash2, TrendingUp, Sparkles, BarChart2 } from 'lucide-react';
import api from '../utils/api.js';

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBlogs: 0,
    totalViews: 0,
    totalLikes: 0,
    followersCount: 0
  });

  useEffect(() => {
    if (user) {
      setLoading(true);
      // Fetch user's blogs (both drafts and published)
      api.get(`/api/blogs?author=${user._id}&status=all`)
        .then((res) => {
          const list = res.data.blogs || [];
          setBlogs(list);

          // Calculate statistics
          const totalBlogs = list.length;
          const totalViews = list.reduce((sum, b) => sum + (b.views || 0), 0);
          const totalLikes = list.reduce((sum, b) => sum + (b.likes?.length || 0), 0);
          
          setStats({
            totalBlogs,
            totalViews,
            totalLikes,
            followersCount: user.followers?.length || 0
          });
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you absolutely sure you want to delete this blog? All history logs will be lost.')) {
      try {
        await api.delete(`/api/blogs/${id}`);
        setBlogs(blogs.filter(b => b._id !== id));
        // Update stats
        setStats(prev => ({
          ...prev,
          totalBlogs: prev.totalBlogs - 1
        }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Mock data for views-per-day SVG Chart
  // In a real application this is aggregated dynamically on the server
  const chartData = [
    { day: 'Mon', views: 120 },
    { day: 'Tue', views: 340 },
    { day: 'Wed', views: 210 },
    { day: 'Thu', views: 480 },
    { day: 'Fri', views: 390 },
    { day: 'Sat', views: 610 },
    { day: 'Sun', views: 540 }
  ];

  const maxViews = Math.max(...chartData.map(d => d.views));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse space-y-8">
        <div className="grid grid-cols-4 gap-4 h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-snug">
          Welcome back, {user?.name}
        </h1>
        <p className="text-slate-400 text-xs mt-1">Here is a quick overview of your article performance metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: 'Total Articles', value: stats.totalBlogs, icon: BookOpen, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
          { title: 'Article Views', value: stats.totalViews, icon: Eye, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
          { title: 'Total Likes', value: stats.totalLikes, icon: Heart, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' },
          { title: 'Followers', value: stats.followersCount, icon: Users, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' }
        ].map((item, idx) => (
          <div key={idx} className="p-5 border rounded-2xl bg-white border-slate-100 dark:bg-slate-900 shadow-sm flex items-center gap-4">
            <div className={`p-3.5 rounded-xl ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">{item.title}</span>
              <span className="block text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart & Popular Articles container */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* SVG Analytics Chart */}
        <div className="lg:col-span-2 p-6 border rounded-3xl bg-white border-slate-100 dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span>Weekly Reads Graph</span>
            </h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full font-bold uppercase">Views per Day</span>
          </div>

          {/* SVG Bar Chart */}
          <div className="relative w-full h-56 flex items-end justify-between px-2 pt-6">
            {chartData.map((data, idx) => {
              const barHeight = `${(data.views / maxViews) * 80}%`;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <span className="absolute -top-6 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold">
                    {data.views} views
                  </span>
                  
                  {/* Dynamic Bar */}
                  <div
                    style={{ height: barHeight }}
                    className="w-8 sm:w-12 bg-gradient-to-t from-primary-600 to-indigo-500 dark:from-primary-700 dark:to-indigo-600 rounded-t-lg transition-all hover:brightness-110 shadow-sm"
                  />
                  <span className="text-xs text-slate-400 font-semibold mt-2">{data.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top performing articles / tip box */}
        <div className="p-6 border rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-950 text-white shadow-md flex flex-col justify-between relative overflow-hidden border-indigo-900/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary-500/20 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <span className="p-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-xl inline-block">
              <Sparkles className="w-6 h-6" />
            </span>
            <h3 className="text-xl font-bold tracking-tight">AI Writer Assistant Tips</h3>
            <p className="text-sm leading-relaxed text-indigo-200">
              Your articles focusing on <span className="font-semibold text-white">JavaScript</span> and <span className="font-semibold text-white">MERN</span> are outperforming other categories by 45%. Writing a follow-up article this week could boost your views.
            </p>
          </div>
          <Link
            to="/editor"
            className="relative z-10 mt-6 w-full py-2.5 text-center text-xs font-bold text-indigo-900 bg-white hover:bg-slate-100 rounded-full transition-colors inline-block"
          >
            Create New Article
          </Link>
        </div>
      </div>

      {/* Articles Management Table */}
      <div className="p-6 border rounded-3xl bg-white border-slate-100 dark:bg-slate-900 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manage Articles</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400">
            {blogs.length} Posts
          </span>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">You haven't written any articles yet.</p>
            <Link to="/editor" className="mt-4 inline-block bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4 py-2 rounded-full">
              Write your first article
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 pl-2">Title</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-center">Views</th>
                  <th className="pb-3 text-center">Likes</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {blogs.map((blog) => (
                  <tr key={blog._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 pl-2 font-semibold text-slate-800 dark:text-slate-100 max-w-xs truncate">
                      <Link to={`/blog/${blog.slug}`} className="hover:underline">{blog.title}</Link>
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        blog.status === 'published'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {blog.status}
                      </span>
                    </td>
                    <td className="py-4 text-center font-semibold text-slate-700 dark:text-slate-300">{blog.views || 0}</td>
                    <td className="py-4 text-center font-semibold text-slate-700 dark:text-slate-300">{blog.likes?.length || 0}</td>
                    <td className="py-4 text-right pr-2">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/editor?edit=${blog._id}`}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary-600 rounded-lg"
                          title="Edit"
                        >
                          <PenSquare className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(blog._id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
