import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AlertCircle, User, Users, BookOpen } from 'lucide-react';
import api from '../utils/api.js';
import BlogCard from '../components/BlogCard.jsx';

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useSelector((state) => state.auth);

  const [profileUser, setProfileUser] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Followers states
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');

    api.get(`/api/users/${id}/profile`)
      .then((res) => {
        setProfileUser(res.data.user);
        setBlogs(res.data.blogs || []);
        setFollowersCount(res.data.user.followers?.length || 0);
        setIsFollowing(isAuthenticated && res.data.user.followers?.includes(currentUser?._id));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Profile not found.');
        setLoading(false);
      });
  }, [id, isAuthenticated, currentUser]);

  const handleFollow = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      const res = await api.post(`/api/users/${profileUser._id}/follow`);
      setFollowersCount(res.data.followersCount);
      setIsFollowing(res.data.isFollowing);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="flex gap-4 items-center">
          <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Profile Not Found</h3>
        <p className="text-slate-400 mt-1">{error || 'This user profile does not exist.'}</p>
        <button onClick={() => navigate(-1)} className="mt-6 inline-block bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Profile Header Card */}
      <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
        {/* Avatar */}
        <img
          src={profileUser.profileImage}
          alt={profileUser.name}
          className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-500/10"
        />

        {/* Info */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{profileUser.name}</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mt-0.5">{profileUser.role} member</span>
            </div>
            {isAuthenticated && currentUser?._id !== profileUser._id && (
              <button
                onClick={handleFollow}
                className={`px-5 py-2 text-xs font-bold rounded-full transition-all shadow-sm ${
                  isFollowing
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-350 dark:bg-slate-800 dark:text-slate-300'
                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/10'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow Author'}
              </button>
            )}
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            {profileUser.bio || 'This user prefers keeping their profile private. Welcome to their writing sphere!'}
          </p>

          {/* Metrics */}
          <div className="flex gap-6 justify-center sm:justify-start items-center text-slate-400 dark:text-slate-500 text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-primary-500" />
              <strong className="text-slate-805 dark:text-slate-200">{followersCount}</strong> Followers
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-indigo-500" />
              <strong className="text-slate-805 dark:text-slate-200">{profileUser.following?.length || 0}</strong> Following
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <strong className="text-slate-805 dark:text-slate-200">{blogs.length}</strong> Articles
            </span>
          </div>
        </div>
      </div>

      {/* Published Articles Grid */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Authored Articles</h3>
        {blogs.length === 0 ? (
          <div className="text-center py-12 border border-slate-100 rounded-3xl bg-white dark:bg-slate-900/60 dark:border-slate-800">
            <p className="text-slate-400 text-sm">No articles published by this author yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {blogs.map((blog) => (
              <BlogCard key={blog._id} blog={blog} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
