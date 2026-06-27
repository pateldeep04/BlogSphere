import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Sparkles, TrendingUp, Flame, AlertCircle } from 'lucide-react';
import BlogCard from '../components/BlogCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../utils/api.js';

export default function Home() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const search = searchParams.get('search');

  const { isAuthenticated } = useSelector((state) => state.auth);

  const [activeFeedTab, setActiveFeedTab] = useState('all'); // 'all' or 'recommended'
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load feed tabs: default to recommended if logged in, unless category/tag filters exist
  useEffect(() => {
    if (isAuthenticated && !category && !tag && !search) {
      setActiveFeedTab('recommended');
    } else {
      setActiveFeedTab('all');
    }
  }, [isAuthenticated, category, tag, search]);

  // Fetch blogs based on active feed tab and filters
  useEffect(() => {
    setLoading(true);
    const endpoint = activeFeedTab === 'recommended' ? '/api/blogs/recommendations' : '/api/blogs';
    const params = {};
    if (activeFeedTab === 'all') {
      if (category) params.category = category;
      if (tag) params.tag = tag;
      if (search) params.search = search;
    }

    api.get(endpoint, { params })
      .then((res) => {
        setBlogs(res.data.blogs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [activeFeedTab, category, tag, search]);

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Header Section */}
      {!category && !tag && !search && (
        <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white border-b border-indigo-900/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 animate-fade-in">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
              Smart Community Blog Sphere
            </span>
            <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Read. Write. Collaborate.
            </h1>
            <p className="mt-4 max-w-xl mx-auto text-lg text-slate-400 font-medium">
              Discover stories, collaborate on code reviews, translate articles instantly, and participate in peer editing.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <a
                href="#feed-start"
                className="px-6 py-3 rounded-full text-sm font-semibold bg-primary-600 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
              >
                Start Reading
              </a>
              <Link
                to="/editor"
                className="px-6 py-3 rounded-full text-sm font-semibold bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
              >
                Create Article
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Main Feed Container */}
      <div id="feed-start" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Feed Column */}
          <main className="flex-1">
            {/* Search/Category filter headings */}
            {(category || tag || search) && (
              <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-500">
                  Showing results for:{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {category ? `Category: ${category}` : tag ? `#${tag}` : `Search query "${search}"`}
                  </span>
                </div>
                <Link to="/" className="text-xs text-primary-500 hover:underline">
                  Clear filters
                </Link>
              </div>
            )}

            {/* Feed Tabs Selector */}
            {!category && !tag && !search && isAuthenticated && (
              <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
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
                <button
                  onClick={() => setActiveFeedTab('all')}
                  className={`py-3.5 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                    activeFeedTab === 'all'
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>Trending</span>
                </button>
              </div>
            )}

            {/* Loading Grid */}
            {loading ? (
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
