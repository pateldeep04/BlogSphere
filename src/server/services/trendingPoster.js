// Native fetch is available globally in Node 18+ — no import needed
import User from '../models/User.js';
import Blog from '../models/Blog.js';
import Notification from '../models/Notification.js';

export const generateTrendingAutoPost = async (force = false) => {
  try {
    // 1. Ensure the system AI bot user exists
    let bot = await User.findOne({ email: 'trendbot@blogsphere.ai' });
    if (!bot) {
      bot = new User({
        name: 'AI TrendBot',
        email: 'trendbot@blogsphere.ai',
        password: 'trendbotsecretpass123', // Placeholder, not used for login
        bio: 'AI Trend Hunter. Automatically tracks and publishes analysis on modern hot tech concepts.',
        profileImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150',
        role: 'author',
        isVerified: true
      });
      await bot.save();
    }

    // 2. Time-guard: skip if TrendBot already posted in the last 6 hours
    //    (bypassed when force=true, e.g. manual admin trigger)
    if (!force) {
      const SIX_HOURS_AGO = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const recentPost = await Blog.findOne({
        author: bot._id,
        createdAt: { $gte: SIX_HOURS_AGO }
      }).sort({ createdAt: -1 });

      if (recentPost) {
        console.log(`[AI TrendBot] ⏭️  Skipping — post already made within last 6 hours: "${recentPost.title}"`);
        return null;
      }
    } else {
      console.log('[AI TrendBot] 🔧 Force mode — bypassing 6-hour guard for manual admin trigger.');
    }

    let articleData = null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a tech journalist and AI trend observer. Suggest a current hot trending topic in software development, technology, AI, web frameworks, or DevOps.
                Generate a premium, engaging, deeply informative article about this trending topic.
                You must return a JSON response matching the following structure:
                {
                  "title": "A very catchy, SEO-friendly title",
                  "coverImage": "An Unsplash image URL related to the topic (use a high-quality technology Unsplash URL, e.g. https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800)",
                  "tags": ["React", "AI", "DevOps"],
                  "category": "Technology",
                  "blocks": [
                    { "id": "b1", "type": "h1", "content": "Introduction Headline" },
                    { "id": "b2", "type": "p", "content": "Paragraph content about the trend..." },
                    { "id": "b3", "type": "quote", "content": "A powerful quote highlight..." },
                    { "id": "b4", "type": "h2", "content": "Subheading" },
                    { "id": "b5", "type": "list", "content": "Key benefit 1\\nKey benefit 2\\nKey benefit 3" },
                    { "id": "b6", "type": "code", "content": "// sample code or command illustrating this technology", "language": "javascript" },
                    { "id": "b7", "type": "callout", "content": "A summary or key warning/tip tip block...", "icon": "💡" }
                  ]
                }
                Make sure the blocks array has a rich flow of paragraphs, list, quote, heading, code block, and callouts to build an impressive layout. Do not include markdown code block wraps around the output. Only return the raw JSON object.`
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
            articleData = JSON.parse(cleanText);
          }
        }
      } catch (err) {
        console.error('Failed fetching trending topic from Gemini:', err.message);
      }
    }

    // Heuristic fallback if API call fails
    if (!articleData) {
      const FallbackTopics = [
        {
          title: 'The Rise of Bun & Rust in Modern Web Frameworks',
          coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
          tags: ['Rust', 'Bun', 'Backend'],
          category: 'Technology',
          blocks: [
            { id: 'f1', type: 'h1', content: 'Why Rust and Bun are Dominating the Web Ecosystem' },
            { id: 'f2', type: 'p', content: 'For years, Node.js stood as the undisputed runtime king for JavaScript execution on servers. However, Bun runtime written in Zig, and Rust-based toolings like Turbopack, SWC, and Biome are ushering in a new era of extreme performance.' },
            { id: 'f3', type: 'quote', content: 'Performance is no longer a luxury; it is a direct contributor to reduced hosting budgets and carbon footprints.' },
            { id: 'f4', type: 'h2', content: 'Immediate Advantages of Bun Runtime' },
            { id: 'f5', type: 'list', content: 'Native TypeScript and JSX support without bundlers\nUp to 4x faster startup speed than Node\nDrop-in replacement compatibility with npm commands' },
            { id: 'f6', type: 'code', content: '// Run Bun Server directly\nBun.serve({\n  fetch(req) {\n    return new Response("Bun is fast!");\n  },\n  port: 3000\n});', language: 'javascript' },
            { id: 'f7', type: 'callout', content: 'Bun includes a native SQLite driver, test runner, and bundler out of the box!', icon: '💡' }
          ]
        },
        {
          title: 'Gemini 2.5 and the Shift Towards Native Agentic Workflows',
          coverImage: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&q=80&w=800',
          tags: ['Gemini', 'AI', 'Agents'],
          category: 'Technology',
          blocks: [
            { id: 'fa1', type: 'h1', content: 'Developing Autonomous Systems with Gemini 2.5 Flash' },
            { id: 'fa2', type: 'p', content: 'Large Language Models are evolving from conversational chatbots into autonomous software agents. AI agents capable of planning, research, and multi-step tool execution are the new frontier.' },
            { id: 'fa3', type: 'quote', content: 'The shift is from human-in-the-loop co-piloting to goal-oriented autonomous orchestration.' },
            { id: 'fa4', type: 'h2', content: 'Key capabilities of Agentic AI models' },
            { id: 'fa5', type: 'list', content: 'Native tool calls and function integrations\nLong context windows to consume entire codebases\nPlanning and self-correction code logic' },
            { id: 'fa6', type: 'code', content: '// Define tool declarations in Gemini\nconst model = genAI.getGenerativeModel({\n  model: "gemini-2.5-flash",\n  tools: [{ functionDeclarations: [...] }]\n});', language: 'javascript' },
            { id: 'fa7', type: 'callout', content: 'Always set a strict ceiling budget on loop iterations when running autonomous loops.', icon: '⚠️' }
          ]
        }
      ];

      // Pick a random fallback topic
      articleData = FallbackTopics[Math.floor(Math.random() * FallbackTopics.length)];
    }

    // Generate unique slug
    const baseSlug = articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let duplicate = await Blog.findOne({ slug });
    let counter = 1;
    while (duplicate) {
      slug = `${baseSlug}-${counter}`;
      duplicate = await Blog.findOne({ slug });
      counter++;
    }

    // Create the blog post
    const newBlog = new Blog({
      title: articleData.title,
      slug,
      content: JSON.stringify(articleData.blocks),
      coverImage: articleData.coverImage || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
      author: bot._id,
      category: articleData.category || 'Technology',
      tags: articleData.tags || ['AI', 'Tech'],
      status: 'published',
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newBlog.save();
    console.log(`[AI TrendBot] Successfully auto-posted article: "${newBlog.title}" (slug: ${newBlog.slug})`);

    // Broadcast to all active clients via socket.io if initialized
    if (global.io) {
      global.io.emit('blog_created', newBlog);
    }

    return newBlog;
  } catch (error) {
    console.error('Error generating automated trending post:', error.message);
    throw error;
  }
};
