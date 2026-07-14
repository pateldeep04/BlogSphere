import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { AlertCircle, User, Users, BookOpen, Settings2, Github, Twitter, Globe, Bookmark, Mail, Check, X } from 'lucide-react';
import api from '../utils/api.js';
import BlogCard from '../components/BlogCard.jsx';
import { updateCurrentUser } from '../redux/authSlice.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: currentUser, isAuthenticated } = useSelector((state) => state.auth);
  const { showToast } = useToast();

  const [profileUser, setProfileUser] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Followers states
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Newsletter states
  const [isNewsletterSubscribed, setIsNewsletterSubscribed] = useState(false);
  const [newsletterSubscribersCount, setNewsletterSubscribersCount] = useState(0);

  // Bookmarks states
  const [activeTab, setActiveTab] = useState('authored'); // 'authored' or 'bookmarks'
  const [bookmarks, setBookmarks] = useState([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  // Edit Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editUsername, setEditUsername] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    api.get(`/api/users/${id}/profile`)
      .then((res) => {
        const u = res.data.user;
        setProfileUser(u);
        setBlogs(res.data.blogs || []);
        setFollowersCount(u.followers?.length || 0);
        setIsFollowing(isAuthenticated && u.followers?.includes(currentUser?._id));
        
        setIsNewsletterSubscribed(isAuthenticated && u.newsletterSubscribers?.includes(currentUser?._id));
        setNewsletterSubscribersCount(u.newsletterSubscribers?.length || 0);

        // Set edit states
        setEditName(u.name || '');
        setEditBio(u.bio || '');
        setEditProfileImage(u.profileImage || '');
        setEditTwitter(u.socialLinks?.twitter || '');
        setEditGithub(u.socialLinks?.github || '');
        setEditWebsite(u.socialLinks?.website || '');
        setEditIsPrivate(u.isPrivate || false);
        setEditUsername(u.username || '');

        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Profile not found.');
        setLoading(false);
      });
  }, [id, isAuthenticated, currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser?._id === id && activeTab === 'bookmarks') {
      setLoadingBookmarks(true);
      api.get('/api/users/bookmarks')
        .then((res) => {
          setBookmarks(res.data.bookmarks || []);
          setLoadingBookmarks(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingBookmarks(false);
        });
    }
  }, [id, activeTab, isAuthenticated, currentUser]);

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

  const handleNewsletterToggle = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      const res = await api.post(`/api/users/newsletter/${profileUser._id}`);
      setIsNewsletterSubscribed(res.data.isSubscribed);
      setNewsletterSubscribersCount(res.data.subscribersCount);
    } catch (e) {
      console.error(e);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/api/users/profile', {
        name: editName,
        bio: editBio,
        profileImage: editProfileImage,
        isPrivate: editIsPrivate,
        username: editUsername,
        socialLinks: {
          twitter: editTwitter,
          github: editGithub,
          website: editWebsite
        }
      });
      setProfileUser(res.data.user);
      dispatch(updateCurrentUser(res.data.user));
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to update profile.', 'error');
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
    <div className="max-w-[92%] xl:max-w-[1350px] mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Profile Header Card */}
      <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/60 shadow-sm flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left backdrop-blur-md">
        {/* Avatar */}
        <img
          src={profileUser.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
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
            
            <div className="flex gap-2">
              {(!currentUser || currentUser?._id !== profileUser._id) && (
                <>
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
                  <button
                    onClick={handleNewsletterToggle}
                    className={`px-5 py-2 text-xs font-bold rounded-full transition-all shadow-sm flex items-center gap-1.5 ${
                      isNewsletterSubscribed
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-955/20 dark:text-rose-400'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/10'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isNewsletterSubscribed ? 'Subscribed' : 'Newsletter'}</span>
                  </button>
                </>
              )}

              {isAuthenticated && currentUser?._id === profileUser._id && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-5 py-2 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            {profileUser.bio || 'This user prefers keeping their profile private. Welcome to their writing sphere!'}
          </p>

          {/* Social Links */}
          {profileUser.socialLinks && (profileUser.socialLinks.github || profileUser.socialLinks.twitter || profileUser.socialLinks.website) && (
            <div className="flex gap-4 justify-center sm:justify-start items-center mt-3 text-slate-400 dark:text-slate-500">
              {profileUser.socialLinks.github && (
                <a 
                  href={profileUser.socialLinks.github.startsWith('http') ? profileUser.socialLinks.github : `https://${profileUser.socialLinks.github}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-primary-500 transition-colors"
                  title="Github Profile"
                >
                  <Github className="w-4 h-4" />
                </a>
              )}
              {profileUser.socialLinks.twitter && (
                <a 
                  href={profileUser.socialLinks.twitter.startsWith('http') ? profileUser.socialLinks.twitter : `https://${profileUser.socialLinks.twitter}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-primary-500 transition-colors"
                  title="Twitter Profile"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {profileUser.socialLinks.website && (
                <a 
                  href={profileUser.socialLinks.website.startsWith('http') ? profileUser.socialLinks.website : `https://${profileUser.socialLinks.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-primary-500 transition-colors"
                  title="Personal Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Metrics */}
          <div className="flex gap-6 justify-center sm:justify-start items-center text-slate-400 dark:text-slate-500 text-xs pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-primary-500" />
              <strong className="text-slate-800 dark:text-slate-200">{followersCount}</strong> Followers
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-indigo-500" />
              <strong className="text-slate-800 dark:text-slate-200">{profileUser.following?.length || 0}</strong> Following
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Mail className="w-4 h-4 text-rose-500" />
              <strong className="text-slate-800 dark:text-slate-200">{newsletterSubscribersCount}</strong> Subscribers
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <strong className="text-slate-800 dark:text-slate-200">{blogs.length}</strong> Articles
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      {isAuthenticated && currentUser?._id === profileUser._id && (
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('authored')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'authored'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Authored Articles ({blogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'bookmarks'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved Articles</span>
          </button>
        </div>
      )}

      {/* Articles / Bookmarks display */}
      {activeTab === 'authored' ? (
        <div className="space-y-6">
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
      ) : (
        <div className="space-y-6">
          {loadingBookmarks ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl h-80 p-5 flex flex-col justify-between" />
              ))}
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-12 border border-slate-100 rounded-3xl bg-white dark:bg-slate-900/60 dark:border-slate-800">
              <p className="text-slate-400 text-sm">No saved articles yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {bookmarks.map((blog) => (
                <BlogCard key={blog._id} blog={blog} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile Details</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="username (e.g. patel_deep)"
                  className="w-full px-3 py-2 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Upload Avatar / Logo Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditProfileImage(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100 dark:file:bg-slate-800 dark:file:text-slate-300 dark:hover:file:bg-slate-700 cursor-pointer border rounded-xl p-2 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-800"
                />
                {editProfileImage && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Preview:</span>
                    <img src={editProfileImage} alt="Preview" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-500/10" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bio Description</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Write a brief intro about yourself..."
                  className="w-full px-3 py-2 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="editIsPrivate"
                  checked={editIsPrivate}
                  onChange={(e) => setEditIsPrivate(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="editIsPrivate" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Keep Profile / Account Private
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase">Social Links</label>
                <div className="relative">
                  <span className="absolute top-2.5 left-3 text-slate-400"><Twitter className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={editTwitter}
                    onChange={(e) => setEditTwitter(e.target.value)}
                    placeholder="Twitter Handle or URL"
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="relative">
                  <span className="absolute top-2.5 left-3 text-slate-400"><Github className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={editGithub}
                    onChange={(e) => setEditGithub(e.target.value)}
                    placeholder="Github Username or URL"
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="relative">
                  <span className="absolute top-2.5 left-3 text-slate-400"><Globe className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="Personal Website URL"
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-500 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-500/10 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
