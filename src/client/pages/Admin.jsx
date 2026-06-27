import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Shield, Users, BookOpen, AlertTriangle, ShieldCheck, Trash2, Edit3, ArrowLeft } from 'lucide-react';
import api from '../utils/api.js';

export default function Admin() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'blogs'
  const [usersList, setUsersList] = useState([]);
  const [blogsList, setBlogsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

    if (activeTab === 'users') {
      api.get('/api/users')
        .then((res) => {
          setUsersList(res.data.users || []);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.response?.data?.error || 'Failed to fetch users list.');
          setLoading(false);
        });
    } else {
      api.get('/api/blogs?status=all') // Admins can fetch all blogs
        .then((res) => {
          setBlogsList(res.data.blogs || []);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.response?.data?.error || 'Failed to fetch blogs list.');
          setLoading(false);
        });
    }
  }, [activeTab]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Admin Control Panel</h1>
          <p className="text-xs text-slate-400 mt-1">Manage user accounts, roles, spam moderation, and content auditing.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl dark:bg-rose-950/20 dark:border-rose-900/30">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-full w-fit mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2 ${
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
          className={`px-6 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2 ${
            activeTab === 'blogs'
              ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Blogs Moderation ({blogsList.length})</span>
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
                          ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400'
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
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
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
        ) : (
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
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
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
        )}
      </div>
    </div>
  );
}
