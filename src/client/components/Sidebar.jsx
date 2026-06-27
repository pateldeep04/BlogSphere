import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tag, BookOpen, Compass, BookMarked, UserCheck } from 'lucide-react';
import api from '../utils/api.js';

const CATEGORIES = ['Technology', 'Travel', 'Food', 'Education', 'Sports'];
const POPULAR_TAGS = ['React', 'JavaScript', 'NodeJS', 'MERN', 'CSS', 'AI', 'WebDev'];

export default function Sidebar({ currentCategory, currentTag }) {
  const navigate = useNavigate();
  const [offlineArticles, setOfflineArticles] = useState([]);
  const [recommendedAuthors, setRecommendedAuthors] = useState([]);

  useEffect(() => {
    // Load offline stored blogs
    const saved = localStorage.getItem('offline_blogs');
    if (saved) {
      setOfflineArticles(JSON.parse(saved));
    }

    // Load active authors / popular authors
    api.get('/api/blogs')
      .then((res) => {
        const blogs = res.data.blogs || [];
        // Extract unique authors
        const authors = [];
        const seen = new Set();
        for (const blog of blogs) {
          if (blog.author && !seen.has(blog.author._id)) {
            seen.add(blog.author._id);
            authors.push(blog.author);
          }
          if (authors.length >= 3) break;
        }
        setRecommendedAuthors(authors);
      })
      .catch(console.error);
  }, []);

  return (
    <aside className="w-full lg:w-80 flex flex-col gap-6">
      {/* Categories Panel */}
      <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 glass-card">
        <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary-500" />
          <span>Categories</span>
        </h3>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = currentCategory === cat;
            return (
              <Link
                key={cat}
                to={isActive ? '/' : `/?category=${cat}`}
                className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors flex justify-between items-center ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tags Panel */}
      <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 glass-card">
        <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary-500" />
          <span>Popular Tags</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TAGS.map((tag) => {
            const isActive = currentTag === tag;
            return (
              <Link
                key={tag}
                to={isActive ? '/' : `/?tag=${tag}`}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all border ${
                  isActive
                    ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/10'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary-500 dark:hover:border-primary-400'
                }`}
              >
                #{tag}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recommended Authors Panel */}
      {recommendedAuthors.length > 0 && (
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 glass-card">
          <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary-500" />
            <span>Popular Authors</span>
          </h3>
          <div className="flex flex-col gap-3">
            {recommendedAuthors.map((author) => (
              <Link
                key={author._id}
                to={`/profile/${author._id}`}
                className="flex items-center gap-3 group"
              >
                <img
                  src={author.profileImage}
                  alt={author.name}
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                />
                <div>
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary-600 transition-colors">
                    {author.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">
                    {author.bio || 'Wandering explorer and wordsmith'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Saved Offline Articles */}
      <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 glass-card">
        <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-primary-500" />
          <span>Offline Reading</span>
        </h3>
        {offlineArticles.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Save articles dynamically to read them when offline.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {offlineArticles.map((art) => (
              <Link
                key={art._id}
                to={`/blog/${art.slug}`}
                className="text-xs font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 line-clamp-2"
              >
                📖 {art.title}
              </Link>
            ))}
            <button
              onClick={() => {
                localStorage.removeItem('offline_blogs');
                setOfflineArticles([]);
              }}
              className="text-[10px] text-rose-500 hover:underline text-left mt-1 self-start"
            >
              Clear saved articles
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
