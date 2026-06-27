import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Clock, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Clean text helper that handles both HTML and JSON block array structure
const getCleanText = (content) => {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map(b => b.content || '').join(' ');
    }
  } catch (e) {}
  return content.replace(/<[^>]*>/g, ' ');
};

// Estimate reading time helper
const getReadTime = (content) => {
  const text = getCleanText(content).replace(/\s+/g, ' ').trim();
  if (!text) return 1;
  const wordCount = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 225)); // 225 words per minute average
};

// Stripping content for card snippet
const getSnippet = (content) => {
  const text = getCleanText(content).replace(/\s+/g, ' ').trim();
  return text.substring(0, 140) + (text.length > 140 ? '...' : '');
};

export default function BlogCard({ blog }) {
  const readTime = getReadTime(blog.content);
  const snippet = getSnippet(blog.content);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Cover Image */}
      <Link to={`/blog/${blog.slug}`} className="block relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={blog.coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800'}
          alt={blog.title}
          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
        />
        {/* Category Badge */}
        {blog.category && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-primary-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm dark:bg-slate-900/90 dark:text-primary-400">
            {blog.category}
          </span>
        )}
      </Link>

      {/* Card Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {blog.tags.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="text-[10px] text-slate-400 font-semibold uppercase">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <Link to={`/blog/${blog.slug}`}>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-2 leading-snug">
              {blog.title}
            </h2>
          </Link>

          {/* Snippet */}
          <p className="mt-2.5 text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
            {snippet}
          </p>
        </div>

        {/* Card Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          {/* Author */}
          {blog.author ? (
            <Link to={`/profile/${blog.author._id}`} className="flex items-center gap-2 group">
              <img
                src={blog.author.profileImage}
                alt={blog.author.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-100 dark:ring-slate-800"
              />
              <div>
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary-600 transition-colors">
                  {blog.author.name}
                </span>
                <span className="block text-[9px] text-slate-400">
                  {new Date(blog.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <User className="w-8 h-8 p-1 bg-slate-100 rounded-full dark:bg-slate-800" />
              <span className="text-xs">Unknown Author</span>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-xs">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {blog.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {blog.likes?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {readTime}m
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
