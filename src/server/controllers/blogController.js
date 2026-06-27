import Blog from '../models/Blog.js';
import BlogVersion from '../models/BlogVersion.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

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
    const { title, content, coverImage, category, tags, status, collaborators } = req.body;

    // Generate unique slug
    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let slug = baseSlug || 'untitled';
    let count = 0;
    while (await Blog.findOne({ slug })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }

    const blog = new Blog({
      title,
      slug,
      content,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800',
      author: req.user._id,
      category: category || '',
      tags: tags || [],
      status: status || 'draft',
      collaborators: collaborators || []
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
    if (author) query.author = author;
    
    // Filter by status if provided (and not 'all'). Default to 'published' if none provided
    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = 'published';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name profileImage bio')
      .populate('collaborators', 'name profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({ slug })
      .populate('author', 'name profileImage bio followers')
      .populate('collaborators', 'name profileImage email');

    if (!blog) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.status(200).json({ blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, coverImage, category, tags, status, collaborators } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Check permissions: author or collaborator
    const isAuthor = blog.author.toString() === req.user._id.toString();
    const isCollaborator = blog.collaborators.some(
      (cId) => cId.toString() === req.user._id.toString()
    );

    if (!isAuthor && !isCollaborator && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to edit this blog.' });
    }

    // Version Control System
    // Calculate new version number
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
    blog.tags = tags !== undefined ? tags : blog.tags;
    blog.status = status !== undefined ? status : blog.status;
    if (isAuthor) {
      blog.collaborators = collaborators !== undefined ? collaborators : blog.collaborators;
    }
    blog.updatedAt = Date.now();

    await blog.save();

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

    await Blog.findByIdAndDelete(id);
    // Delete version history and comments
    await BlogVersion.deleteMany({ blogId: id });

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
    res.status(200).json({ message: isLiked ? 'Blog liked' : 'Blog unliked', likesCount: blog.likes.length, isLiked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Recommendation engine
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    let preferredCategories = ['Technology', 'Education', 'Travel'];
    let preferredTags = [];
    let followedAuthors = [];

    if (userId) {
      const user = await User.findById(userId);
      followedAuthors = user.following || [];

      // Find blogs the user has liked
      const likedBlogs = await Blog.find({ likes: userId });
      if (likedBlogs.length > 0) {
        preferredCategories = [...new Set(likedBlogs.map(b => b.category))];
        preferredTags = [...new Set(likedBlogs.flatMap(b => b.tags))];
      }
    }

    // Query for recommendations
    // 1. Prioritize followed authors and categories
    // 2. Fallback to trending/popular if insufficient
    let recommended = await Blog.find({
      status: 'published',
      $or: [
        { author: { $in: followedAuthors } },
        { category: { $in: preferredCategories } },
        { tags: { $in: preferredTags } }
      ],
      author: { $ne: userId } // Exclude own blogs
    })
    .populate('author', 'name profileImage')
    .limit(10);

    // If we have less than 5 recommendations, grab any popular published articles
    if (recommended.length < 5) {
      const remainingCount = 10 - recommended.length;
      const idsToExclude = recommended.map(b => b._id);
      if (userId) idsToExclude.push(userId);

      const generalBlogs = await Blog.find({
        status: 'published',
        _id: { $notin: idsToExclude },
        author: { $ne: userId }
      })
      .populate('author', 'name profileImage')
      .sort({ views: -1, likes: -1 })
      .limit(remainingCount);

      recommended = recommended.concat(generalBlogs);
    }

    res.status(200).json({ blogs: recommended });
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

// Real AI full blog generation helper via Gemini API
const generateGeminiBlog = async (topic) => {
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
              text: `You are an expert article writer. Write a comprehensive, high-quality, and engaging blog post about the topic: "${topic}".
              
              You MUST return a JSON object with this exact structure:
              {
                "title": "A catchy, SEO-friendly title of the blog post",
                "blocks": [
                  { "id": "h1-block-1", "type": "h1", "content": "Introduction to the topic" },
                  { "id": "p-block-2", "type": "p", "content": "Write an engaging paragraph block here." },
                  { "id": "h2-block-3", "type": "h2", "content": "Subheading of section 1" },
                  { "id": "p-block-4", "type": "p", "content": "Write a detailed paragraph explaining details of section 1." },
                  { "id": "quote-block-5", "type": "quote", "content": "An inspiring quote or callout related to the topic." },
                  { "id": "list-block-6", "type": "list", "content": "Key point 1\\nKey point 2\\nKey point 3" },
                  { "id": "p-block-7", "type": "p", "content": "A strong conclusion paragraph." }
                ]
              }

              Write at least 6 blocks. Ensure they are structured logically. Do not include any markdown formatting wrappers or backticks, return ONLY the raw JSON object.`
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
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
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
  if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
    parsed.blocks = parsed.blocks.map(block => {
      if (block.type === 'list' && typeof block.content === 'string') {
        block.content = block.content
          .split('\n')
          .map(line => line.trim().replace(/^[\*\-\•]\s*/, ''))
          .join('\n');
      }
      return block;
    });
  }
  return parsed;
};

// Fallback Mock Blog Generator when Gemini API is rate-limited or offline
const generateMockBlog = (topic) => {
  const cleanTopic = topic.trim();
  const title = `Exploring ${cleanTopic}: A Comprehensive Guide`;
  const blocks = [
    {
      id: `h1-mock-${Date.now()}-1`,
      type: 'h1',
      content: `Introduction to ${cleanTopic}`
    },
    {
      id: `p-mock-${Date.now()}-2`,
      type: 'p',
      content: `This article provides an in-depth overview of ${cleanTopic}. Understanding this subject is crucial for developers and enthusiasts alike, as it represents a core pillar of modern digital solutions. As technology evolves, staying informed on topics like ${cleanTopic} helps professionals maintain a competitive edge and build more robust architectures.`
    },
    {
      id: `h2-mock-${Date.now()}-3`,
      type: 'h2',
      content: `Key Concepts and Principles of ${cleanTopic}`
    },
    {
      id: `p-mock-${Date.now()}-4`,
      type: 'p',
      content: `When delving into ${cleanTopic}, there are several fundamental principles to consider. First, it requires a solid understanding of how different components interface with each other. Second, performance and scalability must be factored in early in the design cycle. Adhering to these standards ensures clean, maintainable systems.`
    },
    {
      id: `quote-mock-${Date.now()}-5`,
      type: 'quote',
      content: `"${cleanTopic} is not just a technology or methodology—it's a mindset that shapes how we solve complex problems in modern development."`
    },
    {
      id: `list-mock-${Date.now()}-6`,
      type: 'list',
      content: `Core benefit 1: Rapid integration and adaptability\nCore benefit 2: High efficiency and minimized developer overhead\nCore benefit 3: Scalability ready for production deployments`
    },
    {
      id: `p-mock-${Date.now()}-7`,
      type: 'p',
      content: `In conclusion, ${cleanTopic} plays an essential role in today's software landscape. By leveraging these concepts, teams can build fast, secure, and highly reliable applications. As you continue exploring this topic, focus on practical implementations and iterative improvements.`
    }
  ];
  return { title, blocks };
};

export const generateAIBlogContent = async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ error: 'Topic is required to generate content.' });
    }

    try {
      const generated = await generateGeminiBlog(topic);
      res.status(200).json({ title: generated.title, blocks: generated.blocks });
    } catch (apiError) {
      console.warn(`[WARN] Gemini API failed (${apiError.message}). Falling back to mock generator.`);
      const fallbackData = generateMockBlog(topic);
      res.status(200).json({ title: fallbackData.title, blocks: fallbackData.blocks, fallback: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
