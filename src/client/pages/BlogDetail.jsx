import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Eye, Heart, Clock, Volume2, Globe, Sparkles, History, Bookmark, MessageSquare, CornerDownRight, Play, Pause, Square, Trash2, ArrowLeft, Check, UserPlus, UserMinus, X, AlertCircle, Mail } from 'lucide-react';
import api from '../utils/api.js';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { updateCurrentUser } from '../redux/authSlice.js';

const parseInlineMarkdown = (text) => {
  if (!text) return '';
  // Clean up any leading list bullet/dash if it somehow slipped through
  let cleanText = text.trim().replace(/^[*\-•]\s*/, '');
  
  // Parse markdown bold (**text**) into HTML/React bold elements
  const parts = cleanText.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-bold">{part}</strong>;
    }
    return part;
  });
};

const renderBlogContent = (contentString) => {
  if (!contentString) return null;
  
  try {
    const blocks = JSON.parse(contentString);
    if (Array.isArray(blocks)) {
      return (
        <div className="space-y-6">
          {blocks.map((block) => {
            switch (block.type) {
              case 'h1':
                return (
                  <h1 key={block.id} className={`text-3xl mt-8 mb-4 text-slate-900 dark:text-white ${block.bold === false ? 'font-normal' : 'font-extrabold'} ${block.italic ? 'italic' : ''} ${block.underline ? 'underline' : ''}`}>
                    {parseInlineMarkdown(block.content)}
                  </h1>
                );
              case 'h2':
                return (
                  <h2 key={block.id} className={`text-2xl mt-6 mb-3 text-slate-800 dark:text-slate-100 ${block.bold === false ? 'font-normal' : 'font-bold'} ${block.italic ? 'italic' : ''} ${block.underline ? 'underline' : ''}`}>
                    {parseInlineMarkdown(block.content)}
                  </h2>
                );
              case 'p':
                return (
                  <p key={block.id} className={`text-slate-700 dark:text-slate-300 leading-relaxed text-base whitespace-pre-wrap ${block.bold ? 'font-bold' : 'font-normal'} ${block.italic ? 'italic' : ''} ${block.underline ? 'underline' : ''}`}>
                    {parseInlineMarkdown(block.content)}
                  </p>
                );
              case 'quote':
                return (
                  <blockquote key={block.id} className={`border-l-4 border-primary-500 pl-4 my-4 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-r-2xl whitespace-pre-wrap ${block.bold ? 'font-bold' : 'font-normal'} ${block.italic === false ? 'not-italic' : 'italic'} ${block.underline ? 'underline' : ''}`}>
                    {parseInlineMarkdown(block.content)}
                  </blockquote>
                );
              case 'code':
                return (
                  <div key={block.id} className="relative my-6 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800 bg-slate-950 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 font-mono text-sm shadow-inner">
                    <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>{block.language || 'code'}</span>
                    </div>
                    <pre className="p-4 overflow-x-auto">
                      <code>{block.content}</code>
                    </pre>
                  </div>
                );
              case 'callout':
                return (
                  <div key={block.id} className="bg-primary-50/50 border border-primary-100 dark:bg-primary-950/20 dark:border-primary-900/30 p-4 rounded-2xl flex gap-3.5 my-5">
                    <span className="text-2xl select-none animate-bounce" role="img" aria-label="callout icon">
                      {block.icon || '💡'}
                    </span>
                    <div className={`text-slate-700 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-wrap ${block.bold === false ? 'font-normal' : 'font-semibold'} ${block.italic ? 'italic' : ''} ${block.underline ? 'underline' : ''}`}>
                      {parseInlineMarkdown(block.content)}
                    </div>
                  </div>
                );
              case 'image':
                return (
                  <figure key={block.id} className="my-8 flex flex-col items-center">
                    <div className="rounded-3xl overflow-hidden shadow-md max-w-full border border-slate-100 dark:border-slate-800/80">
                      <img
                        src={block.url || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800'}
                        alt={block.caption || 'Blog Image'}
                        className="max-h-[500px] w-auto object-contain hover:scale-[1.01] transition-transform duration-300"
                      />
                    </div>
                    {block.caption && (
                      <figcaption className="text-center text-xs text-slate-400 mt-2.5 italic">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              case 'list':
                return (
                  <ul key={block.id} className="list-disc pl-6 space-y-1.5 my-4">
                    {block.content.split('\n').filter(Boolean).map((item, idx) => (
                      <li key={idx} className={`text-slate-700 dark:text-slate-300 text-base leading-relaxed ${block.bold ? 'font-bold' : 'font-normal'} ${block.italic ? 'italic' : ''} ${block.underline ? 'underline' : ''}`}>
                        {parseInlineMarkdown(item)}
                      </li>
                    ))}
                  </ul>
                );
              default:
                return null;
            }
          })}
        </div>
      );
    }
  } catch (e) {
    // Fall back to legacy HTML content
  }

  return (
    <div
      className="text-slate-800 dark:text-slate-200 leading-relaxed text-base space-y-4"
      dangerouslySetInnerHTML={{ __html: contentString }}
    />
  );
};

export default function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Translations cache/view states
  const [currentLang, setCurrentLang] = useState('en');
  const [renderedTitle, setRenderedTitle] = useState('');
  const [renderedContent, setRenderedContent] = useState('');
  const [translating, setTranslating] = useState(false);

  // AI Summary states
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Version history states
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);

  // Likes, Reactions & Bookmark states
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [reactions, setReactions] = useState({ thumbsUp: [], heart: [], clap: [], laugh: [] });

  // Followers states
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Newsletter states
  const [isNewsletterSubscribed, setIsNewsletterSubscribed] = useState(false);
  const [newsletterSubscribersCount, setNewsletterSubscribersCount] = useState(0);

  // Speech synthesis states
  const [speechState, setSpeechState] = useState('stopped'); // 'playing', 'paused', 'stopped'
  const synthRef = useRef(window.speechSynthesis);
  const utteranceRef = useRef(null);

  // Analytics tracking refs & states
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);

  // Report states
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  // Comments states
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Load blog details
  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/api/blogs/${slug}`)
      .then((res) => {
        const data = res.data.blog;
        setBlog(data);
        setRenderedTitle(data.title);
        setRenderedContent(data.content);
        setLikesCount(data.likes?.length || 0);
        setIsLiked(isAuthenticated && data.likes?.includes(user?._id));
        setReactions(data.reactions || { thumbsUp: [], heart: [], clap: [], laugh: [] });
        
        setFollowersCount(data.author?.followers?.length || 0);
        setIsFollowing(isAuthenticated && data.author?.followers?.includes(user?._id));
        
        setIsNewsletterSubscribed(isAuthenticated && data.author?.newsletterSubscribers?.includes(user?._id));
        setNewsletterSubscribersCount(data.author?.newsletterSubscribers?.length || 0);

        // Check if bookmarked
        if (isAuthenticated && user?.savedBlogs) {
          setIsBookmarked(user.savedBlogs.includes(data._id));
        } else {
          const bookmarks = JSON.parse(localStorage.getItem('offline_blogs') || '[]');
          setIsBookmarked(bookmarks.some(b => b._id === data._id));
        }

        // Load comments
        fetchComments(data._id);
        setLoading(false);
      })
      .catch((err) => {
        // Check if we are offline and have this blog saved in local storage!
        const offlineBlogs = JSON.parse(localStorage.getItem('offline_blogs') || '[]');
        const matchingOffline = offlineBlogs.find(b => b.slug === slug);
        if (matchingOffline) {
          setBlog(matchingOffline);
          setRenderedTitle(matchingOffline.title);
          setRenderedContent(matchingOffline.content);
          setLikesCount(matchingOffline.likes?.length || 0);
          setReactions(matchingOffline.reactions || { thumbsUp: [], heart: [], clap: [], laugh: [] });
          setIsBookmarked(true);
          setComments([]);
          setLoading(false);
        } else {
          setError(err.response?.data?.error || 'Failed to load article.');
          setLoading(false);
        }
      });

    return () => {
      // Stop speech synthesis on unmount
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [slug, isAuthenticated, user]);

  // Scroll tracking for completion rate analytics
  useEffect(() => {
    const handleScroll = () => {
      if (completedRef.current) return;
      const threshold = 150;
      const totalHeight = document.documentElement.scrollHeight;
      const currentScroll = window.innerHeight + window.scrollY;
      if (totalHeight - currentScroll < threshold) {
        completedRef.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Time duration tracking for reading time and bounces analytics
  useEffect(() => {
    startTimeRef.current = Date.now();
    completedRef.current = false;

    return () => {
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (durationSeconds > 0 && blog?._id) {
        api.post(`/api/blogs/${blog._id}/analytics`, {
          duration: durationSeconds,
          completed: completedRef.current
        }).catch(err => console.error('Failed logging reading analytics:', err));
      }
    };
  }, [blog?._id]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to report articles.');
      return;
    }
    if (!reportReason.trim()) return;

    setReporting(true);
    try {
      await api.post(`/api/blogs/${blog._id}/report`, { reason: reportReason.trim() });
      alert('Thank you! This article has been flagged and sent for moderation.');
      setReportOpen(false);
      setReportReason('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to file report.');
    } finally {
      setReporting(false);
    }
  };

  const fetchComments = async (blogId) => {
    try {
      const res = await api.get(`/api/comments/${blogId}`);
      setComments(res.data.comments || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Like action
  const handleLike = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      const res = await api.post(`/api/blogs/${blog._id}/like`);
      setLikesCount(res.data.likesCount);
      setIsLiked(res.data.isLiked);
      if (res.data.isLiked) {
        confetti({ particleCount: 30, angle: 60, spread: 55, origin: { x: 0 } });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Follow author action
  const handleFollow = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      const res = await api.post(`/api/users/${blog.author._id}/follow`);
      setFollowersCount(res.data.followersCount);
      setIsFollowing(res.data.isFollowing);
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Newsletter Subscription to author
  const handleNewsletterToggle = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      const res = await api.post(`/api/users/newsletter/${blog.author._id}`);
      setIsNewsletterSubscribed(res.data.isSubscribed);
      setNewsletterSubscribersCount(res.data.subscribersCount);
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle reaction to blog post
  const handleReact = async (reactionType) => {
    if (!isAuthenticated) return navigate('/login');
    try {
      const res = await api.post(`/api/blogs/${blog._id}/react`, { reactionType });
      setReactions(res.data.reactions);
      if (res.data.isReacted) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.85 }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bookmark / Database sync + Offline reading save
  const handleBookmark = async () => {
    if (!isAuthenticated) return navigate('/login');
    try {
      const res = await api.post(`/api/users/bookmarks/${blog._id}`);
      const currentlyBookmarked = res.data.isBookmarked;
      setIsBookmarked(currentlyBookmarked);

      const bookmarksList = JSON.parse(localStorage.getItem('offline_blogs') || '[]');
      if (currentlyBookmarked) {
        if (!bookmarksList.some(b => b._id === blog._id)) {
          bookmarksList.push({
            ...blog,
            title: renderedTitle,
            content: renderedContent // save translated version if active
          });
        }
        confetti({ particleCount: 40, spread: 60 });
      } else {
        const updated = bookmarksList.filter(b => b._id !== blog._id);
        localStorage.setItem('offline_blogs', JSON.stringify(updated));
      }
      localStorage.setItem('offline_blogs', JSON.stringify(bookmarksList));

      // Update Redux state
      const updatedUser = { ...user, savedBlogs: res.data.savedBlogs };
      dispatch(updateCurrentUser(updatedUser));
    } catch (e) {
      console.error(e);
    }
  };

  // AI Summary Generator
  const handleGenerateSummary = async () => {
    if (blog.summary && blog.summary !== '.') {
      setShowSummary(!showSummary);
      return;
    }
    setGeneratingSummary(true);
    try {
      const res = await api.post(`/api/blogs/${blog._id}/summary`);
      setBlog({ ...blog, summary: res.data.summary, keyPoints: res.data.keyPoints });
      setShowSummary(true);
      setGeneratingSummary(false);
    } catch (e) {
      console.error(e);
      setGeneratingSummary(false);
    }
  };

  // Translation Trigger
  const handleTranslate = async (lang) => {
    if (lang === currentLang) return;
    setTranslating(true);
    try {
      const res = await api.post(`/api/blogs/${blog._id}/translate`, { lang });
      setRenderedTitle(res.data.title);
      setRenderedContent(res.data.content);
      setCurrentLang(lang);
      setTranslating(false);

      // Cancel speaking if active
      if (speechState !== 'stopped') {
        handleStopSpeaking();
      }
    } catch (e) {
      console.error(e);
      setTranslating(false);
    }
  };

  // Text To Speech synthesizers
  const handleStartSpeaking = () => {
    if (!synthRef.current) return;

    if (speechState === 'paused') {
      synthRef.current.resume();
      setSpeechState('playing');
      return;
    }

    synthRef.current.cancel();

    // Strip HTML/JSON content to speak plaintext
    let cleanText = '';
    try {
      const parsed = JSON.parse(renderedContent);
      if (Array.isArray(parsed)) {
        cleanText = parsed.map(b => b.content || '').join('. ');
      } else {
        cleanText = renderedContent.replace(/<[^>]*>/g, ' ');
      }
    } catch (e) {
      cleanText = renderedContent.replace(/<[^>]*>/g, ' ');
    }
    const plaintext = cleanText.replace(/\s+/g, ' ').trim();
    const textToSpeak = `${renderedTitle}. By ${blog.author?.name || 'Anonymous'}. ${plaintext}`;

    utteranceRef.current = new SpeechSynthesisUtterance(textToSpeak);
    
    // Choose appropriate voice/language if translated
    if (currentLang === 'hi') {
      utteranceRef.current.lang = 'hi-IN';
    } else if (currentLang === 'gu') {
      utteranceRef.current.lang = 'gu-IN';
    } else {
      utteranceRef.current.lang = 'en-US';
    }

    utteranceRef.current.onend = () => {
      setSpeechState('stopped');
    };

    utteranceRef.current.onerror = () => {
      setSpeechState('stopped');
    };

    setSpeechState('playing');
    synthRef.current.speak(utteranceRef.current);
  };

  const handlePauseSpeaking = () => {
    if (synthRef.current && speechState === 'playing') {
      synthRef.current.pause();
      setSpeechState('paused');
    }
  };

  const handleStopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeechState('stopped');
    }
  };

  // Load versions
  const handleViewVersions = async () => {
    setShowVersions(true);
    try {
      const res = await api.get(`/api/blogs/${blog._id}/versions`);
      setVersions(res.data.versions || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestoreVersion = async (vId) => {
    try {
      const res = await api.post(`/api/blogs/${blog._id}/versions/${vId}/restore`);
      setBlog(res.data.blog);
      setRenderedTitle(res.data.blog.title);
      setRenderedContent(res.data.blog.content);
      setShowVersions(false);
      setSelectedVersion(null);
      confetti({ particleCount: 100, spread: 70 });
    } catch (e) {
      console.error(e);
    }
  };

  // Post comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await api.post('/api/comments', {
        blogId: blog._id,
        text: commentText.trim()
      });
      setComments([res.data.comment, ...comments]);
      setCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  // Post reply comment
  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const res = await api.post('/api/comments', {
        blogId: blog._id,
        text: replyText.trim(),
        parentComment: replyTarget
      });
      setComments([...comments, res.data.comment]);
      setReplyText('');
      setReplyTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (id) => {
    try {
      await api.delete(`/api/comments/${id}`);
      setComments(comments.filter(c => c._id !== id && c.parentComment !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse">
        <div className="bg-slate-200 dark:bg-slate-800 aspect-video rounded-3xl mb-8" />
        <div className="bg-slate-200 dark:bg-slate-800 h-8 w-2/3 rounded mb-4" />
        <div className="bg-slate-200 dark:bg-slate-800 h-4 w-1/4 rounded" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Article Load Failed</h3>
        <p className="text-slate-400 mt-1">{error || 'Article not found.'}</p>
        <Link to="/" className="mt-6 inline-block bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full">
          Back to Home
        </Link>
      </div>
    );
  }

  const isOwner = isAuthenticated && (
    blog.author?._id === user?._id ||
    user?.role === 'admin'
  );

  const isAuthorOrCollaborator = isAuthenticated && (
    isOwner ||
    blog.collaborators?.some(c => c._id === user?._id)
  );

  return (
    <div className="max-w-[92%] xl:max-w-[1300px] mx-auto px-4 py-8 relative">
      {/* Back button */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to feed</span>
      </Link>

      {/* Cover Image */}
      <div className="aspect-video rounded-3xl overflow-hidden shadow-md bg-slate-100 dark:bg-slate-800 mb-8 border border-slate-100 dark:border-slate-800">
        <img
          src={(() => {
            const src = blog.coverImage || '';
            const md = src.match(/!\[.*?\]\((.*?)\)/);
            return (md ? md[1] : src.trim()) || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800';
          })()}
          alt={blog.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800'; }}
        />
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
        {renderedTitle}
      </h1>

      {/* Author Card Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${blog.author?._id}`}>
            <img
              src={blog.author?.profileImage}
              alt={blog.author?.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-500/10"
            />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link to={`/profile/${blog.author?._id}`} className="font-bold text-slate-800 dark:text-slate-100 hover:underline">
                {blog.author?.name}
              </Link>
              {blog.author?.reputationPoints !== undefined && (
                <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm" title="Reputation Level">
                  <span>✨ {blog.author.badge || 'Reader'}</span>
                  <span className="text-slate-400 font-medium">({blog.author.reputationPoints} pts)</span>
                </span>
              )}
              {(!user || blog.author?._id !== user?._id) && (
                <>
                  <button
                    onClick={handleFollow}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                      isFollowing
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400 hover:bg-primary-100'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button
                    onClick={handleNewsletterToggle}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1 ${
                      isNewsletterSubscribed
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-955/20 dark:text-rose-400'
                        : 'bg-indigo-50 text-indigo-655 hover:bg-indigo-100 dark:bg-indigo-955/20 dark:text-indigo-400'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span>{isNewsletterSubscribed ? 'Subscribed' : 'Newsletter'}</span>
                  </button>
                </>
              )}
            </div>
            <span className="text-xs text-slate-400">
              Published on {new Date(blog.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Read features Toolbar */}
        <div className="flex items-center gap-2">
          {/* TTS Player */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-full p-1 border border-slate-200/50 dark:border-slate-800">
            {speechState === 'stopped' ? (
              <button
                onClick={handleStartSpeaking}
                title="Listen to article"
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-primary-500"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            ) : (
              <>
                {speechState === 'playing' ? (
                  <button onClick={handlePauseSpeaking} className="p-2 text-primary-500"><Pause className="w-4 h-4" /></button>
                ) : (
                  <button onClick={handleStartSpeaking} className="p-2 text-slate-500"><Play className="w-4 h-4" /></button>
                )}
                <button onClick={handleStopSpeaking} className="p-2 text-rose-500"><Square className="w-4 h-4" /></button>
              </>
            )}
          </div>

          {/* Translation flag switches */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-full p-1 border border-slate-200/50 dark:border-slate-800">
            <button
              onClick={() => handleTranslate('en')}
              className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                currentLang === 'en' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-500'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleTranslate('hi')}
              className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                currentLang === 'hi' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-500'
              }`}
            >
              HI
            </button>
            <button
              onClick={() => handleTranslate('gu')}
              className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                currentLang === 'gu' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600 dark:text-primary-400' : 'text-slate-500'
              }`}
            >
              GU
            </button>
          </div>

          {/* AI summary CTA */}
          <button
            onClick={handleGenerateSummary}
            disabled={generatingSummary}
            className="p-2 text-slate-600 hover:text-amber-500 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200/50 dark:border-slate-800 disabled:opacity-50"
            title="Generate AI Summary"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Version Control Trigger */}
          {isAuthorOrCollaborator && (
            <button
              onClick={handleViewVersions}
              className="p-2 text-slate-600 hover:text-indigo-500 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200/50 dark:border-slate-800"
              title="Version History"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {/* Owner edit button */}
          {isOwner && (
            <Link
              to={`/editor?edit=${blog._id}`}
              className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-full text-xs shadow-md shadow-primary-500/10"
            >
              Edit
            </Link>
          )}

          {/* Collaborative edit button */}
          {isAuthorOrCollaborator && !isOwner && (
            <Link
              to={`/editor?edit=${blog._id}`}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-full text-xs dark:bg-indigo-950/20 dark:text-indigo-400"
            >
              Edit Collab
            </Link>
          )}
        </div>
      </div>

      {/* AI Summary Highlight Card */}
      {showSummary && (blog.summary || blog.keyPoints?.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/5"
        >
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold mb-3">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <h3 className="font-heading text-lg">AI Smart Summary</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
            {blog.summary}
          </p>
          {blog.keyPoints && blog.keyPoints.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">5 Key Takeaways</h4>
              <ul className="space-y-1.5">
                {blog.keyPoints.map((point, idx) => (
                  <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2 items-start">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* Blog Content */}
      <article className="mt-8 prose prose-slate max-w-none dark:prose-invert">
        {translating ? (
          <div className="py-20 text-center text-slate-400">Translating text content, please wait...</div>
        ) : (
          renderBlogContent(renderedContent)
        )}
      </article>

      {/* Tags row */}
      {blog.tags && blog.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          {blog.tags.map((t, i) => (
            <span key={i} className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-400">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Social Actions row (Like, Reactions & Bookmark) */}
      <div className="mt-8 flex flex-col md:flex-row justify-between gap-4 bg-slate-50 dark:bg-slate-900/30 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-6">
          {/* Emojis Reactions */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-150 dark:border-slate-800">
            {[
              { type: 'thumbsUp', label: '👍', name: 'Like' },
              { type: 'heart', label: '❤️', name: 'Love' },
              { type: 'clap', label: '👏', name: 'Clap' },
              { type: 'laugh', label: '😂', name: 'Haha' }
            ].map((emoji) => {
              const list = reactions[emoji.type] || [];
              const hasReacted = isAuthenticated && list.includes(user?._id);
              return (
                <button
                  key={emoji.type}
                  onClick={() => handleReact(emoji.type)}
                  title={emoji.name}
                  className={`flex items-center gap-1 text-sm transition-all hover:scale-125 px-1.5 py-0.5 rounded-md ${
                    hasReacted ? 'bg-primary-50 dark:bg-primary-950/20' : ''
                  }`}
                >
                  <span className="text-base">{emoji.label}</span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{list.length}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
            <Eye className="w-5 h-5 text-slate-550" />
            <span className="font-semibold">{blog.views} Reads</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleBookmark}
            className={`flex items-center gap-1.5 text-sm font-bold transition-all hover:scale-105 ${
              isBookmarked ? 'text-primary-500' : 'text-slate-400 hover:text-primary-500'
            }`}
            title={isBookmarked ? 'Saved to bookmarks' : 'Bookmark article'}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
          </button>

          {isAuthenticated && (
            <button
              onClick={() => setReportOpen(true)}
              className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-rose-500 transition-all hover:scale-105"
              title="Report this article"
            >
              <AlertCircle className="w-5 h-5" />
              <span>Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Version history Comparison panel */}
      <AnimatePresence>
        {showVersions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Blog Revision History</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Compare and restore previous versions of this article.</p>
                </div>
                <button
                  onClick={() => {
                    setShowVersions(false);
                    setSelectedVersion(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* List versions */}
                <div className="w-72 border-r border-slate-100 dark:border-slate-800 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/20">
                  {versions.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-6 text-center">No version logs found. Edits create automatic history entries.</div>
                  ) : (
                    versions.map((ver) => (
                      <div
                        key={ver._id}
                        onClick={() => setSelectedVersion(ver)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedVersion?._id === ver._id
                            ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/15'
                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Version #{ver.versionNumber}</span>
                          <span className="text-[10px] text-slate-400">{new Date(ver.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <img src={ver.editedBy?.profileImage} className="w-4 h-4 rounded-full" />
                          <span className="text-[10px] text-slate-500 truncate">Edited by {ver.editedBy?.name}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Inspect Diff / content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
                  {selectedVersion ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Reviewing Version #{selectedVersion.versionNumber}</h4>
                          <span className="text-xs text-slate-400">Edited on {new Date(selectedVersion.createdAt).toLocaleString()}</span>
                        </div>
                        <button
                          onClick={() => handleRestoreVersion(selectedVersion._id)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-full shadow-md"
                        >
                          Restore This Version
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Title</span>
                          <h3 className="text-xl font-extrabold text-slate-700 dark:text-slate-300 mt-1">{selectedVersion.title}</h3>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Content Archive</span>
                          <div
                            className="text-sm prose max-w-none border border-slate-100 dark:border-slate-800 p-4 rounded-xl dark:prose-invert bg-slate-50 dark:bg-slate-950/20"
                            dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center text-slate-400 text-sm">
                      <History className="w-12 h-12 text-slate-300 mb-3" />
                      Select a version log from the sidebar to inspect content diffs.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Section */}
      <div className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-primary-500" />
          <h3 className="font-heading text-xl font-bold">Discussion ({comments.length})</h3>
        </div>

        {/* Comment form */}
        {isAuthenticated ? (
          <form onSubmit={handlePostComment} className="flex gap-3 items-start mb-8">
            <img src={user?.profileImage} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts on this article..."
                className="w-full p-3 text-sm border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows="3"
              />
              <button
                type="submit"
                className="mt-2.5 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-full text-xs shadow-md"
              >
                Post Comment
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center p-6 bg-slate-50 dark:bg-slate-900 border rounded-2xl mb-8">
            <p className="text-sm text-slate-500">
              Please{' '}
              <Link to="/login" className="text-primary-500 hover:underline font-bold">
                log in
              </Link>{' '}
              to participate in the conversation.
            </p>
          </div>
        )}

        {/* Nested Comments rendering */}
        <div className="space-y-6">
          {comments
            .filter((c) => !c.parentComment) // Root comments
            .map((rootComment) => (
              <div key={rootComment._id} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900/60 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <img src={rootComment.userId?.profileImage} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <span className="block text-sm font-semibold">{rootComment.userId?.name}</span>
                      <span className="block text-[10px] text-slate-400">{new Date(rootComment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Delete Comment */}
                  {isAuthenticated && (
                    (user?._id === rootComment.userId?._id || user?.role === 'admin' || user?._id === blog.author?._id) && (
                      <button
                        onClick={() => handleDeleteComment(rootComment._id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1.5">
                  {rootComment.text}
                </p>

                {/* Reply button */}
                {isAuthenticated && (
                  <button
                    onClick={() => setReplyTarget(rootComment._id)}
                    className="text-xs font-semibold text-primary-500 hover:underline flex items-center gap-1"
                  >
                    <span>Reply</span>
                  </button>
                )}

                {/* Inline Reply Form */}
                {replyTarget === rootComment._id && (
                  <form onSubmit={handlePostReply} className="flex gap-2 items-start mt-2.5 pl-4 border-l-2 border-primary-500">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 p-2 text-xs border rounded-xl bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none"
                      rows="2"
                    />
                    <div className="flex flex-col gap-1.5">
                      <button type="submit" className="px-3 py-1.5 bg-primary-600 text-white rounded-full text-[10px] font-semibold">
                        Post
                      </button>
                      <button type="button" onClick={() => setReplyTarget(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Child Replies */}
                {comments
                  .filter((child) => child.parentComment === rootComment._id)
                  .map((childComment) => (
                    <div key={childComment._id} className="pl-6 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2.5 items-start">
                      <CornerDownRight className="w-4 h-4 text-slate-300 mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <img src={childComment.userId?.profileImage} className="w-6 h-6 rounded-full object-cover" />
                            <div>
                              <span className="block text-xs font-semibold">{childComment.userId?.name}</span>
                              <span className="block text-[8px] text-slate-400">{new Date(childComment.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Delete reply */}
                          {isAuthenticated && (
                            (user?._id === childComment.userId?._id || user?.role === 'admin' || user?._id === blog.author?._id) && (
                              <button
                                onClick={() => handleDeleteComment(childComment._id)}
                                className="text-slate-400 hover:text-rose-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {childComment.text}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
        </div>
      </div>

      {/* Report Post Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form onSubmit={handleReportSubmit} className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-2xl flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-850">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <span>Flag Article</span>
              </h3>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              If this article violates guidelines, contains plagiarism, hate speech, spam, or abusive language, please notify our moderation team.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reason / Details</label>
              <textarea
                placeholder="Explain why this article should be flagged..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border rounded-2xl bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-850 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-400 hover:text-slate-650"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reporting || !reportReason.trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-500/10 disabled:opacity-50 animate-pulse"
              >
                {reporting ? 'Filing Report...' : 'Submit Flag'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
