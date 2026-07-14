import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useToast } from '../context/ToastContext.jsx';
import { Link } from 'react-router-dom';
import { Users, Plus, ArrowRight, ArrowLeft, MessageSquare, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';
import api from '../utils/api.js';
import BlogCard from '../components/BlogCard.jsx';

export default function Communities() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { showToast } = useToast();
  
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [communityDetails, setCommunityDetails] = useState(null);
  const [commBlogs, setCommBlogs] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form state
  const [createOpen, setCreateOpen] = useState(false);
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Fetch communities list
  const fetchCommunities = () => {
    setLoading(true);
    api.get('/api/communities')
      .then((res) => {
        setCommunities(res.data.communities || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCommunities();
  }, [isAuthenticated]);

  // Load selected community details
  useEffect(() => {
    if (selectedCommunity) {
      setLoadingDetails(true);
      api.get(`/api/communities/${selectedCommunity}`)
        .then((res) => {
          setCommunityDetails(res.data.community);
          setCommBlogs(res.data.blogs || []);
          setLoadingDetails(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingDetails(false);
        });
    } else {
      setCommunityDetails(null);
      setCommBlogs([]);
    }
  }, [selectedCommunity]);

  const handleJoinLeave = async (commId, e) => {
    e.stopPropagation(); // Avoid selecting the card
    if (!isAuthenticated) {
      showToast('Please log in to join communities.', 'warning');
      return;
    }
    try {
      const res = await api.post(`/api/communities/${commId}/join`);
      const { isJoined, membersCount } = res.data;
      
      // Update in main list
      setCommunities(prev => prev.map(c => {
        if (c._id === commId) {
          return { ...c, isMember: isJoined, membersCount };
        }
        return c;
      }));

      // Update in active details if viewing
      if (communityDetails && communityDetails._id === commId) {
        setCommunityDetails(prev => ({
          ...prev,
          isMember: isJoined,
          membersCount
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    
    if (!newCommName.trim()) {
      setCreateError('Community name is required.');
      return;
    }

    try {
      const res = await api.post('/api/communities', {
        name: newCommName.trim(),
        description: newCommDesc.trim()
      });
      setCreateSuccess('Community created successfully!');
      setNewCommName('');
      setNewCommDesc('');
      setCreateOpen(false);
      fetchCommunities(); // Reload list
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create community.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[95%] xl:max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-pulse space-y-8">
        <div className="h-10 bg-slate-200 dark:bg-slate-850 rounded-2xl w-1/4" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 bg-slate-200 dark:bg-slate-850 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[95%] xl:max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Detail View of Community */}
      {selectedCommunity && communityDetails ? (
        <div className="space-y-8 animate-fade-in">
          {/* Back button */}
          <button
            onClick={() => setSelectedCommunity(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to communities
          </button>

          {/* Community Header Banner */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900/10 via-slate-900/30 to-indigo-950/10 dark:from-indigo-950/40 dark:to-slate-900 border border-slate-200 dark:border-indigo-950/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                Community Channel
              </span>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {communityDetails.name}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-sm leading-relaxed">
                {communityDetails.description || 'No description available for this community channel.'}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {communityDetails.membersCount} members</span>
                <span>•</span>
                <span>Created by {communityDetails.creator?.name || 'Anonymous'}</span>
              </div>
            </div>
            
            <div>
              <button
                onClick={(e) => handleJoinLeave(communityDetails._id, e)}
                className={`w-full md:w-auto px-6 py-3 rounded-full text-xs font-bold tracking-wide transition-all shadow-md ${
                  communityDetails.isMember
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/10'
                }`}
              >
                {communityDetails.isMember ? 'Leave Community' : 'Join Community'}
              </button>
            </div>
          </div>

          {/* Blogs list inside Community */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span>Articles in {communityDetails.name}</span>
              </h2>
              {communityDetails.isMember && (
                <Link
                  to={`/editor?community=${communityDetails._id}`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-indigo-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post Article</span>
                </Link>
              )}
            </div>

            {loadingDetails ? (
              <div className="grid sm:grid-cols-2 gap-6 animate-pulse">
                <div className="h-64 bg-slate-200 dark:bg-slate-850 rounded-2xl" />
                <div className="h-64 bg-slate-200 dark:bg-slate-850 rounded-2xl" />
              </div>
            ) : commBlogs.length === 0 ? (
              <div className="text-center py-16 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80">
                <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Articles Yet</h3>
                <p className="text-slate-400 text-xs mt-1">Be the first to share an article with the {communityDetails.name} community!</p>
                {communityDetails.isMember ? (
                  <Link to={`/editor?community=${communityDetails._id}`} className="mt-4 inline-block bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md">
                    Write Post
                  </Link>
                ) : (
                  <button onClick={(e) => handleJoinLeave(communityDetails._id, e)} className="mt-4 bg-primary-650 hover:bg-primary-755 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md">
                    Join to Post
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {commBlogs.map((blog) => (
                  <BlogCard key={blog._id} blog={blog} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Header Title / Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-150 dark:border-slate-800 pb-8">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                <span>Niche Communities</span>
              </h1>
              <p className="text-slate-400 text-xs font-medium">Join collaborative rooms, discuss tech, and share custom curated content.</p>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => setCreateOpen(!createOpen)}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create Community</span>
              </button>
            )}
          </div>

          {/* Create Community Collapsible Section */}
          {createOpen && (
            <form onSubmit={handleCreateCommunity} className="p-6 rounded-3xl border border-indigo-100 dark:border-indigo-950/40 bg-white dark:bg-slate-900/60 shadow-lg space-y-4 max-w-xl animate-fade-in">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Create Community Channel</h3>
              {createError && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-3.5 py-2 rounded-xl border border-rose-250/20">{createError}</p>}
              {createSuccess && <p className="text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-2 rounded-xl border border-emerald-250/20">{createSuccess}</p>}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Community Name</label>
                <input
                  type="text"
                  placeholder="e.g. React developers"
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-2xl bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-850 text-slate-850 dark:text-slate-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Description</label>
                <textarea
                  placeholder="Describe the community topic, rules, or guidelines..."
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3.5 py-2.5 border rounded-2xl bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-850 text-slate-850 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-650"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-bold shadow-md"
                >
                  Save Community
                </button>
              </div>
            </form>
          )}

          {/* Communities Grid List */}
          {communities.length === 0 ? (
            <div className="text-center py-20 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80">
              <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-200">No Communities Yet</h3>
              <p className="text-slate-400 text-xs mt-1">Be the pioneer and build the first community channel!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities.map((comm) => (
                <div
                  key={comm._id}
                  onClick={() => setSelectedCommunity(comm._id)}
                  className="p-6 rounded-3xl border border-slate-100 hover:border-indigo-500/30 dark:border-slate-800/60 dark:hover:border-indigo-950/40 bg-white/70 dark:bg-slate-900/30 backdrop-blur-md hover:bg-white dark:hover:bg-slate-900/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-56 cursor-pointer group"
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-4">
                      <span className="flex items-center gap-1.5 text-xs text-indigo-500 font-bold bg-indigo-500/10 px-3 py-1 rounded-full dark:bg-indigo-950/20">
                        <Users className="w-3.5 h-3.5" />
                        <span>{comm.membersCount} members</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-800 group-hover:text-primary-650 dark:text-white dark:group-hover:text-primary-400 transition-colors leading-tight">
                      {comm.name}
                    </h3>
                    
                    <p className="text-slate-450 dark:text-slate-400 text-xs line-clamp-3 leading-relaxed">
                      {comm.description || 'Join this collaborative space to share articles and build knowledge.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-805/40">
                    <button
                      onClick={(e) => handleJoinLeave(comm._id, e)}
                      className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                        comm.isMember
                          ? 'bg-slate-100 text-slate-650 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700'
                          : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/10'
                      }`}
                    >
                      {comm.isMember ? 'Joined' : 'Join'}
                    </button>
                    
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary-650 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Enter Channel</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
