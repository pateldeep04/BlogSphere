import Blog from '../../models/Blog.js';
import User from '../../models/User.js';
import Community from '../../models/Community.js';

class RecommendationEngine {
  constructor() {
    this.userInteractionCache = new Map();
    this.blogEmbeddingCache = new Map();
  }

  async getPersonalizedFeed(userId, options = {}) {
    const { limit = 20, offset = 0, category, excludePublished = false } = options;
    
    const user = await User.findById(userId).select('interests subscribedCategories hiddenTags readingHistory followedUsers bookmarkedBlogs favoriteAuthors').lean();
    if (!user) return { blogs: [], hasMore: false };

    const candidateBlogs = await this.getCandidateBlogs(user, { category, excludePublished });
    const scoredBlogs = await this.scoreBlogsForUser(candidateBlogs, user);
    
    const sorted = scoredBlogs
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    const blogs = await Blog.populate(sorted.map(s => s.blog), [
      { path: 'author', select: 'name username profileImage isVerified badge' },
      { path: 'community', select: 'name slug avatar' }
    ]);

    return {
      blogs,
      hasMore: scoredBlogs.length > offset + limit,
      nextOffset: offset + limit
    };
  }

  async getCandidateBlogs(user, options) {
    const { category, excludePublished } = options;
    const query = { status: 'published' };
    
    if (category) query.category = category;
    if (excludePublished && user._id) {
      query.author = { $ne: user._id };
    }

    const interests = user.interests || [];
    const subscribedCategories = user.subscribedCategories || [];
    const hiddenTags = user.hiddenTags || [];
    const followedUsers = user.followedUsers || [];
    const readingHistory = user.readingHistory || [];

    const orConditions = [];
    
    if (interests.length > 0) {
      orConditions.push({ tags: { $in: interests } });
    }
    if (hiddenTags.length > 0) {
      orConditions.push({ tags: { $in: hiddenTags } });
    }
    if (subscribedCategories.length > 0) {
      orConditions.push({ category: { $in: subscribedCategories } });
    }
    if (followedUsers.length > 0) {
      orConditions.push({ author: { $in: followedUsers } });
    }
    if (readingHistory.length > 0) {
      const recentReads = await Blog.find({ _id: { $in: readingHistory.slice(-50) } })
        .select('tags category author').lean();
      const tags = [...new Set(recentReads.flatMap(b => b.tags))];
      const categories = [...new Set(recentReads.map(b => b.category).filter(Boolean))];
      const authors = [...new Set(recentReads.map(b => b.author.toString()))];
      
      if (tags.length) orConditions.push({ tags: { $in: tags } });
      if (categories.length) orConditions.push({ category: { $in: categories } });
      if (authors.length) orConditions.push({ author: { $in: authors } });
    }

    if (orConditions.length > 0) {
      query.$or = orConditions;
    }

    return Blog.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
  }

  async scoreBlogsForUser(blogs, user) {
    const userInterests = new Set(user.interests || []);
    const userCategories = new Set(user.subscribedCategories || []);
    const userHiddenTags = new Set(user.hiddenTags || []);
    const followedUsers = new Set((user.followedUsers || []).map(id => id.toString()));
    const readingHistory = new Set((user.readingHistory || []).map(id => id.toString()));
    const bookmarks = new Set((user.bookmarkedBlogs || []).map(id => id.toString()));
    const favoriteAuthors = new Set((user.favoriteAuthors || []).map(id => id.toString()));

    const now = Date.now();
    const scores = await Promise.all(blogs.map(async (blog) => {
      let score = 0;
      const blogId = blog._id.toString();
      const authorId = blog.author.toString();
      const ageHours = (now - new Date(blog.createdAt).getTime()) / (1000 * 60 * 60);

      score += this.calculateContentScore(blog, userInterests, userCategories, userHiddenTags);
      score += this.calculateAuthorScore(authorId, followedUsers, favoriteAuthors, user);
      score += this.calculateEngagementScore(blog);
      score += this.calculateRecencyScore(ageHours);
      score += this.calculateInteractionScore(blogId, readingHistory, bookmarks);
      score += await this.calculateCollaborativeScore(blogId, user);

      return { blog, score };
    }));

    return scores;
  }

  calculateContentScore(blog, userInterests, userCategories, userHiddenTags = new Set()) {
    let score = 0;
    const blogTags = blog.tags || [];
    const blogCategory = blog.category;

    const tagMatches = blogTags.filter(tag => userInterests.has(tag)).length;
    score += tagMatches * 15;

    if (blogCategory && userCategories.has(blogCategory)) {
      score += 20;
    }

    const tagOverlap = blogTags.filter(tag => userInterests.has(tag)).length;
    score += tagOverlap * 5;

    // AI customized interests (hidden tags) matching boost
    const hiddenTagMatches = blogTags.filter(tag => userHiddenTags.has(tag)).length;
    score += hiddenTagMatches * 25;

    return score;
  }

  calculateAuthorScore(authorId, followedUsers, favoriteAuthors, user) {
    if (followedUsers.has(authorId)) return 30;
    if (favoriteAuthors.has(authorId)) return 25;
    
    const authorBlogsCount = user.authorInteractionCounts?.get(authorId) || 0;
    return Math.min(authorBlogsCount * 2, 15);
  }

  calculateEngagementScore(blog) {
    const likes = blog.likes?.length || 0;
    const comments = blog.commentsCount || 0;
    const views = blog.views || 0;
    const completions = blog.completions || 0;
    const reactions = Object.values(blog.reactions || {}).flat().length;

    const engagementRate = views > 0 ? (likes + comments * 2 + reactions + completions * 3) / views : 0;
    const velocity = this.calculateVelocity(blog);

    return Math.log10(likes + 1) * 5 + 
           Math.log10(comments + 1) * 3 + 
           engagementRate * 100 + 
           velocity * 10;
  }

  calculateVelocity(blog) {
    const ageHours = (Date.now() - new Date(blog.createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours < 1) return 0;
    
    const likes = blog.likes?.length || 0;
    const comments = blog.commentsCount || 0;
    return (likes + comments * 2) / Math.max(ageHours, 1);
  }

  calculateRecencyScore(ageHours) {
    if (ageHours < 1) return 25;
    if (ageHours < 6) return 20;
    if (ageHours < 24) return 15;
    if (ageHours < 72) return 10;
    if (ageHours < 168) return 5;
    return 0;
  }

  calculateInteractionScore(blogId, readingHistory, bookmarks) {
    let score = 0;
    if (readingHistory.has(blogId)) score -= 50;
    if (bookmarks.has(blogId)) score += 10;
    return score;
  }

  async calculateCollaborativeScore(blogId, user) {
    if (!user._id) return 0;
    
    const similarUsers = await this.findSimilarUsers(user._id);
    if (similarUsers.length === 0) return 0;

    const similarUserIds = similarUsers.map(u => u._id.toString());
    const interactions = await Blog.find({ 
      _id: blogId,
      $or: [
        { likes: { $in: similarUserIds } },
        { 'reactions.thumbsUp': { $in: similarUserIds } },
        { 'reactions.heart': { $in: similarUserIds } }
      ]
    }).select('likes reactions').lean();

    return interactions.length > 0 ? 15 : 0;
  }

  async findSimilarUsers(userId, limit = 50) {
    const cacheKey = `similar_${userId}`;
    if (this.userInteractionCache.has(cacheKey)) {
      return this.userInteractionCache.get(cacheKey);
    }

    const user = await User.findById(userId).select('readingHistory followedUsers interests').lean();
    if (!user) return [];

    const readingHistory = user.readingHistory || [];
    if (readingHistory.length < 3) return [];

    const otherUsers = await User.find({
      _id: { $ne: userId },
      readingHistory: { $in: readingHistory }
    }).select('readingHistory interests').limit(limit).lean();

    const similarities = otherUsers.map(other => {
      const commonReads = other.readingHistory.filter(id => 
        readingHistory.some(rid => rid.toString() === id.toString())
      ).length;
      
      const interestOverlap = other.interests?.filter(i => 
        user.interests?.includes(i)
      ).length || 0;

      const score = commonReads * 2 + interestOverlap * 3;
      return { ...other, similarityScore: score };
    });

    const sorted = similarities
      .filter(s => s.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 20);

    this.userInteractionCache.set(cacheKey, sorted);
    setTimeout(() => this.userInteractionCache.delete(cacheKey), 30 * 60 * 1000);

    return sorted;
  }

  async getSimilarBlogs(blogId, limit = 10) {
    const blog = await Blog.findById(blogId).select('tags category author').lean();
    if (!blog) return [];

    const query = {
      _id: { $ne: blogId },
      status: 'published',
      $or: [
        { tags: { $in: blog.tags || [] } },
        { category: blog.category }
      ]
    };

    const candidates = await Blog.find(query)
      .limit(50)
      .populate('author', 'name username profileImage isVerified')
      .populate('community', 'name slug avatar')
      .lean();

    const scored = candidates.map(candidate => {
      let score = 0;
      const commonTags = (candidate.tags || []).filter(t => (blog.tags || []).includes(t)).length;
      score += commonTags * 10;
      if (candidate.category === blog.category) score += 15;
      if (candidate.author._id.toString() === blog.author.toString()) score += 20;
      score += Math.log10((candidate.likes?.length || 0) + 1) * 5;
      return { ...candidate, similarityScore: score };
    });

    return scored
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  async getRecommendedCommunities(userId, limit = 10) {
    const user = await User.findById(userId).select('interests subscribedCategories communities').lean();
    if (!user) return [];

    const userCommunities = new Set((user.communities || []).map(c => c.toString()));
    const interests = user.interests || [];
    const categories = user.subscribedCategories || [];

    const query = {
      _id: { $nin: Array.from(userCommunities) },
      isPrivate: false
    };

    const orConditions = [];
    if (interests.length > 0) orConditions.push({ tags: { $in: interests } });
    if (categories.length > 0) orConditions.push({ category: { $in: categories } });
    if (orConditions.length > 0) query.$or = orConditions;

    const communities = await Community.find(query)
      .limit(30)
      .populate('owner', 'name username')
      .populate('moderators', 'name username')
      .lean();

    const scored = communities.map(community => {
      let score = 0;
      const commonTags = (community.tags || []).filter(t => interests.includes(t)).length;
      score += commonTags * 10;
      if (categories.includes(community.category)) score += 15;
      score += Math.log10(community.memberCount + 1) * 5;
      score += community.postsCount ? Math.log10(community.postsCount + 1) * 3 : 0;
      return { ...community, recommendationScore: score };
    });

    return scored
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  async getTrendingTopics(timeframe = '24h') {
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const blogs = await Blog.find({ 
      status: 'published', 
      createdAt: { $gte: since } 
    }).select('tags category').lean();

    const tagCounts = {};
    const categoryCounts = {};

    blogs.forEach(blog => {
      (blog.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      if (blog.category) {
        categoryCounts[blog.category] = (categoryCounts[blog.category] || 0) + 1;
      }
    });

    const trendingTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    const trendingCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    return { trendingTags, trendingCategories, timeframe, totalBlogs: blogs.length };
  }

  async predictTrendingTopics() {
    const recentBlogs = await Blog.find({ 
      status: 'published', 
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
    }).select('tags category createdAt views likes commentsCount').lean();

    const topicVelocity = {};
    
    recentBlogs.forEach(blog => {
      const ageHours = (Date.now() - new Date(blog.createdAt).getTime()) / (1000 * 60 * 60);
      const velocity = ((blog.views || 0) + (blog.likes?.length || 0) * 10 + (blog.commentsCount || 0) * 5) / Math.max(ageHours, 0.5);
      
      (blog.tags || []).forEach(tag => {
        if (!topicVelocity[tag]) topicVelocity[tag] = { totalVelocity: 0, count: 0 };
        topicVelocity[tag].totalVelocity += velocity;
        topicVelocity[tag].count += 1;
      });
    });

    const predictions = Object.entries(topicVelocity)
      .map(([tag, data]) => ({
        tag,
        avgVelocity: data.totalVelocity / data.count,
        postCount: data.count,
        momentum: data.totalVelocity
      }))
      .sort((a, b) => b.momentum - a.momentum)
      .slice(0, 15);

    return predictions;
  }

  async getContentGaps(userId) {
    const user = await User.findById(userId).select('interests subscribedCategories').lean();
    if (!user) return [];

    const interests = user.interests || [];
    const categories = user.subscribedCategories || [];

    const popularTopics = await Blog.aggregate([
      { $match: { status: 'published', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 }, avgViews: { $avg: '$views' } } },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    const userTopicCounts = await Blog.aggregate([
      { $match: { author: user._id, status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } }
    ]);

    const userTopics = new Set(userTopicCounts.map(t => t._id));
    const gaps = popularTopics
      .filter(t => !userTopics.has(t._id) && (interests.includes(t._id) || categories.includes(t._id)))
      .slice(0, 10)
      .map(t => ({ topic: t._id, popularity: t.count, avgViews: Math.round(t.avgViews) }));

    return gaps;
  }
}

export const recommendationEngine = new RecommendationEngine();