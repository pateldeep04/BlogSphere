import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useToast } from '../context/ToastContext.jsx';
import { Eye, Heart, Clock, Volume2, Globe, Sparkles, History, Bookmark, MessageSquare, CornerDownRight, Play, Pause, Square, Trash2, ArrowLeft, Check, UserPlus, UserMinus, X, AlertCircle, Mail } from 'lucide-react';
import api from '../utils/api.js';
import confetti from 'canvas-confetti';
import { m, AnimatePresence } from 'framer-motion';
import { updateCurrentUser } from '../redux/authSlice.js';

const parseInlineMarkdown = (text) => {
  if (!text) return '';
  // Clean up any leading list bullet/dash if it somehow slipped through
  let cleanText = text.trim().replace(/^[*\-•]\s*/, '');
  
  // Parse markdown bold (**text**) into HTML/React bold elements
  const parts = cleanText.split('**');
  return parts.map((part, pId) => {
    if (pId % 2 === 1) {
      return <strong key={part + '-' + pId} className="font-bold">{part}</strong>;
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
                    {block.content.split('\n').filter(Boolean).map((item) => (
                      <li key={item} className={`text-slate-700 dark:text-slate-300 text-base leading-relaxed ${block.bold ? 'font-bold' : 'font-normal'} ${block.italic ? 'italic' : ''} ${block.underline ? 'underline' : ''}`}>
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
  const { showToast } = useToast();

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

  // BlogSphere AI Features states
  const [activeAITab, setActiveAITab] = useState(null);

  // Debate State
  const [debateList, setDebateList] = useState([]);
  const [loadingDebate, setLoadingDebate] = useState(false);

  // Quiz State
  const [quizData, setQuizData] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState([null, null, null]);
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [currentQuizSlide, setCurrentQuizSlide] = useState(0);

  // Podcast State
  const [podcastScript, setPodcastScript] = useState([]);
  const [loadingPodcast, setLoadingPodcast] = useState(false);
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
  const [podcastLineIndex, setPodcastLineIndex] = useState(0);
  const podcastTimerRef = useRef(null);
  const canvasVisualizerRef = useRef(null);
  const visualizerAnimFrameRef = useRef(null);
  const podcastSynthRef = useRef(window.speechSynthesis || null);
  const podcastUtteranceRef = useRef(null);
  const [podcastPaused, setPodcastPaused] = useState(false);

  // Preload voices so they are available on first play
  useEffect(() => {
    const synth = podcastSynthRef.current;
    if (!synth) return;
    const load = () => synth.getVoices();
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

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
      showToast('Please log in to report articles.', 'warning');
      return;
    }
    if (!reportReason.trim()) return;

    setReporting(true);
    try {
      await api.post(`/api/blogs/${blog._id}/report`, { reason: reportReason.trim() });
      showToast('Thank you! This article has been flagged and sent for moderation.', 'success');
      setReportOpen(false);
      setReportReason('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to file report.', 'error');
    } finally {
      setReporting(false);
    }
  };

  // BlogSphere AI Features action handlers
  const handleLoadDebate = async () => {
    if (debateList.length > 0) return;
    setLoadingDebate(true);
    try {
      const res = await api.get(`/api/blogs/${blog._id}/ai-debate`);
      setDebateList(res.data.debate || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDebate(false);
    }
  };

  const handleLoadQuiz = async () => {
    if (quizData) return;
    setLoadingQuiz(true);
    try {
      const res = await api.get(`/api/blogs/${blog._id}/quiz`);
      setQuizData(res.data);
      setQuizAnswers([null, null, null]);
      setQuizResult(null);
      setCurrentQuizSlide(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (quizAnswers.some(ans => ans === null)) {
      showToast('Please answer all three questions.', 'warning');
      return;
    }
    setSubmittingQuiz(true);
    try {
      const res = await api.post(`/api/blogs/quiz/${quizData.quizId}/submit`, { answers: quizAnswers });
      setQuizResult(res.data);
      if (res.data.passed) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.8 }
        });
        if (res.data.reputationEarned > 0 && user) {
          dispatch(updateCurrentUser({
            ...user,
            reputationPoints: (user.reputationPoints || 0) + res.data.reputationEarned,
            badge: res.data.reputationEarned + (user.reputationPoints || 0) >= 100 ? 'Senior Scholar' : (res.data.reputationEarned + (user.reputationPoints || 0) >= 50 ? 'Active Learner' : 'Junior Scholar')
          }));
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to submit quiz.', 'error');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleLoadPodcast = async () => {
    if (podcastScript.length > 0) return;
    setLoadingPodcast(true);
    try {
      const res = await api.get(`/api/blogs/${blog._id}/podcast`);
      setPodcastScript(res.data.script || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPodcast(false);
    }
  };

  // Speak a single podcast line via Web Speech API, then advance to next
  const speakPodcastLine = (index) => {
    if (!podcastSynthRef.current || index >= podcastScript.length) {
      setIsPlayingPodcast(false);
      stopVisualizer();
      return;
    }

    const line = podcastScript[index];
    if (!line) return;

    // Cancel any currently speaking utterance
    podcastSynthRef.current.cancel();

    const utter = new SpeechSynthesisUtterance(line.text);
    utter.rate = 1.0;
    utter.pitch = line.speaker === 'Alex' ? 0.85 : 1.2;
    utter.volume = 1;

    // Pick a voice — prefer a matching one if available
    const voices = podcastSynthRef.current.getVoices();
    if (voices.length > 0) {
      if (line.speaker === 'Alex') {
        // Prefer a deep English male voice
        const maleVoice = voices.find(v =>
          /male|guy|david|mark|daniel|james/i.test(v.name) && /en/i.test(v.lang)
        ) || voices.find(v => /en/i.test(v.lang) && !v.name.toLowerCase().includes('female'));
        if (maleVoice) utter.voice = maleVoice;
      } else {
        // Prefer an English female voice for Jordan
        const femaleVoice = voices.find(v =>
          /female|woman|zira|samantha|karen|victoria|fiona|moira|ava/i.test(v.name) && /en/i.test(v.lang)
        ) || voices.find(v => /en/i.test(v.lang));
        if (femaleVoice) utter.voice = femaleVoice;
      }
    }

    utter.onstart = () => {
      setPodcastLineIndex(index);
      startVisualizer();
    };

    utter.onend = () => {
      if (index < podcastScript.length - 1) {
        speakPodcastLine(index + 1);
      } else {
        // Episode finished
        setIsPlayingPodcast(false);
        setPodcastLineIndex(0);
        stopVisualizer();
      }
    };

    utter.onerror = () => {
      // On error, try advancing anyway
      if (index < podcastScript.length - 1) {
        setTimeout(() => speakPodcastLine(index + 1), 500);
      } else {
        setIsPlayingPodcast(false);
        stopVisualizer();
      }
    };

    podcastUtteranceRef.current = utter;
    podcastSynthRef.current.speak(utter);
  };

  // Toggle Podcast simulation
  useEffect(() => {
    if (isPlayingPodcast && podcastScript.length > 0) {
      // Start speaking from the current line index
      speakPodcastLine(podcastLineIndex);
    } else {
      // Pause / stop
      if (podcastSynthRef.current) podcastSynthRef.current.cancel();
      if (podcastTimerRef.current) clearInterval(podcastTimerRef.current);
      stopVisualizer();
    }

    return () => {
      if (podcastSynthRef.current) podcastSynthRef.current.cancel();
      if (podcastTimerRef.current) clearInterval(podcastTimerRef.current);
      stopVisualizer();
    };
  }, [isPlayingPodcast]);

  const startVisualizer = () => {
    const canvas = canvasVisualizerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let frame = 0;
    const renderWave = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      const barCount = 40;
      const barWidth = 3;
      const gap = 4;
      const center = canvas.height / 2;
      
      ctx.fillStyle = '#6366f1';
      
      for (let i = 0; i < barCount; i++) {
        const scale = Math.sin(i * 0.15 + frame * 0.1) * Math.cos(i * 0.05 + frame * 0.05);
        const height = Math.abs(scale) * (canvas.height - 10) + 4;
        const x = i * (barWidth + gap) + 10;
        const y = center - height / 2;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, height, 2);
        } else {
          ctx.rect(x, y, barWidth, height);
        }
        ctx.fill();
      }
      
      ctx.restore();
      visualizerAnimFrameRef.current = requestAnimationFrame(renderWave);
    };
    renderWave();
  };

  const stopVisualizer = () => {
    if (visualizerAnimFrameRef.current) {
      cancelAnimationFrame(visualizerAnimFrameRef.current);
      visualizerAnimFrameRef.current = null;
    }
    const canvas = canvasVisualizerRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // Also cancel TTS if running
    if (podcastSynthRef.current && podcastSynthRef.current.speaking) {
      podcastSynthRef.current.cancel();
    }
  };

  // Proper play/pause toggle for podcast
  const handlePodcastToggle = () => {
    const synth = podcastSynthRef.current;
    if (!synth) return;

    if (isPlayingPodcast && !podcastPaused) {
      // Currently speaking — pause
      synth.pause();
      setPodcastPaused(true);
      stopVisualizer();
    } else if (isPlayingPodcast && podcastPaused) {
      // Paused — resume
      synth.resume();
      setPodcastPaused(false);
      startVisualizer();
    } else {
      // Not started yet — begin
      setPodcastPaused(false);
      setIsPlayingPodcast(true);
    }
  };

  useEffect(() => {
    if (activeAITab === 'debate') {
      handleLoadDebate();
    } else if (activeAITab === 'quiz') {
      handleLoadQuiz();
    } else if (activeAITab === 'podcast') {
      handleLoadPodcast();
    }
  }, [activeAITab]);

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

  const renderPodcastPlayer = () => {
    if (loadingPodcast) {
      return (
        <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
          Analyzing content to draft natural podcast discussions...
        </div>
      );
    }
    if (podcastScript.length === 0) {
      return (
        <div className="py-4 text-center">
          <button
            onClick={handleLoadPodcast}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 hover:scale-[1.01] transition-all"
          >
            Generate Podcast Script
          </button>
        </div>
      );
    }

    const currentLine = podcastScript[podcastLineIndex];

    return (
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePodcastToggle}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform hover:scale-105"
            >
              {isPlayingPodcast && !podcastPaused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <div>
              <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">AI Audio Briefing</span>
              <span className="block text-[10px] text-slate-400">Hosts: Alex & Jordan • Simulated Episode</span>
            </div>
          </div>
          <canvas
            ref={canvasVisualizerRef}
            width="300"
            height="40"
            className="w-[250px] h-[30px] opacity-80"
          />
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-white/5 shadow-inner min-h-[90px] flex items-center justify-start gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase text-white shadow-sm flex-shrink-0 ${
            currentLine?.speaker === 'Alex' ? 'bg-indigo-500' : 'bg-emerald-500'
          }`}>
            {currentLine?.speaker?.[0]}
          </div>
          <div className="flex-1 space-y-1">
            <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400">{currentLine?.speaker}</span>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-350 italic font-medium">"{currentLine?.text}"</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[8px] uppercase tracking-wider text-slate-400 font-bold">
            <span>Alex</span>
            <span>Progress {Math.round(((podcastLineIndex + 1) / podcastScript.length) * 100)}%</span>
            <span>Jordan</span>
          </div>
          <div className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${((podcastLineIndex + 1) / podcastScript.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderQuizContent = () => {
    if (loadingQuiz) {
      return (
        <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
          Curating study questions...
        </div>
      );
    }
    if (!quizData) return null;

    if (quizResult) {
      return (
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 space-y-4 text-center">
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">Quiz Results: {quizResult.score}/3 Correct</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {quizResult.passed 
              ? 'Congratulations! You answered all questions correctly and unlocked +15 reputation points!'
              : 'Keep reading closely! Review the article and try again to score 3/3.'}
          </p>
          
          <div className="space-y-3 text-left max-w-md mx-auto pt-2">
            {quizResult.details.map((d, index) => (
              <div key={index} className="p-3 bg-white dark:bg-slate-900 rounded-xl border flex items-start gap-2.5">
                <span className={`text-sm ${d.isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {d.isCorrect ? '✓' : '✗'}
                </span>
                <div className="flex-1 space-y-1">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-350">{d.question}</span>
                  <span className="block text-[10px] text-slate-400">
                    Your Answer: <strong className={d.isCorrect ? 'text-emerald-600' : 'text-rose-600'}>Choice {['A', 'B', 'C', 'D'][d.userAnswerIndex]}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setQuizResult(null);
              setQuizAnswers([null, null, null]);
              setCurrentQuizSlide(0);
            }}
            className="mt-3 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full text-xs font-bold shadow-md shadow-primary-500/15"
          >
            Retake Quiz
          </button>
        </div>
      );
    }

    const currentQuestion = quizData.questions[currentQuizSlide];
    if (!currentQuestion) return null;

    return (
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 space-y-4">
        <div className="flex justify-between items-center text-[10px] uppercase font-extrabold tracking-wider text-slate-455">
          <span>Question {currentQuizSlide + 1} of 3</span>
          <span className="bg-primary-500/10 text-primary-600 px-2.5 py-1 rounded-full border border-primary-500/20 font-bold">Rep Reward: +15</span>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{currentQuestion.question}</h4>
          
          <div className="grid gap-2.5">
            {currentQuestion.options.map((opt, oIdx) => {
              const isSelected = quizAnswers[currentQuizSlide] === oIdx;
              return (
                <button
                  key={oIdx}
                  onClick={() => {
                    const newAns = [...quizAnswers];
                    newAns[currentQuizSlide] = oIdx;
                    setQuizAnswers(newAns);
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary-500/10 border-primary-500/35 text-primary-600 dark:text-primary-400'
                      : 'bg-white hover:bg-slate-100 dark:bg-slate-900 border-slate-200/50 dark:border-white/5 text-slate-700 dark:text-slate-350'
                  }`}
                >
                  <span className="inline-block w-5 h-5 text-[10px] font-bold text-center border rounded-lg mr-2 select-none uppercase leading-5 bg-slate-100 dark:bg-white/5 border-slate-200/40">
                    {['a', 'b', 'c', 'd'][oIdx]}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => setCurrentQuizSlide(prev => Math.max(0, prev - 1))}
            disabled={currentQuizSlide === 0}
            className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-400 hover:text-slate-650 disabled:opacity-30"
          >
            Back
          </button>
          
          {currentQuizSlide < 2 ? (
            <button
              onClick={() => setCurrentQuizSlide(prev => Math.min(2, prev + 1))}
              disabled={quizAnswers[currentQuizSlide] === null}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={submittingQuiz || quizAnswers.some(ans => ans === null)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              <span>{submittingQuiz ? 'Submitting...' : 'Submit Quiz'}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDebateContent = () => {
    if (loadingDebate) {
      return (
        <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
          Simulating panel debate discussion from three developer perspectives...
        </div>
      );
    }
    if (debateList.length === 0) {
      return (
        <div className="py-4 text-center">
          <button
            onClick={handleLoadDebate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 hover:scale-[1.01] transition-all"
          >
            Launch AI Debate
          </button>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {debateList.map((msg, index) => {
          const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.avatarSeed}`;
          return (
            <m.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              className="p-3 bg-white dark:bg-slate-905 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex items-start gap-3.5 max-w-[92%]"
            >
              <img src={avatarUrl} className="w-8 h-8 rounded-full border bg-slate-100 border-slate-200/30 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{msg.persona}</span>
                  <span className={`text-[8px] uppercase tracking-wide px-1.5 py-0.5 font-bold rounded ${
                    msg.persona.includes('Skeptic') 
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455' 
                      : msg.persona.includes('Pragmatic')
                        ? 'bg-amber-500/10 text-amber-655 dark:text-amber-455'
                        : 'bg-indigo-500/10 text-indigo-655 dark:text-indigo-400'
                  }`}>
                    {msg.persona.includes('Skeptic') ? 'Critic' : msg.persona.includes('Pragmatic') ? 'Engineer' : 'Advocate'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-355">{msg.message}</p>
              </div>
            </m.div>
          );
        })}
      </div>
    );
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
        <m.div
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
                {blog.keyPoints.map((point) => (
                  <li key={point} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2 items-start">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </m.div>
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
          {blog.tags.map((t) => (
            <span key={t} className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-400">
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

      {/* 🚀 BlogSphere AI Additions: Podcast, Quiz, & Debate Tabs */}
      <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
          {[
            { id: 'podcast', label: '🎙️ AI Podcast Simulator' },
            { id: 'quiz', label: '🎓 Study Mode Quiz' },
            { id: 'debate', label: '💬 AI Expert Debate' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAITab(activeAITab === tab.id ? null : tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                activeAITab === tab.id
                  ? 'bg-indigo-650 text-white shadow-md'
                  : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeAITab === 'podcast' && (
            <m.div
              key="podcast"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {renderPodcastPlayer()}
            </m.div>
          )}

          {activeAITab === 'quiz' && (
            <m.div
              key="quiz"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {renderQuizContent()}
            </m.div>
          )}

          {activeAITab === 'debate' && (
            <m.div
              key="debate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {renderDebateContent()}
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Version history Comparison panel */}
      <AnimatePresence>
        {showVersions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <m.div
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
            </m.div>
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
