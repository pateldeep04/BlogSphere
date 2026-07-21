import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Clock, User, FolderPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { setAddToCollectionModal } from '../redux/collectionSlice';

import { getCoverImageForBlog } from '../utils/imageUtils';

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
  return Math.max(1, Math.ceil(wordCount / 225));
};

// Stripping content for card snippet
const getSnippet = (content) => {
  const text = getCleanText(content).replace(/\s+/g, ' ').trim();
  return text.substring(0, 130) + (text.length > 130 ? '...' : '');
};

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';

export default function BlogCard({ blog }) {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  const readTime = getReadTime(blog.content);
  const snippet = getSnippet(blog.content);
  const totalReactions = (blog.likes?.length || 0)
    + (blog.reactions?.thumbsUp?.length || 0)
    + (blog.reactions?.heart?.length || 0)
    + (blog.reactions?.clap?.length || 0)
    + (blog.reactions?.laugh?.length || 0);
  const imageUrl = sanitizeImageUrl(blog.coverImage) || FALLBACK_IMAGE;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300 card-hover-lift"
    >
      {/* Cover Image */}
      <Link to={`/blog/${blog.slug}`} className="block relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={imageUrl}
          alt={blog.title}
          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = getCoverImageForBlog({ title: blog.title + 'alt' }); }}
        />
        {/* Category Badge */}
        {blog.category && (
          <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md border border-white/10">
            {blog.category}
          </span>
        )}
      </Link>

      {/* Card Content */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between space-y-4">
        <div>
          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {blog.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wide">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <Link to={`/blog/${blog.slug}`}>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2 leading-snug tracking-tight">
              {blog.title}
            </h2>
          </Link>

          {/* Snippet */}
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
            {snippet}
          </p>
        </div>

        {/* Card Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
          {/* Author */}
          {blog.author?._id ? (
            <Link to={`/profile/${blog.author._id}`} className="flex items-center gap-2.5 group">
              <img
                src={blog.author.profileImage || FALLBACK_AVATAR}
                alt={blog.author.name || 'Author'}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-indigo-500/20"
              />
              <div>
                <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                  {blog.author.name || 'Anonymous'}
                </span>
                <span className="block text-[9px] font-bold text-slate-400">
                  {new Date(blog.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <User className="w-7 h-7 p-1 bg-slate-100 rounded-full dark:bg-slate-800" />
              <span className="text-xs font-bold">Anonymous</span>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-2.5 text-slate-400 dark:text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
              {blog.views || 0}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              {totalReactions}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {readTime}m
            </span>
            {isAuthenticated && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch(setAddToCollectionModal({ open: true, blogId: blog._id }));
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                title="Add to Collection"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
