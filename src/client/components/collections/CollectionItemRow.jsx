import React from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { getCoverImageForBlog } from '../../utils/imageUtils';

export default function CollectionItemRow({ 
  index, 
  item, 
  onNoteChange, 
  onRemove, 
  onDragStart, 
  onDragOver, 
  onDragEnd 
}) {
  const blog = item.blog || {};
  const coverUrl = getCoverImageForBlog(blog);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className="flex items-center gap-4 p-4 bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur rounded-2xl cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-indigo-500/20 group animate-fade-in"
    >
      {/* Drag Handle */}
      <div className="text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 transition-colors shrink-0">
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Index Number */}
      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
        {index + 1}
      </div>

      {/* Thumbnail */}
      <img
        src={coverUrl}
        alt={blog.title || 'Article'}
        className="w-12 h-12 rounded-xl object-cover border border-slate-200/60 dark:border-slate-800 shrink-0"
        onError={(e) => { e.target.src = getCoverImageForBlog({ title: (blog.title || '') + 'alt' }); }}
      />

      {/* Title & Notes Input */}
      <div className="flex-1 min-w-0 text-left">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
          {blog.title || 'Untitled Article'}
        </h4>
        <input
          type="text"
          value={item.note || ''}
          onChange={(e) => onNoteChange(index, e.target.value)}
          placeholder="Add an optional curator note for this item..."
          className="w-full mt-1.5 px-3 py-1.5 text-xs border rounded-lg bg-slate-50/50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-350"
        />
      </div>

      {/* Delete Trigger */}
      <button
        type="button"
        onClick={() => onRemove(blog._id)}
        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:bg-rose-955/20 rounded-xl transition-all shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Remove from Collection"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
