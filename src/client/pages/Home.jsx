import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Sparkles, TrendingUp, Flame, AlertCircle, Search, X } from 'lucide-react';
import BlogCard from '../components/BlogCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../utils/api.js';

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const search = searchParams.get('search');

  const { isAuthenticated } = useSelector((state) => state.auth);

  const [activeFeedTab, setActiveFeedTab] = useState(isAuthenticated ? 'recommended' : 'trending');
  const [blogs, setBlogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState('blogs'); // 'blogs', 'authors', 'topics'

  // Search & Filter States
  const [searchInput, setSearchInput] = useState(search || '');
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [selectedTag, setSelectedTag] = useState(tag || '');
  const [sortOption, setSortOption] = useState('newest'); // 'newest', 'views', 'likes'

  // Sync state with URL changes
  useEffect(() => {
    setSelectedCategory(category || '');
    setSelectedTag(tag || '');
    setSearchInput(search || '');
  }, [category, tag, search]);

  // Load feed tabs: default to recommended if logged in, otherwise default to trending
  useEffect(() => {
    if (category || tag || search) {
      setActiveFeedTab('all');
    } else if (isAuthenticated) {
      setActiveFeedTab('recommended');
    } else {
      setActiveFeedTab('trending');
    }
  }, [isAuthenticated, category, tag, search]);

  // Fetch blogs based on active feed tab and filters
  useEffect(() => {
    setLoading(true);

    if (activeFeedTab === 'all' && searchType === 'authors') {
      api.get('/api/users/search/authors', { params: { search: searchInput } })
        .then((res) => {
          setUsersList(res.data.users || []);
          setBlogs([]);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
      return;
    }

    let endpoint = '/api/blogs';
    if (activeFeedTab === 'recommended') {
      endpoint = '/api/blogs/recommendations';
    } else if (activeFeedTab === 'trending') {
      endpoint = '/api/blogs/trending';
    }

    const params = {};
    if (activeFeedTab === 'all') {
      if (selectedCategory) params.category = selectedCategory;
      if (selectedTag) params.tag = selectedTag;
      if (searchInput) params.search = searchInput;
    }

    api.get(endpoint, { params })
      .then((res) => {
        let list = res.data.blogs || [];
        // Apply sorting (only relevant for search/all list since recommended/trending are pre-sorted)
        if (activeFeedTab === 'all') {
          if (sortOption === 'views') {
            list = [...list].sort((a, b) => (b.views || 0) - (a.views || 0));
          } else if (sortOption === 'likes') {
            list = [...list].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
          } else {
            list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
        }
        setBlogs(list);
        setUsersList([]);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [activeFeedTab, selectedCategory, selectedTag, searchInput, sortOption, searchType]);

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Header Section */}
      {!category && !tag && !search && (
        <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white border-b border-indigo-900/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-[95%] xl:max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 animate-fade-in">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
              Smart Community Blog Sphere
            </span>
            <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Read. Write. Collaborate.
            </h1>
            <p className="mt-4 max-w-xl mx-auto text-lg text-slate-400 font-medium">
              Discover stories, collaborate on code reviews, translate articles instantly, and participate in peer editing.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-4 max-w-xs sm:max-w-none mx-auto">
              <a
                href="#feed-start"
                className="px-6 py-3 rounded-full text-sm font-semibold bg-primary-600 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 text-center"
              >
                Start Reading
              </a>
              <Link
                to="/galaxy"
                className="px-6 py-3 rounded-full text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all border border-indigo-500/30 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 text-white"
              >
                Explore Galaxy 🌌
              </Link>
              <Link
                to="/editor"
                className="px-6 py-3 rounded-full text-sm font-semibold bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 text-center"
              >
                Create Article
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Main Feed Container */}
      <div id="feed-start" className="max-w-[95%] xl:max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Feed Column */}
          <main className="flex-1">
            {/* Robust Search & Filter Bar */}
            {activeFeedTab === 'all' && (
              <div className="mb-6 p-4 sm:p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="w-full md:flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search titles, tags, categories..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full py-2.5 pl-10 pr-4 text-sm transition-all border rounded-2xl bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-805 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-950"
                  />
                  <Search className="absolute w-4 h-4 text-slate-400 top-3.5 left-3.5" />
                </div>
                
                <div className="flex flex-wrap w-full md:w-auto gap-3 items-center">
                  {/* Category Select */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3.5 py-2.5 text-xs font-semibold rounded-2xl border bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-650 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    {['Technology', 'Travel', 'Food', 'Education', 'Sports'].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {/* Sort Option Select */}
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="px-3.5 py-2.5 text-xs font-semibold rounded-2xl border bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-650 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="newest">Newest First</option>
                    <option value="views">Most Views</option>
                    <option value="likes">Most Likes</option>
                  </select>

                  {/* Reset Filters */}
                  {(selectedCategory || selectedTag || searchInput || sortOption !== 'newest') && (
                    <button
                      onClick={() => {
                        setSearchInput('');
                        setSelectedCategory('');
                        setSelectedTag('');
                        setSortOption('newest');
                        setSearchType('blogs');
                        navigate('/');
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 rounded-2xl transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeFeedTab === 'all' && (
              <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'blogs', label: 'Articles' },
                  { id: 'authors', label: 'Users & Authors' },
                  { id: 'topics', label: 'Trending Topics' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSearchType(type.id);
                      setBlogs([]);
                      setUsersList([]);
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-full transition-all border flex-shrink-0 ${
                      searchType === type.id
                        ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}

            {/* Active Tag indicator */}
            {selectedTag && activeFeedTab === 'all' && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Active Tag:</span>
                <span className="text-xs font-bold bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400 px-3 py-1 rounded-full flex items-center gap-1.5 border border-primary-100/30">
                  #{selectedTag}
                  <button onClick={() => setSelectedTag('')} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                </span>
              </div>
            )}

            {/* Search/Category filter headings legacy notification */}
            {(category || tag || search) && activeFeedTab === 'recommended' && (
              <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-500">
                  Showing results for:{' '}
                  <span className="font-semibold text-slate-850 dark:text-slate-100">
                    {category ? `Category: ${category}` : tag ? `#${tag}` : `Search query "${search}"`}
                  </span>
                </div>
                <Link to="/" className="text-xs text-primary-500 hover:underline">
                  Clear filters
                </Link>
              </div>
            )}

            {/* Feed Tabs Selector */}
            {!category && !tag && !search && (
              <div className="flex border-b border-slate-200 dark:border-slate-805 mb-6 overflow-x-auto scrollbar-none pb-0.5 whitespace-nowrap">
                {isAuthenticated && (
                  <button
                    onClick={() => setActiveFeedTab('recommended')}
                    className={`py-3.5 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                      activeFeedTab === 'recommended'
                        ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>For You</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveFeedTab('trending')}
                  className={`py-3.5 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                    activeFeedTab === 'trending'
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>Trending</span>
                </button>
                <button
                  onClick={() => setActiveFeedTab('all')}
                  className={`py-3.5 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                    activeFeedTab === 'all'
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Explore & Search</span>
                </button>
                <Link
                  to="/galaxy"
                  className="py-3.5 px-5 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 flex items-center gap-2 transition-all"
                >
                  <span>Galaxy View 🌌</span>
                </Link>
              </div>
            )}

            {/* Explore Target Renders */}
            {activeFeedTab === 'all' && searchType === 'authors' ? (
              loading ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="animate-pulse bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl h-44 p-6" />
                  ))}
                </div>
              ) : usersList.length === 0 ? (
                <div className="text-center py-16 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Users Found</h3>
                  <p className="text-slate-400 mt-1">We couldn't find any authors or users matching your search.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  {usersList.map((usr) => (
                    <div key={usr._id} className="p-6 border border-slate-100 dark:border-slate-800/80 rounded-3xl bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                      <img src={usr.profileImage || 'https://api.dicebear.com/7.x/adventurer/svg'} alt={usr.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-500/10" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100">{usr.name}</h4>
                          <span className="px-2 py-0.5 text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-indigo-900/30">
                            {usr.badge || 'Writer'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">{usr.bio || 'No bio description yet.'}</p>
                        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Reputation: <strong>{usr.reputationPoints || 0} pts</strong></span>
                          <Link to={`/profile/${usr._id}`} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
                            Profile →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : activeFeedTab === 'all' && searchType === 'topics' ? (
              loading ? (
                <div className="animate-pulse space-y-6">
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                  <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
                </div>
              ) : (
                <div className="space-y-8 p-6 border border-slate-100 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900/60">
                  {/* Categories list */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matching Categories</h3>
                    {[...new Set(blogs.map(b => b.category).filter(Boolean))].length === 0 ? (
                      <p className="text-xs text-slate-400">No categories found matching your query.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(blogs.map(b => b.category).filter(Boolean))].map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSearchType('blogs');
                            }}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-100 transition-all"
                          >
                            📁 {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tags list */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matching Tags & Hashtags</h3>
                    {[...new Set(blogs.flatMap(b => b.tags || []))].length === 0 ? (
                      <p className="text-xs text-slate-400">No tags found matching your query.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {[...new Set(blogs.flatMap(b => b.tags || []))].map(tg => (
                          <button
                            key={tg}
                            onClick={() => {
                              setSelectedTag(tg);
                              setSearchType('blogs');
                            }}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-indigo-50/40 border border-indigo-100/50 dark:bg-indigo-950/10 dark:border-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-100 transition-all"
                          >
                            # {tg}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : loading ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl h-80 flex flex-col justify-between p-5">
                    <div className="bg-slate-200 dark:bg-slate-800 h-40 rounded-xl mb-4" />
                    <div className="bg-slate-200 dark:bg-slate-800 h-6 w-3/4 rounded-md mb-2" />
                    <div className="bg-slate-200 dark:bg-slate-800 h-4 w-1/2 rounded-md" />
                  </div>
                ))}
              </div>
            ) : blogs.length === 0 ? (
              <div className="text-center py-16 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Articles Found</h3>
                <p className="text-slate-400 mt-1">We couldn't find any articles matching your preferences or search criteria.</p>
                <Link to="/editor" className="mt-6 inline-block bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-md">
                  Write the first one!
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {blogs.map((blog) => (
                  <BlogCard key={blog._id} blog={blog} />
                ))}
              </div>
            )}
          </main>

          {/* Right Sidebar Column */}
          <Sidebar currentCategory={category} currentTag={tag} />
        </div>
      </div>
    </div>
  );
}
