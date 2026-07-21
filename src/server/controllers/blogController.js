import Blog from '../models/Blog.js';
import BlogVersion from '../models/BlogVersion.js';
import User from '../models/User.js';
import DailyBrief from '../models/DailyBrief.js';
import Notification from '../models/Notification.js';
import Community from '../models/Community.js';
import Quiz from '../models/Quiz.js';
import Comment from '../models/Comment.js';
import { checkRestrictedContent } from './restrictedWordController.js';
import { recalculateReputation } from './userController.js';
import { recommendationEngine } from '../services/ai/recommendationEngine.js';

const sanitizeBlogObject = (blogDoc) => {
  if (!blogDoc) return null;
  const b = typeof blogDoc.toObject === 'function' ? blogDoc.toObject() : blogDoc;
  if (b.isAnonymous) {
    b.author = {
      _id: 'anonymous',
      name: 'Anonymous Writer',
      profileImage: 'https://api.dicebear.com/7.x/identicon/svg?seed=anonymous',
      bio: 'This author prefers to remain anonymous.',
      badge: 'Reader'
    };
  }
  return b;
};

// Helper to generate clean, concise, 100% unique slugs with random unique ID suffix
const generateUniqueSlug = async (title) => {
  let words = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // Limit base slug to first 5 key words (~40 chars max)
  let shortBase = words.slice(0, 5).join('-');
  if (!shortBase) shortBase = 'post';

  // 6-char random alphanumeric unique ID
  const uniqueId = Math.random().toString(36).substring(2, 8);
  let slug = `${shortBase}-${uniqueId}`;

  // Extra safety check in DB
  let count = 0;
  while (await Blog.findOne({ slug })) {
    count++;
    slug = `${shortBase}-${uniqueId}${count}`;
  }

  return slug;
};

// Free translation helper via google translate API
const translateText = async (text, targetLang) => {
  if (!text) return '';
  try {
    // Strip HTML for translation to avoid breaking tag syntax or tags translated
    // A simple regex strip
    const cleanText = text.replace(/<[^>]*>/g, ' ');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText.substring(0, 4000))}`;
    
    const res = await fetch(url);
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(x => x[0]).join('');
    }
    return `[Translated to ${targetLang}] ${text}`;
  } catch (error) {
    console.error('Translation error:', error);
    return `[Translation failed for ${targetLang}] ${text}`;
  }
};

// Heuristic NLP summary and key points helper
const summarizeContent = (htmlContent) => {
  let cleanText = htmlContent;
  try {
    const parsed = JSON.parse(htmlContent);
    if (Array.isArray(parsed)) {
      cleanText = parsed.map(b => b.content || '').join(' ');
    }
  } catch (e) {
    cleanText = htmlContent.replace(/<[^>]*>/g, ' ');
  }
  const text = cleanText.replace(/\s+/g, ' ').trim();
  let sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 1);
  if (sentences.length === 0 && text.length > 0) {
    sentences = [text];
  }
  
  // Create a 30-second summary (first 3 sentences)
  const summary = sentences.length > 0 ? (sentences.slice(0, 3).join('. ') + '.') : 'No content available to summarize.';
  
  // Extract 5 key points based on length / distinct sentences
  const keyPoints = [];
  const candidates = sentences.filter(s => s.toLowerCase().includes('important') || s.toLowerCase().includes('key') || s.toLowerCase().includes('need') || s.toLowerCase().includes('should') || s.toLowerCase().includes('study') || s.length > 40);
  
  const pool = candidates.length >= 5 ? candidates : sentences;
  for (let i = 0; i < Math.min(5, pool.length); i++) {
    keyPoints.push(pool[i]);
  }
  
  // Pad if we don't have 5
  while (keyPoints.length < 5 && sentences.length > keyPoints.length) {
    const nextSentence = sentences[keyPoints.length];
    if (nextSentence) keyPoints.push(nextSentence);
  }
  
  return { summary, keyPoints: keyPoints.slice(0, 5) };
};

// Real AI summary helper via Gemini API
const generateGeminiSummary = async (title, contentText) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `You are an AI assistant designed to summarize blog posts. Summarize the following blog post in a concise, engaging paragraph (maximum 3 sentences). Also, extract exactly 5 key bullet points highlighting the main takeaways.

Title: ${title}

Content:
${contentText}

You MUST return a JSON object with this exact structure:
{
  "summary": "Your paragraph summary here.",
  "keyPoints": [
    "Key takeaway point 1",
    "Key takeaway point 2",
    "Key takeaway point 3",
    "Key takeaway point 4",
    "Key takeaway point 5"
  ]
}

Only return the JSON object, do not include any markdown backticks or explanations.`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Invalid response structure from Gemini API');
  }

  let cleanText = rawText.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
  }
  const parsed = JSON.parse(cleanText);
  return {
    summary: parsed.summary,
    keyPoints: parsed.keyPoints || []
  };
};

export const createBlog = async (req, res) => {
  try {
    const { title, content, coverImage, category, tags, status, collaborators, community, isAnonymous, scheduledPublishTime } = req.body;

    // Server-Side Input Validations
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title is required and must be at least 3 characters long.' });
    }
    if (title.trim().length > 150) {
      return res.status(400).json({ error: 'Title cannot exceed 150 characters.' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Content is required.' });
    }
    let hasTextContent = false;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        hasTextContent = parsed.some(b => b.content && b.content.trim().length > 0);
      } else {
        hasTextContent = content.trim().length > 0;
      }
    } catch (e) {
      hasTextContent = content.trim().length > 0;
    }
    if (!hasTextContent) {
      return res.status(400).json({ error: 'Please add text content to your article blocks.' });
    }

    if (status && !['draft', 'published', 'scheduled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Allowed values: draft, published, scheduled.' });
    }

    // Normalize tags to be single-word lowercase alphanumeric values
    const normalizedTags = (tags || [])
      .map(t => String(t).trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);

    if (normalizedTags.length > 15) {
      return res.status(400).json({ error: 'Maximum 15 tags are allowed per article.' });
    }

    // Check restricted content
    let textToValidate = `${title || ''} ${category || ''} ${normalizedTags.join(' ')}`;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          textToValidate += ' ' + parsed.map(b => `${b.content || ''} ${b.caption || ''}`).join(' ');
        } else {
          textToValidate += ' ' + content;
        }
      } catch (e) {
        textToValidate += ' ' + content;
      }
    }

    const foundRestricted = await checkRestrictedContent(textToValidate);
    if (foundRestricted) {
      return res.status(400).json({ error: `Content contains restricted words: ${foundRestricted.join(', ')}` });
    }

    // Validate scheduled publish time
    let finalScheduledPublishTime = null;
    if (status === 'scheduled') {
      if (!scheduledPublishTime) {
        return res.status(400).json({ error: 'Scheduled publish time is required when status is scheduled.' });
      }
      const schedTime = new Date(scheduledPublishTime);
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (schedTime <= now) {
        return res.status(400).json({ error: 'Scheduled publish time must be in the future.' });
      }
      if (schedTime > oneWeekFromNow) {
        return res.status(400).json({ error: 'Scheduled publish time must be within 1 week from now.' });
      }
      finalScheduledPublishTime = schedTime;
    }

    // Generate unique concise slug with unique ID
    const slug = await generateUniqueSlug(title);

    // Convert reader to author if they create/draft a post
    if (req.user.role === 'reader') {
      await User.findByIdAndUpdate(req.user._id, { role: 'author' });
      req.user.role = 'author';
    }

    const blog = new Blog({
      title,
      slug,
      content,
      coverImage: coverImage || '',
      author: req.user._id,
      category: category || '',
      tags: normalizedTags,
      status: status || 'draft',
      collaborators: collaborators || [],
      community: community || null,
      isAnonymous: isAnonymous || false,
      scheduledPublishTime: finalScheduledPublishTime
    });

    await blog.save();

    // Notify any collaborators added
    if (collaborators && collaborators.length > 0) {
      for (const collId of collaborators) {
        const notif = new Notification({
          userId: collId,
          message: `${req.user.name} added you as a collaborator on "${title}"`,
          type: 'collab',
          referenceId: blog._id
        });
        await notif.save();
        if (global.io) {
          global.io.to(`user_${collId}`).emit('notification_received', notif);
        }
      }
    }

    if (status === 'published') {
      await notifySubscribers(blog, req.user);
      await recalculateReputation(blog.author);

      // Notify community members if published in a community
      if (blog.community) {
        const comm = await Community.findById(blog.community);
        if (comm) {
          for (const mId of comm.members) {
            if (mId.toString() !== req.user._id.toString()) {
              const notif = new Notification({
                userId: mId,
                message: `New post in "${comm.name}" by ${req.user.name}: "${blog.title}"`,
                type: 'community_post',
                referenceId: blog._id
              });
              await notif.save();
              if (global.io) {
                global.io.to(`user_${mId}`).emit('notification_received', notif);
              }
            }
          }
        }
      }
    }

    res.status(201).json({ message: 'Blog created successfully', blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBlogs = async (req, res) => {
  try {
    const { category, tag, author, search, status } = req.query;
    const query = {};

    if (category) query.category = category;
    if (tag) query.tags = tag;
    
    if (author) {
      query.author = author;
      // If someone else is querying this author's profile page, hide their anonymous posts!
      if (!req.user || req.user._id.toString() !== author.toString()) {
        query.isAnonymous = { $ne: true };
      }
    }
    
    // Filter by status if provided (and not 'all'). Default to 'published' if none provided
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = 'published';
    }

    if (search) {
      const matchingAuthors = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id');
      const authorIds = matchingAuthors.map(u => u._id);

      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { author: { $in: authorIds } }
      ];
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name profileImage bio')
      .populate('collaborators', 'name profileImage')
      .sort({ createdAt: -1 });

    const sanitizedBlogs = blogs.map(b => sanitizeBlogObject(b));
    res.status(200).json({ blogs: sanitizedBlogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    let blog;

    // Check if slug is a valid MongoDB ObjectId
    if (slug && /^[0-9a-fA-F]{24}$/.test(slug)) {
      blog = await Blog.findById(slug)
        .populate('author', 'name username profileImage bio followers reputationPoints badge newsletterSubscribers')
        .populate('collaborators', 'name username profileImage email');
    }

    // Fall back to slug lookup if not found or not an ObjectId
    if (!blog) {
      const decodedSlug = decodeURIComponent(slug);
      blog = await Blog.findOne({ $or: [{ slug: decodedSlug }, { slug }] })
        .populate('author', 'name username profileImage bio followers reputationPoints badge newsletterSubscribers')
        .populate('collaborators', 'name username profileImage email');
    }

    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.status(200).json({ blog: sanitizeBlogObject(blog) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, coverImage, category, tags, status, collaborators, community, isAnonymous, scheduledPublishTime } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Server-Side Input Validations
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3) {
        return res.status(400).json({ error: 'Title must be at least 3 characters long.' });
      }
      if (title.trim().length > 150) {
        return res.status(400).json({ error: 'Title cannot exceed 150 characters.' });
      }
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'Content cannot be empty.' });
      }
      let hasTextContent = false;
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          hasTextContent = parsed.some(b => b.content && b.content.trim().length > 0);
        } else {
          hasTextContent = content.trim().length > 0;
        }
      } catch (e) {
        hasTextContent = content.trim().length > 0;
      }
      if (!hasTextContent) {
        return res.status(400).json({ error: 'Please add text content to your article blocks.' });
      }
    }

    if (status !== undefined && !['draft', 'published', 'scheduled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Allowed values: draft, published, scheduled.' });
    }

    // Normalize tags to be single-word lowercase alphanumeric values if provided
    const normalizedTags = tags !== undefined
      ? tags.map(t => String(t).trim().toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean)
      : undefined;

    // Check restricted content
    let textToValidate = `${title !== undefined ? title : blog.title} ${category !== undefined ? category : blog.category} ${(normalizedTags !== undefined ? normalizedTags : blog.tags || []).join(' ')}`;
    const finalContent = content !== undefined ? content : blog.content;
    if (finalContent) {
      try {
        const parsed = JSON.parse(finalContent);
        if (Array.isArray(parsed)) {
          textToValidate += ' ' + parsed.map(b => `${b.content || ''} ${b.caption || ''}`).join(' ');
        } else {
          textToValidate += ' ' + finalContent;
        }
      } catch (e) {
        textToValidate += ' ' + finalContent;
      }
    }

    const foundRestricted = await checkRestrictedContent(textToValidate);
    if (foundRestricted) {
      return res.status(400).json({ error: `Content contains restricted words: ${foundRestricted.join(', ')}` });
    }

    // Validate scheduled publish time
    let finalScheduledPublishTime = blog.scheduledPublishTime;
    const finalStatus = status !== undefined ? status : blog.status;
    if (finalStatus === 'scheduled') {
      const timeToValidate = scheduledPublishTime !== undefined ? scheduledPublishTime : blog.scheduledPublishTime;
      if (!timeToValidate) {
        return res.status(400).json({ error: 'Scheduled publish time is required when status is scheduled.' });
      }
      const schedTime = new Date(timeToValidate);
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (schedTime <= now) {
        return res.status(400).json({ error: 'Scheduled publish time must be in the future.' });
      }
      if (schedTime > oneWeekFromNow) {
        return res.status(400).json({ error: 'Scheduled publish time must be within 1 week from now.' });
      }
      finalScheduledPublishTime = schedTime;
    } else if (finalStatus === 'published' || finalStatus === 'draft') {
      finalScheduledPublishTime = null;
    }

    const wasPublished = blog.status === 'published';

    // Check permissions: author or collaborator
    const isAuthor = blog.author.toString() === req.user._id.toString();
    const isCollaborator = blog.collaborators.some(
      (cId) => cId.toString() === req.user._id.toString()
    );

    if (!isAuthor && !isCollaborator && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to edit this blog.' });
    }

    // Version Control System
    const versionCount = await BlogVersion.countDocuments({ blogId: blog._id });
    const version = new BlogVersion({
      blogId: blog._id,
      title: blog.title,
      content: blog.content,
      versionNumber: versionCount + 1,
      editedBy: req.user._id
    });
    await version.save();

    // Update blog
    blog.title = title !== undefined ? title : blog.title;
    blog.content = content !== undefined ? content : blog.content;
    blog.coverImage = coverImage !== undefined ? coverImage : blog.coverImage;
    blog.category = category !== undefined ? category : blog.category;
    blog.tags = normalizedTags !== undefined ? normalizedTags : blog.tags;
    blog.status = status !== undefined ? status : blog.status;
    blog.scheduledPublishTime = finalScheduledPublishTime;
    blog.community = community !== undefined ? community : blog.community;
    blog.isAnonymous = isAnonymous !== undefined ? isAnonymous : blog.isAnonymous;
    if (isAuthor) {
      blog.collaborators = collaborators !== undefined ? collaborators : blog.collaborators;
    }
    blog.updatedAt = Date.now();

    await blog.save();

    // Calculate reputation if status changes or remains published
    if (blog.status === 'published' || wasPublished) {
      await recalculateReputation(blog.author);
    }

    // If transitioned to published, notify subscribers & community
    if (blog.status === 'published' && !wasPublished) {
      await notifySubscribers(blog, req.user);
      
      if (blog.community) {
        const comm = await Community.findById(blog.community);
        if (comm) {
          for (const mId of comm.members) {
            if (mId.toString() !== req.user._id.toString()) {
              const notif = new Notification({
                userId: mId,
                message: `New post in "${comm.name}" by ${req.user.name}: "${blog.title}"`,
                type: 'community_post',
                referenceId: blog._id
              });
              await notif.save();
              if (global.io) {
                global.io.to(`user_${mId}`).emit('notification_received', notif);
              }
            }
          }
        }
      }
    }

    // If content was modified and it is currently published, notify bookmarks
    if (blog.status === 'published' && wasPublished && (content !== undefined || title !== undefined)) {
      const bookmarkedUsers = await User.find({ savedBlogs: blog._id });
      for (const u of bookmarkedUsers) {
        const notif = new Notification({
          userId: u._id,
          message: `Bookmarked article "${blog.title}" has been updated`,
          type: 'bookmark_update',
          referenceId: blog._id
        });
        await notif.save();
        if (global.io) {
          global.io.to(`user_${u._id}`).emit('notification_received', notif);
        }
      }
    }

    res.status(200).json({ message: 'Blog updated successfully', blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Permissions: Author or Admin
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this blog.' });
    }

    const authorId = blog.author;
    await Blog.findByIdAndDelete(id);
    await BlogVersion.deleteMany({ blogId: id });

    // Recalculate author reputation since their article is deleted
    await recalculateReputation(authorId);

    res.status(200).json({ message: 'Blog and its history deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const likeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id).populate('author');
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const likeIndex = blog.likes.indexOf(req.user._id);
    let isLiked = false;

    if (likeIndex === -1) {
      blog.likes.push(req.user._id);
      isLiked = true;
      
      // Notify the author
      if (blog.author._id.toString() !== req.user._id.toString()) {
        const notif = new Notification({
          userId: blog.author._id,
          message: `${req.user.name} liked your blog "${blog.title}"`,
          type: 'like',
          referenceId: blog._id
        });
        await notif.save();
        if (global.io) {
          global.io.to(`user_${blog.author._id}`).emit('notification_received', notif);
        }
      }
    } else {
      blog.likes.splice(likeIndex, 1);
    }

    await blog.save();
    await recalculateReputation(blog.author._id);
    res.status(200).json({ message: isLiked ? 'Blog liked' : 'Blog unliked', likesCount: blog.likes.length, isLiked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Recommendation engine
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Retrieve personalized feed from the recommendation engine
    const { blogs: personalizedFeed } = await recommendationEngine.getPersonalizedFeed(userId, { limit: 10 });
    let recommended = personalizedFeed || [];

    // Ensure we exclude the user's own blogs and get at least 10 blogs
    if (recommended.length < 10) {
      const remainingCount = 10 - recommended.length;
      const idsToExclude = recommended.map(b => b._id);
      idsToExclude.push(userId); // Exclude the user's own id

      const generalBlogs = await Blog.find({
        status: 'published',
        _id: { $nin: idsToExclude },
        author: { $ne: userId }
      })
      .populate('author', 'name username profileImage isVerified badge')
      .populate('community', 'name slug avatar')
      .sort({ views: -1, likes: -1 })
      .limit(remainingCount);

      recommended = recommended.concat(generalBlogs);
    }

    // Populate collaborators for all recommendations
    const populated = await Blog.populate(recommended, [
      { path: 'collaborators', select: 'name profileImage' }
    ]);

    const sanitizedRecommended = populated.map(b => sanitizeBlogObject(b));
    res.status(200).json({ blogs: sanitizedRecommended });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// AI summary generation endpoint
export const generateSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Prepare plain text content for AI model
    let cleanText = blog.content;
    try {
      const parsed = JSON.parse(blog.content);
      if (Array.isArray(parsed)) {
        cleanText = parsed.map(b => b.content || '').join(' ');
      }
    } catch (e) {
      cleanText = blog.content.replace(/<[^>]*>/g, ' ');
    }
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    let summaryData;
    if (process.env.GEMINI_API_KEY) {
      try {
        summaryData = await generateGeminiSummary(blog.title, cleanText);
      } catch (err) {
        console.error('Gemini AI summary failed, falling back to heuristics:', err.message);
        summaryData = summarizeContent(blog.content);
      }
    } else {
      summaryData = summarizeContent(blog.content);
    }

    blog.summary = summaryData.summary;
    blog.keyPoints = summaryData.keyPoints;
    await blog.save();

    res.status(200).json({ message: 'Summary generated', summary: blog.summary, keyPoints: blog.keyPoints });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Translate blog text
export const translateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.body; // 'hi' or 'gu'
    
    if (!['hi', 'gu', 'en'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid language specified. Supports: hi, gu, en' });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // If English, return main content
    if (lang === 'en') {
      return res.status(200).json({ title: blog.title, content: blog.content });
    }

    // Check if translation is already cached
    const existingTranslation = blog.translations.find(t => t.language === lang);
    if (existingTranslation) {
      return res.status(200).json({
        title: existingTranslation.title,
        content: existingTranslation.content
      });
    }

    // Translate title and content
    const translatedTitle = await translateText(blog.title, lang);
    
    let translatedContent = '';
    try {
      const blocks = JSON.parse(blog.content);
      if (Array.isArray(blocks)) {
        const translatedBlocks = [];
        for (const block of blocks) {
          const newBlock = { ...block };
          if (block.content) {
            newBlock.content = await translateText(block.content, lang);
          }
          if (block.caption) {
            newBlock.caption = await translateText(block.caption, lang);
          }
          translatedBlocks.push(newBlock);
        }
        translatedContent = JSON.stringify(translatedBlocks);
      } else {
        translatedContent = await translateText(blog.content, lang);
      }
    } catch (e) {
      translatedContent = await translateText(blog.content, lang);
    }

    // Cache translation
    blog.translations.push({
      language: lang,
      title: translatedTitle,
      content: translatedContent
    });
    await blog.save();

    res.status(200).json({ title: translatedTitle, content: translatedContent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch Version History
export const getBlogVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const versions = await BlogVersion.find({ blogId: id })
      .populate('editedBy', 'name profileImage')
      .sort({ versionNumber: -1 });

    res.status(200).json({ versions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Restore a past version
export const restoreVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    // Check permission
    const isAuthor = blog.author.toString() === req.user._id.toString();
    const isCollaborator = blog.collaborators.some(cId => cId.toString() === req.user._id.toString());
    if (!isAuthor && !isCollaborator && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to restore version.' });
    }

    const versionToRestore = await BlogVersion.findById(versionId);
    if (!versionToRestore) {
      return res.status(404).json({ error: 'Version not found.' });
    }

    // Before restoring, save current state as a new version
    const versionCount = await BlogVersion.countDocuments({ blogId: blog._id });
    const backupVersion = new BlogVersion({
      blogId: blog._id,
      title: blog.title,
      content: blog.content,
      versionNumber: versionCount + 1,
      editedBy: req.user._id
    });
    await backupVersion.save();

    // Perform restoration
    blog.title = versionToRestore.title;
    blog.content = versionToRestore.content;
    blog.updatedAt = Date.now();
    await blog.save();

    res.status(200).json({ message: 'Version restored successfully', blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper to notify subscribers of new articles
const notifySubscribers = async (blog, authorUser) => {
  try {
    const author = await User.findById(authorUser._id).populate('newsletterSubscribers');
    const subscribers = author?.newsletterSubscribers || [];
    const categorySubscribers = await User.find({ subscribedCategories: blog.category });

    const combinedIds = new Set();
    subscribers.forEach(sub => combinedIds.add(sub._id.toString()));
    categorySubscribers.forEach(sub => combinedIds.add(sub._id.toString()));
    
    combinedIds.delete(authorUser._id.toString());

    for (const userId of combinedIds) {
      const notif = new Notification({
        userId,
        message: `New article published by ${authorUser.name} under ${blog.category || 'general'}: "${blog.title}"`,
        type: 'newsletter',
        referenceId: blog._id
      });
      await notif.save();
      if (global.io) {
        global.io.to(`user_${userId}`).emit('notification_received', notif);
      }
    }
  } catch (err) {
    console.error('Error notifying subscribers:', err);
  }
};

// React to blog post
export const reactToBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;
    const reactionTypes = ['thumbsUp', 'heart', 'clap', 'laugh'];
    
    if (!reactionTypes.includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type.' });
    }

    const blog = await Blog.findById(id).populate('author');
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (!blog.reactions) {
      blog.reactions = { thumbsUp: [], heart: [], clap: [], laugh: [] };
    }

    const authorId = blog.author?._id || blog.author;

    // Find if the user already has a reaction of any type on this blog
    let existingReactionType = null;
    for (const type of reactionTypes) {
      if (blog.reactions[type] && blog.reactions[type].some(uid => uid.toString() === req.user._id.toString())) {
        existingReactionType = type;
        break;
      }
    }

    let isReacted = false;

    if (existingReactionType) {
      // Remove their user ID from the existing reaction array
      const existingArray = blog.reactions[existingReactionType];
      const index = existingArray.findIndex(uid => uid.toString() === req.user._id.toString());
      if (index !== -1) {
        existingArray.splice(index, 1);
      }

      // If the clicked reaction is DIFFERENT from their current one, add the new one
      if (existingReactionType !== reactionType) {
        blog.reactions[reactionType].push(req.user._id);
        isReacted = true;

        // Notify author if author exists
        if (authorId && authorId.toString() !== req.user._id.toString()) {
          const notif = new Notification({
            userId: authorId,
            message: `${req.user.name} reacted with ${reactionType} on your blog "${blog.title}"`,
            type: 'reaction',
            referenceId: blog._id
          });
          await notif.save();
          if (global.io) {
            global.io.to(`user_${authorId}`).emit('notification_received', notif);
          }
        }
      }
    } else {
      // User had no reaction, just add the new one
      blog.reactions[reactionType].push(req.user._id);
      isReacted = true;

      // Notify author if author exists
      if (authorId && authorId.toString() !== req.user._id.toString()) {
        const notif = new Notification({
          userId: authorId,
          message: `${req.user.name} reacted with ${reactionType} on your blog "${blog.title}"`,
          type: 'reaction',
          referenceId: blog._id
        });
        await notif.save();
        if (global.io) {
          global.io.to(`user_${authorId}`).emit('notification_received', notif);
        }
      }
    }

    // Save and mark reactions as modified
    blog.markModified('reactions');
    await blog.save();
    if (authorId) {
      await recalculateReputation(authorId);
    }

    res.status(200).json({
      message: isReacted ? 'Reaction added' : 'Reaction removed',
      reactions: blog.reactions,
      isReacted
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper for Gemini block-by-block translation
const translateTextWithGemini = async (text, targetLang) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text) return text;
  try {
    const langName = targetLang === 'hi' ? 'Hindi' : targetLang === 'gu' ? 'Gujarati' : 'English';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert translator. Translate the following text into ${langName}. Preserve formatting and any markdown inline styles (like bold **text**). Do not output explanation or meta commentary, return only the translated text.\n\nText: ${text}`
          }]
        }]
      })
    });
    if (!response.ok) return translateText(text, targetLang);
    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    return rawText ? rawText.trim() : translateText(text, targetLang);
  } catch (e) {
    return translateText(text, targetLang);
  }
};

// AI Translate blog blocks for the editor
export const aiTranslateBlogBlocks = async (req, res) => {
  try {
    const { id } = req.params;
    const { lang } = req.body;
    
    if (!['hi', 'gu'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid language. Only Hindi (hi) and Gujarati (gu) supported.' });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const translatedTitle = await translateTextWithGemini(blog.title, lang);
    let translatedContent = '';
    
    try {
      const blocks = JSON.parse(blog.content);
      if (Array.isArray(blocks)) {
        const translatedBlocks = [];
        for (const block of blocks) {
          const newBlock = { ...block };
          if (block.content) {
            newBlock.content = await translateTextWithGemini(block.content, lang);
          }
          if (block.caption) {
            newBlock.caption = await translateTextWithGemini(block.caption, lang);
          }
          translatedBlocks.push(newBlock);
        }
        translatedContent = JSON.stringify(translatedBlocks);
      } else {
        translatedContent = await translateTextWithGemini(blog.content, lang);
      }
    } catch (e) {
      translatedContent = await translateTextWithGemini(blog.content, lang);
    }

    // Update translations array in blog
    blog.translations = blog.translations.filter(t => t.language !== lang);
    blog.translations.push({
      language: lang,
      title: translatedTitle,
      content: translatedContent
    });
    await blog.save();

    res.status(200).json({
      message: 'Blog successfully translated using Gemini AI',
      title: translatedTitle,
      content: translatedContent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const suggestMetadata = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required to analyze for suggestions.' });
    }
    
    let cleanText = content;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        cleanText = parsed.map(b => b.content || '').join(' ');
      }
    } catch (e) {
      cleanText = content.replace(/<[^>]*>/g, ' ');
    }
    cleanText = cleanText.substring(0, 5000); // limit payload size

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an AI blog assistant. Analyze the following blog draft details and suggest:
                1. A catchy, SEO-friendly title optimized for engagement.
                2. Exactly 3 to 5 relevant tags.
                3. The single best category selection from this list: Technology, Travel, Food, Education, Sports.

                Title Draft: ${title || ''}
                Content Draft:
                ${cleanText}

                You MUST return a JSON object with this exact structure:
                {
                  "title": "Your suggested title here",
                  "tags": ["tag1", "tag2", "tag3"],
                  "category": "Technology"
                }
                Only return the raw JSON object, no markdown wrappers.`
              }]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            let cleanText = rawText.trim();
            if (cleanText.startsWith('```')) {
              cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }
            const parsed = JSON.parse(cleanText);
            return res.status(200).json(parsed);
          }
        }
      } catch (apiError) {
        console.error('Gemini metadata suggest failed, falling back:', apiError.message);
      }
    }

    // Heuristic fallback if Gemini failed or is not available
    const words = cleanText.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    const uniqueWords = [...new Set(words)];
    const suggestedTags = uniqueWords.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1));
    
    res.status(200).json({
      title: title ? `Optimized: ${title}` : 'Exploring Modern Concepts',
      tags: suggestedTags.length > 0 ? suggestedTags : ['BlogSphere', 'Creative'],
      category: 'Technology'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerTrendingAutoPost = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    const { generateTrendingAutoPost } = await import('../services/trendingPoster.js');
    // force=true bypasses the 6-hour guard — admin manual triggers always post
    const newBlog = await generateTrendingAutoPost(true);
    if (!newBlog) {
      return res.status(200).json({ message: 'No new post needed (guard active)', blog: null });
    }
    res.status(201).json({
      message: 'AI Trending Blog Auto-Posted successfully',
      blog: newBlog
    });
  } catch (error) {
    console.error('triggerTrendingAutoPost error:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger automated trending post.' });
  }
};

// Smart Trending Algorithm (Gravity Decay)
export const getTrendingBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' })
      .populate('author', 'name profileImage badge')
      .populate('collaborators', 'name profileImage');

    const trendingList = [];

    for (const blog of blogs) {
      // Calculate comments count
      const commentsCount = await Comment.countDocuments({ blogId: blog._id });
      const likesCount = blog.likes?.length || 0;
      const views = blog.views || 0;
      
      let reactionsCount = 0;
      if (blog.reactions) {
        reactionsCount += (blog.reactions.thumbsUp?.length || 0);
        reactionsCount += (blog.reactions.heart?.length || 0);
        reactionsCount += (blog.reactions.clap?.length || 0);
        reactionsCount += (blog.reactions.laugh?.length || 0);
      }

      // Base engagement score
      const baseScore = (likesCount * 10) + (commentsCount * 5) + (views * 1) + (reactionsCount * 5);

      // Time decay gravity formula
      const hoursSinceCreated = (Date.now() - new Date(blog.createdAt).getTime()) / (1000 * 60 * 60);
      const trendingScore = baseScore / Math.pow(hoursSinceCreated + 2, 1.5);

      trendingList.push({
        blog,
        trendingScore
      });
    }

    // Sort by trending score descending
    trendingList.sort((a, b) => b.trendingScore - a.trendingScore);

    const sortedBlogs = trendingList.map(item => sanitizeBlogObject(item.blog));

    res.status(200).json({ blogs: sortedBlogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get reported blogs for admin moderation
export const getFlaggedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ 'reports.0': { $exists: true } })
      .populate('author', 'name profileImage email')
      .populate('reports.userId', 'name profileImage email')
      .sort({ updatedAt: -1 });

    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Track and update blog reading analytics (views, duration, bounces, completions)
export const updateBlogAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { duration, completed } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (duration !== undefined && typeof duration === 'number') {
      blog.totalReadTime += duration;
      if (duration < 10) {
        blog.bounces += 1;
      }
    }

    if (completed) {
      blog.completions += 1;
    }

    await blog.save();
    res.status(200).json({ message: 'Analytics recorded', blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Report / Flag blog post
export const reportBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Check if user already reported it
    const alreadyReported = blog.reports.some(r => r.userId.toString() === userId.toString());
    if (alreadyReported) {
      return res.status(400).json({ error: 'You have already reported this blog post.' });
    }

    blog.reports.push({
      userId,
      reason: reason || 'Inappropriate content or Spam',
      createdAt: Date.now()
    });

    await blog.save();

    // If excessive reports (>= 3), notify admin if socket server is active
    if (blog.reports.length >= 3 && global.io) {
      // Find admin users and push notification
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        const notif = new Notification({
          userId: admin._id,
          message: `⚠️ High alert: The post "${blog.title}" has been flagged by multiple readers!`,
          type: 'moderation_alert',
          referenceId: blog._id
        });
        await notif.save();
        global.io.to(`user_${admin._id}`).emit('notification_received', notif);
      }
    }

    res.status(200).json({ message: 'Post reported successfully. Our moderation team will review it.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Dismiss all report flags for a blog post
export const dismissReports = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    blog.reports = [];
    await blog.save();

    res.status(200).json({ message: 'All reports successfully cleared.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Smart Spam Detection checker
export const checkSpam = async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Draft content is required to run spam scan.' });
    }

    let spamScore = 0;
    const reasons = [];

    // 1. Duplicate check (title similarity)
    if (title && title.trim()) {
      const duplicate = await Blog.findOne({
        title: { $regex: `^${title.trim()}$`, $options: 'i' },
        status: 'published'
      });
      if (duplicate) {
        spamScore += 40;
        reasons.push('Title is identical to an already published article.');
      }
    }

    // Clean html block contents to plain text
    let cleanText = content;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        cleanText = parsed.map(b => b.content || '').join(' ');
      }
    } catch (e) {
      cleanText = content.replace(/<[^>]*>/g, ' ');
    }
    
    const textLower = cleanText.toLowerCase();

    // 2. Suspicious advertising/spam keywords check
    const spamKeywords = [
      'free-gift', 'lottery', 'viagra', 'casino', 'double-crypto', 'win-money', 
      'giveaway', 'make-money-fast', 'investment-opportunity', 'guaranteed-return',
      'work-from-home-scam', 'cheap-loans'
    ];
    
    const foundKeywords = spamKeywords.filter(kw => textLower.includes(kw));
    if (foundKeywords.length > 0) {
      spamScore += Math.min(40, foundKeywords.length * 15);
      reasons.push(`Contains spam/marketing trigger words: ${foundKeywords.join(', ')}.`);
    }

    // 3. Repeated Content check
    const sentences = cleanText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
    const sentenceCounts = {};
    let duplicatesCount = 0;
    sentences.forEach(s => {
      sentenceCounts[s] = (sentenceCounts[s] || 0) + 1;
      if (sentenceCounts[s] > 1) {
        duplicatesCount++;
      }
    });

    if (duplicatesCount >= 3) {
      spamScore += 25;
      reasons.push('Contains multiple repeated sentences/paragraphs (potential copy-paste spam).');
    }

    // 4. Keyword Stuffing check
    const words = textLower.split(/\W+/).filter(w => w.length > 4);
    const wordCounts = {};
    let stuffingDetected = false;
    words.forEach(w => {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    });

    Object.keys(wordCounts).forEach(w => {
      const density = wordCounts[w] / words.length;
      // If a word of length > 4 is repeated 8+ times and takes up > 8% of the draft content
      if (wordCounts[w] >= 8 && density > 0.08) {
        stuffingDetected = true;
      }
    });

    if (stuffingDetected) {
      spamScore += 20;
      reasons.push('Keyword stuffing detected (certain words appear too frequently).');
    }

    // Cap at 100
    spamScore = Math.min(100, spamScore);

    res.status(200).json({
      spamScore,
      isSpam: spamScore > 50,
      reasons
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET Daily Analytics grouped by date
export const getDailyAnalytics = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' }).select('title category tags createdAt slug');
    const groups = {};

    blogs.forEach(blog => {
      const dateStr = new Date(blog.createdAt).toISOString().slice(0, 10);
      if (!groups[dateStr]) {
        groups[dateStr] = {
          date: dateStr,
          blogsCount: 0,
          blogs: []
        };
      }
      groups[dateStr].blogsCount += 1;
      groups[dateStr].blogs.push({
        title: blog.title,
        category: blog.category || 'General',
        tags: blog.tags || [],
        slug: blog.slug
      });
    });

    const dates = Object.keys(groups);
    const briefs = await DailyBrief.find({ date: { $in: dates } });
    const briefsMap = {};
    briefs.forEach(b => {
      briefsMap[b.date] = b;
    });

    const report = dates.map(date => {
      const group = groups[date];
      const brief = briefsMap[date];
      return {
        date: date,
        blogsCount: group.blogsCount,
        blogs: group.blogs,
        hasBrief: !!brief,
        summary: brief ? brief.summary : '',
        keyThemes: brief ? brief.keyThemes : []
      };
    }).sort((a, b) => b.date.localeCompare(a.date));

    res.status(200).json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST Generate AI daily summary brief
export const generateDailyBrief = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Date (YYYY-MM-DD) is required.' });
    }

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const blogs = await Blog.find({
      status: 'published',
      createdAt: { $gte: start, $lte: end }
    }).select('title category content tags');

    if (blogs.length === 0) {
      return res.status(400).json({ error: 'No published blogs found on this date to summarize.' });
    }

    const blogDescriptions = blogs.map((b, i) => {
      let text = '';
      try {
        const parsed = JSON.parse(b.content);
        if (Array.isArray(parsed)) {
          text = parsed.map(block => block.content || '').join(' ').substring(0, 300);
        } else {
          text = b.content.replace(/<[^>]*>/g, ' ').substring(0, 300);
        }
      } catch (e) {
        text = b.content.replace(/<[^>]*>/g, ' ').substring(0, 300);
      }
      return `Blog #${i+1}:\nTitle: ${b.title}\nCategory: ${b.category || 'General'}\nTags: ${(b.tags || []).join(', ')}\nPreview: ${text}`;
    }).join('\n\n');

    const prompt = `You are a professional Community Insights Director analyzing the blog posts published on our platform today (${date}). 
Provide an insightful, engaging, and professional executive daily briefing detailing what themes, topics, and discussions occupied our community today based on the posts listed below.

Posts published today:
${blogDescriptions}

You MUST return a JSON object with this exact structure:
{
  "summary": "Provide a comprehensive, engaging executive summary (about 5-8 sentences, 120-180 words) analyzing the collective community output today. Touch on the general tone, key insights shared, and how these posts enrich our community knowledge.",
  "keyThemes": [
    "Theme Title 1: A detailed 2-3 sentence analysis of what was discussed, referencing specific points or titles from today's posts.",
    "Theme Title 2: A detailed 2-3 sentence analysis...",
    "Theme Title 3: A detailed 2-3 sentence analysis..."
  ]
}

Only return the raw JSON object. Do not wrap it in markdown block quotes (such as \`\`\`json). Provide clean, parseable JSON.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const mockSummary = `Today's blogs highlighted key insights in community writing. Contributors shared articles exploring various themes including ${blogs.map(b => b.category).filter(Boolean).slice(0, 3).join(', ') || 'personal logs'}.`;
      const mockThemes = [
        'Community collaboration and writing logs',
        'Creative blogging setups',
        'Daily summaries and updates',
        'Interactive visual feedback',
        'Content management systems'
      ];
      
      let brief = await DailyBrief.findOne({ date });
      if (!brief) {
        brief = new DailyBrief({
          date,
          blogsCount: blogs.length,
          summary: mockSummary,
          keyThemes: mockThemes
        });
      } else {
        brief.blogsCount = blogs.length;
        brief.summary = mockSummary;
        brief.keyThemes = mockThemes;
      }
      await brief.save();
      return res.status(200).json({ brief });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      throw new Error('Gemini API call failed');
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Invalid response structure from Gemini API');

    let cleanText = rawText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanText);
    const summary = parsed.summary || 'Summary generated.';
    const keyThemes = parsed.keyThemes || [];

    let brief = await DailyBrief.findOne({ date });
    if (!brief) {
      brief = new DailyBrief({
        date,
        blogsCount: blogs.length,
        summary,
        keyThemes
      });
    } else {
      brief.blogsCount = blogs.length;
      brief.summary = summary;
      brief.keyThemes = keyThemes;
    }

    await brief.save();
    res.status(200).json({ brief });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Grammar & Spelling Check - finds errors but doesn't add new words
export const grammarCheck = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required for grammar check.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are a professional proofreader. Analyze the following text for grammar, spelling, and punctuation errors ONLY.

Text to analyze:
"""
${content}
"""

Rules:
1. ONLY identify actual errors (spelling mistakes like "teh"->"the", grammar errors like "he go"->"he goes", punctuation errors)
2. DO NOT suggest style improvements, rewording, or better vocabulary
3. DO NOT add new words or change meaning
4. Return ONLY a JSON object with this exact structure:
{
  "errors": [
    {"type": "spelling|grammar|punctuation", "original": "incorrect word/phrase", "suggestion": "correct word/phrase", "context": "surrounding text snippet"}
  ],
  "suggestions": ["optional general suggestion like 'Consider proofreading for common typos'"]
}

Only return the raw JSON object, no markdown, no explanations.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (rawText) {
            let cleanText = rawText;
            if (cleanText.startsWith('```')) {
              cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }
            const parsed = JSON.parse(cleanText);
            return res.status(200).json({ 
              errors: parsed.errors || [], 
              suggestions: parsed.suggestions || [] 
            });
          }
        }
      } catch (err) {
        console.error('Grammar check Gemini call failed, returning clean result:', err.message);
      }
    }

    res.status(200).json({ 
      errors: [], 
      suggestions: ['No grammar or spelling errors found. Your text looks good!'] 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const aiRewrite = async (req, res) => {
  try {
    const { content, instruction } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required for rewrite.' });
    }
    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ error: 'Instruction is required for rewrite.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `You are an English writing assistant. The user has provided a draft/notes (USER'S TEXT) and an explanation of what they want to express (USER'S INSTRUCTION). Your task is to rewrite the text in proper, grammatically correct English.

USER'S TEXT:
"""
${content}
"""

USER'S INSTRUCTION (what they want to express):
"""
${instruction}
"""

CRITICAL RULES:
1. Rewrite the user's text in proper, grammatically correct English based on what they want to express.
2. Correct all syntax errors, sentence structures, and spelling mistakes (e.g. correcting "thgis" to "this", "sysntext" to "syntax").
3. DO NOT add any new concepts, facts, or outside information not present in the user's text or user's instruction. Keep the content strictly limited to what the user has provided or explained.
4. Do not invent or add new ideas. Only express the user's thoughts and instructions in proper English.
5. Return ONLY the rewritten text, no explanations, no markdown.

Rewritten text:`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (response.ok) {
          const result = await response.json();
          const rewrittenText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (rewrittenText) {
            return res.status(200).json({ rewrittenContent: rewrittenText });
          }
        }
      } catch (err) {
        console.error('AI Rewrite Gemini call failed, returning original text:', err.message);
      }
    }

    res.status(200).json({ rewrittenContent: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const checkAndPublishScheduledBlogs = async () => {
  try {
    const now = new Date();
    // Find blogs with status 'scheduled' and scheduledPublishTime <= now
    const scheduledBlogs = await Blog.find({
      status: 'scheduled',
      scheduledPublishTime: { $lte: now }
    });

    if (scheduledBlogs.length === 0) return;

    console.log(`[Scheduler] Found ${scheduledBlogs.length} scheduled blogs to publish.`);

    for (const blog of scheduledBlogs) {
      blog.status = 'published';
      blog.createdAt = now; // Update published time to now
      blog.updatedAt = now;
      await blog.save();

      // Recalculate author reputation
      await recalculateReputation(blog.author);

      // Notify subscribers and community
      const authorUser = await User.findById(blog.author);
      if (authorUser) {
        await notifySubscribers(blog, authorUser);

        // Notify community members if published in a community
        if (blog.community) {
          const comm = await Community.findById(blog.community);
          if (comm) {
            for (const mId of comm.members) {
              if (mId.toString() !== authorUser._id.toString()) {
                const notif = new Notification({
                  userId: mId,
                  message: `New post in "${comm.name}" by ${authorUser.name}: "${blog.title}"`,
                  type: 'community_post',
                  referenceId: blog._id
                });
                await notif.save();
                if (global.io) {
                  global.io.to(`user_${mId}`).emit('notification_received', notif);
                }
              }
            }
          }
        }
      }

      console.log(`[Scheduler] Blog "${blog.title}" has been successfully published.`);
    }
  } catch (error) {
    console.error('[Scheduler] Error checking and publishing scheduled blogs:', error.message);
  }
};

// Heuristic fallbacks for AI Features when GEMINI_API_KEY is not available
const generateFallbackPodcastScript = (blog) => {
  let cleanText = blog.content || '';
  try {
    const parsed = JSON.parse(blog.content);
    if (Array.isArray(parsed)) {
      cleanText = parsed.map(b => b.content || '').join(' ');
    }
  } catch (e) {
    cleanText = cleanText.replace(/<[^>]*>/g, ' ');
  }
  const text = cleanText.replace(/\s+/g, ' ').trim();
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);

  const s1 = sentences[0] || `Understanding the core ideas behind ${blog.title}.`;
  const s2 = sentences[1] || `Key implementation insights and real-world considerations.`;
  const s3 = sentences[2] || `Best practices for getting the best outcomes.`;
  const s4 = sentences[3] || `A solid step forward for modern developers and creators.`;

  return [
    { speaker: 'Alex', text: `Welcome to today's AI Audio Briefing! Today we're exploring "${blog.title}".` },
    { speaker: 'Jordan', text: `Thanks Alex! This topic has been generating a lot of interest. ${s1}` },
    { speaker: 'Alex', text: `That's a great starting point. What are the key takeaways readers should keep in mind?` },
    { speaker: 'Jordan', text: `${s2}` },
    { speaker: 'Alex', text: `How does this approach improve day-to-day workflow or system performance?` },
    { speaker: 'Jordan', text: `${s3}` },
    { speaker: 'Alex', text: `Fascinating perspective! Any final recommendations for our listeners?` },
    { speaker: 'Jordan', text: `${s4} Definitely worth diving deeper into the full article.` }
  ];
};

const generateFallbackQuizQuestions = (blog) => {
  const title = blog.title || 'this article';
  return [
    {
      question: `What is the primary focus of "${title}"?`,
      options: [
        `Key architectural insights and concepts of ${title}`,
        `Legacy database migration guidelines`,
        `Basic operating system installations`,
        `Unrelated hardware configurations`
      ],
      correctAnswerIndex: 0
    },
    {
      question: `Why is understanding ${title} valuable for creators and developers?`,
      options: [
        `It replaces all programming languages`,
        `It offers practical solutions and best practice patterns`,
        `It is strictly required by web browsers`,
        `It has no practical application`
      ],
      correctAnswerIndex: 1
    },
    {
      question: `What is the core takeaway highlighted in this write-up?`,
      options: [
        `Avoiding testing completely`,
        `Ignoring user feedback`,
        `Iterative implementation and continuous improvement`,
        `Hardcoding static values everywhere`
      ],
      correctAnswerIndex: 2
    }
  ];
};

const generateFallbackDebate = (blog) => {
  const title = blog.title || 'this topic';
  return [
    {
      persona: 'Skeptic Sam',
      avatarSeed: 'sam',
      message: `I read "${title}" with interest, but I'm skeptical about how well this scales in high-concurrency production environments without added latency.`
    },
    {
      persona: 'Optimistic Ollie',
      avatarSeed: 'ollie',
      message: `I see your point Sam, but the core architecture here is exceptionally clean and drastically reduces developer boilerplate.`
    },
    {
      persona: 'Pragmatic Pam',
      avatarSeed: 'pam',
      message: `From a practical engineering standpoint, the middle ground works best: adopt these patterns where productivity gains outweigh edge-case overhead.`
    },
    {
      persona: 'Skeptic Sam',
      avatarSeed: 'sam',
      message: `Fair enough Pam, as long as team leads carefully measure performance metrics before rolling it out across core microservices.`
    },
    {
      persona: 'Optimistic Ollie',
      avatarSeed: 'ollie',
      message: `Agreed! The clarity of thought in this write-up makes it a great foundation for teams aiming to modernize.`
    },
    {
      persona: 'Pragmatic Pam',
      avatarSeed: 'pam',
      message: `Spot on. Iterative adoption with solid monitoring will give teams the best of both worlds.`
    }
  ];
};

export const getAIDebate = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        let plainText = blog.content;
        try {
          const parsed = JSON.parse(blog.content);
          if (Array.isArray(parsed)) {
            plainText = parsed.map(b => b.content || '').join(' ');
          }
        } catch (e) {}

        const prompt = `You are a group of software engineering and industry experts participating in a constructive debate about the following blog post.
Analyze the article's core arguments, implementation choices, and assumptions.
Generate a simulated 3-way debate between three distinct personas:
1. "Skeptic Sam" (The Critic): A developer who points out code quality, architectural assumptions, scaling problems, or trade-offs.
2. "Pragmatic Pam" (The Engineer): A developer focused on real-world delivery, simplicity, and practical maintenance.
3. "Optimistic Ollie" (The Advocate): A developer who loves clean concepts, new ideas, and structural elegance.

The debate must flow naturally as a chat thread with exactly 6 messages (2 from each persona, replying to one another).

Blog Title: ${blog.title}
Blog Content:
${plainText}

You MUST return a JSON array containing exactly 6 messages with this structure:
[
  {
    "persona": "Skeptic Sam",
    "avatarSeed": "sam",
    "message": "First comment analyzing a key assumption..."
  },
  {
    "persona": "Optimistic Ollie",
    "avatarSeed": "ollie",
    "message": "Countering the critique and highlighting the benefit..."
  }
]

Return only the raw JSON array. Do not include any markdown blocks or formatting.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (rawText) {
            let clean = rawText;
            if (clean.startsWith('```')) {
              clean = clean.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }
            const debate = JSON.parse(clean);
            return res.status(200).json({ debate });
          }
        }
      } catch (err) {
        console.error('Gemini debate generation failed, using fallback:', err.message);
      }
    }

    const debate = generateFallbackDebate(blog);
    res.status(200).json({ debate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBlogQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    
    let quiz = await Quiz.findOne({ blogId: id });
    if (quiz) {
      const clientQuestions = quiz.questions.map(q => ({
        question: q.question,
        options: q.options
      }));
      return res.status(200).json({ quizId: quiz._id, questions: clientQuestions });
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found.' });
    }

    let parsedQuestions = null;
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        let plainText = blog.content;
        try {
          const parsed = JSON.parse(blog.content);
          if (Array.isArray(parsed)) {
            plainText = parsed.map(b => b.content || '').join(' ');
          }
        } catch (e) {}

        const prompt = `You are an expert tutor creating a study quiz for a reader of the following blog post.
Generate exactly 3 multiple-choice questions to test the reader's understanding of the concepts in the blog.
Each question must have exactly 4 choices, with only 1 correct choice.

Blog Title: ${blog.title}
Blog Content:
${plainText}

You MUST return a JSON array containing exactly 3 question objects with this structure:
[
  {
    "question": "A clear, specific question testing key information.",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswerIndex": 1
  }
]

Return only the raw JSON array. Do not include any markdown blocks or formatting.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (rawText) {
            let clean = rawText;
            if (clean.startsWith('```')) {
              clean = clean.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }
            parsedQuestions = JSON.parse(clean);
          }
        }
      } catch (err) {
        console.error('Gemini quiz generation failed, using fallback:', err.message);
      }
    }

    if (!parsedQuestions || !Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      parsedQuestions = generateFallbackQuizQuestions(blog);
    }
    
    quiz = new Quiz({
      blogId: id,
      questions: parsedQuestions
    });
    await quiz.save();

    const clientQuestions = quiz.questions.map(q => ({
      question: q.question,
      options: q.options
    }));

    res.status(200).json({ quizId: quiz._id, questions: clientQuestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const submitBlogQuiz = async (req, res) => {
  try {
    const { id } = req.params; // quiz ID
    const { answers } = req.body; // user answers [0, 1, 2]

    if (!answers || !Array.isArray(answers) || answers.length !== 3) {
      return res.status(400).json({ error: 'Exactly 3 answers are required.' });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    let correctCount = 0;
    const details = quiz.questions.map((q, idx) => {
      const userAns = answers[idx];
      const isCorrect = userAns === q.correctAnswerIndex;
      if (isCorrect) correctCount++;
      return {
        question: q.question,
        userAnswerIndex: userAns,
        correctAnswerIndex: q.correctAnswerIndex,
        isCorrect
      };
    });

    const passed = correctCount === 3;
    let reputationEarned = 0;

    if (passed && req.user) {
      reputationEarned = 15;
      const user = await User.findById(req.user._id);
      if (user) {
        user.reputationPoints = (user.reputationPoints || 0) + reputationEarned;
        if (user.reputationPoints >= 100) {
          user.badge = 'Senior Scholar';
        } else if (user.reputationPoints >= 50) {
          user.badge = 'Active Learner';
        } else if (user.reputationPoints >= 15) {
          user.badge = 'Junior Scholar';
        }
        await user.save();
      }
    }

    res.status(200).json({
      score: correctCount,
      passed,
      reputationEarned,
      details
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBlogPodcast = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        let plainText = blog.content;
        try {
          const parsed = JSON.parse(blog.content);
          if (Array.isArray(parsed)) {
            plainText = parsed.map(b => b.content || '').join(' ');
          }
        } catch (e) {}

        const prompt = `You are a professional podcast scriptwriter.
Rewrite the following blog post into an engaging, conversational 2-minute dialogue between a host named "Alex" and an expert guest named "Jordan".
The conversation must be structured as a natural discussion, explaining the key findings or details of the article in simple, engaging terms.

Blog Title: ${blog.title}
Blog Content:
${plainText}

You MUST return a JSON array containing exactly 8 dialogue turns with this structure:
[
  {
    "speaker": "Alex",
    "text": "Welcome back listeners! Today we are discussing an awesome post about..."
  },
  {
    "speaker": "Jordan",
    "text": "Thanks Alex. Yeah, this topic is really fascinating because..."
  }
]

Return only the raw JSON array. Do not include any markdown blocks or formatting.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (rawText) {
            let clean = rawText;
            if (clean.startsWith('```')) {
              clean = clean.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }
            const script = JSON.parse(clean);
            return res.status(200).json({ script });
          }
        }
      } catch (err) {
        console.error('Gemini podcast generation failed, using fallback:', err.message);
      }
    }

    // Fallback script if Gemini API key is missing or failed
    const script = generateFallbackPodcastScript(blog);
    res.status(200).json({ script });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
