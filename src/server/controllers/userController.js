import User from '../models/User.js';
import Blog from '../models/Blog.js';
import Notification from '../models/Notification.js';
import Comment from '../models/Comment.js';
import axios from 'axios';

export const getPublicAuthors = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { role: { $in: ['author', 'admin'] } };
    
    // Hide private users from public search directory
    query.isPrivate = { $ne: true };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const users = await User.find(query)
      .select('name profileImage bio reputationPoints badge followers')
      .sort({ reputationPoints: -1 })
      .limit(20);

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Fetch published blogs of this user
    const blogs = await Blog.find({ author: id, status: 'published' })
      .populate('author', 'name profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({ user, blogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const followUser = async (req, res) => {
  try {
    const { id } = req.params; // Target user to follow
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    if (currentUser._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    const followIndex = currentUser.following.indexOf(targetUser._id);
    let isFollowing = false;

    if (followIndex === -1) {
      // Follow
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
      isFollowing = true;

      // Notify the target user
      const notif = new Notification({
        userId: targetUser._id,
        message: `${currentUser.name} started following you`,
        type: 'follow',
        referenceId: currentUser._id
      });
      await notif.save();
      if (global.io) {
        global.io.to(`user_${targetUser._id}`).emit('notification_received', notif);
      }
    } else {
      // Unfollow
      currentUser.following.splice(followIndex, 1);
      const followerIndex = targetUser.followers.indexOf(currentUser._id);
      if (followerIndex !== -1) {
        targetUser.followers.splice(followerIndex, 1);
      }
    }

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      message: isFollowing ? 'Successfully followed' : 'Successfully unfollowed',
      isFollowing,
      followersCount: targetUser.followers.length,
      followingCount: currentUser.following.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin Routes
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (role) {
      user.role = role;
    }
    await user.save();

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndDelete(id);
    // Delete their blogs
    await Blog.deleteMany({ author: id });

    res.status(200).json({ message: 'User and all associated blogs deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update own user profile
export const updateOwnProfile = async (req, res) => {
  try {
    const { name, bio, profileImage, socialLinks, isPrivate, username } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (username !== undefined && username !== user.username) {
      const cleanUsername = username.toLowerCase().trim();
      if (cleanUsername) {
        const existingUsername = await User.findOne({ username: cleanUsername });
        if (existingUsername) {
          return res.status(400).json({ error: 'This username is already taken.' });
        }
        user.username = cleanUsername;
      }
    }

    if (name !== undefined) user.name = name;
    
    if (bio !== undefined) {
      const oldBio = user.bio || '';
      user.bio = bio.trim();
      
      // If bio actually changed and is not empty, reclassify
      if (user.bio !== oldBio && user.bio.length > 0) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          try {
            const aiPrompt = `Analyze the following user profile bio: "${user.bio}"
            
            Tasks:
            1. Classify their high-level interests into one or more of these standard categories: ["Technology", "Travel", "Food", "Education", "Sports"].
            2. Extrapolate exactly ONE specific low-level keyword/topic (e.g. "react", "cooking", "travel", "ai", "history") that represents their primary interest based on their bio. This tag MUST be a single word (alphanumeric only, no spaces, hyphens, or special characters). This will be a system-level hidden tag.
            
            You MUST return a JSON object with this exact structure:
            {
              "categories": ["Technology"],
              "tags": ["react"]
            }
            
            Only return the raw JSON object. Do not wrap it in markdown block quotes (such as \`\`\`json). Provide clean, parseable JSON.`;

            const aiResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
              contents: [{ parts: [{ text: aiPrompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            }, {
              headers: { 'Content-Type': 'application/json' }
            });

            const rawText = aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (rawText) {
              let cleanText = rawText;
              if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
              }
              const parsed = JSON.parse(cleanText);
              
              if (parsed.categories && Array.isArray(parsed.categories) && parsed.categories.length > 0) {
                const validCategories = ['Technology', 'Travel', 'Food', 'Education', 'Sports'];
                const filtered = parsed.categories.filter(cat => validCategories.includes(cat));
                if (filtered.length > 0) {
                  user.subscribedCategories = filtered;
                }
              }
              if (parsed.tags) {
                let tagStr = '';
                if (Array.isArray(parsed.tags)) {
                  tagStr = parsed.tags[0] || '';
                } else if (typeof parsed.tags === 'string') {
                  tagStr = parsed.tags;
                }
                const singleTag = String(tagStr).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                if (singleTag) {
                  user.hiddenTags = [singleTag];
                }
              }
            }
          } catch (aiErr) {
            console.error('AI Bio Re-classification failed:', aiErr.message);
          }
        }
      }
    }

    if (profileImage !== undefined) user.profileImage = profileImage;
    if (isPrivate !== undefined) user.isPrivate = isPrivate;
    if (socialLinks !== undefined) {
      user.socialLinks = {
        twitter: socialLinks.twitter !== undefined ? socialLinks.twitter : user.socialLinks?.twitter || '',
        github: socialLinks.github !== undefined ? socialLinks.github : user.socialLinks?.github || '',
        website: socialLinks.website !== undefined ? socialLinks.website : user.socialLinks?.website || ''
      };
    }

    await user.save();
    
    // Omit password from output
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle bookmark on blog post
export const toggleBookmark = async (req, res) => {
  try {
    const { blogId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.savedBlogs) {
      user.savedBlogs = [];
    }

    const index = user.savedBlogs.indexOf(blogId);
    let isBookmarked = false;
    if (index === -1) {
      user.savedBlogs.push(blogId);
      isBookmarked = true;
    } else {
      user.savedBlogs.splice(index, 1);
    }

    await user.save();
    res.status(200).json({
      message: isBookmarked ? 'Article bookmarked' : 'Bookmark removed',
      isBookmarked,
      savedBlogs: user.savedBlogs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all bookmarked blog posts
export const getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedBlogs',
      populate: { path: 'author', select: 'name profileImage' }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Filter out any blogs that might have been deleted but are still in bookmarks
    const validSavedBlogs = (user.savedBlogs || []).filter(blog => blog !== null);

    res.status(200).json({ bookmarks: validSavedBlogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle Newsletter Subscription to author
export const toggleNewsletter = async (req, res) => {
  try {
    const { authorId } = req.params;
    const targetAuthor = await User.findById(authorId);
    if (!targetAuthor) {
      return res.status(404).json({ error: 'Author not found.' });
    }

    if (req.user._id.toString() === authorId) {
      return res.status(400).json({ error: 'You cannot subscribe to your own newsletter.' });
    }

    if (!targetAuthor.newsletterSubscribers) {
      targetAuthor.newsletterSubscribers = [];
    }

    const index = targetAuthor.newsletterSubscribers.indexOf(req.user._id);
    let isSubscribed = false;
    if (index === -1) {
      targetAuthor.newsletterSubscribers.push(req.user._id);
      isSubscribed = true;
    } else {
      targetAuthor.newsletterSubscribers.splice(index, 1);
    }

    await targetAuthor.save();
    res.status(200).json({
      message: isSubscribed ? 'Subscribed to newsletter' : 'Unsubscribed from newsletter',
      isSubscribed,
      subscribersCount: targetAuthor.newsletterSubscribers.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle Category Subscription
export const toggleCategorySubscription = async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.subscribedCategories) {
      user.subscribedCategories = [];
    }

    const index = user.subscribedCategories.indexOf(category);
    let isSubscribed = false;
    if (index === -1) {
      user.subscribedCategories.push(category);
      isSubscribed = true;
    } else {
      user.subscribedCategories.splice(index, 1);
    }

    await user.save();
    res.status(200).json({
      message: isSubscribed ? `Subscribed to category ${category}` : `Unsubscribed from category ${category}`,
      isSubscribed,
      subscribedCategories: user.subscribedCategories
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Dynamic User Reputation recalculator
export const recalculateReputation = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Fetch published blogs
    const blogs = await Blog.find({ author: userId, status: 'published' });
    const blogsCount = blogs.length;

    // Likes count
    const likesCount = blogs.reduce((sum, b) => sum + (b.likes?.length || 0), 0);

    // Reactions count
    const reactionsCount = blogs.reduce((sum, b) => {
      let rCount = 0;
      if (b.reactions) {
        rCount += (b.reactions.thumbsUp?.length || 0);
        rCount += (b.reactions.heart?.length || 0);
        rCount += (b.reactions.clap?.length || 0);
        rCount += (b.reactions.laugh?.length || 0);
      }
      return sum + rCount;
    }, 0);

    // Comments count on user's blogs
    const blogIds = blogs.map(b => b._id);
    const commentsCount = await Comment.countDocuments({ blogId: { $in: blogIds } });

    // Points scoring
    const points = (blogsCount * 50) + (likesCount * 10) + (reactionsCount * 5) + (commentsCount * 5);

    // Badges threshold
    let newBadge = 'Reader';
    if (points >= 500) {
      newBadge = 'Moderator';
    } else if (points >= 250) {
      newBadge = 'Community Leader';
    } else if (points >= 100) {
      newBadge = 'Verified Author';
    }

    // Trigger milestone notification if upgraded
    const oldBadge = user.badge || 'Reader';
    const badgesOrder = ['Reader', 'Verified Author', 'Community Leader', 'Moderator'];
    const oldIndex = badgesOrder.indexOf(oldBadge);
    const newIndex = badgesOrder.indexOf(newBadge);

    if (newIndex > oldIndex) {
      const notif = new Notification({
        userId: user._id,
        message: `🎉 Congratulations! Your active participation has unlocked the "${newBadge}" badge!`,
        type: 'reputation_milestone',
        referenceId: user._id
      });
      await notif.save();
      
      if (global.io) {
        global.io.to(`user_${user._id}`).emit('notification_received', notif);
      }
    }

    user.reputationPoints = points;
    user.badge = newBadge;
    await user.save();
  } catch (error) {
    console.error('Reputation update error:', error.message);
  }
};

// Aggregate stats for Author Analytics Dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const authorId = req.user._id;
    const user = await User.findById(authorId);

    // Fetch both published and draft blogs to calculate aggregate analytics
    const blogs = await Blog.find({ author: authorId });
    
    const totalBlogs = blogs.length;
    const totalViews = blogs.reduce((sum, b) => sum + (b.views || 0), 0);
    const totalLikes = blogs.reduce((sum, b) => sum + (b.likes?.length || 0), 0);
    const totalBounces = blogs.reduce((sum, b) => sum + (b.bounces || 0), 0);
    const totalCompletions = blogs.reduce((sum, b) => sum + (b.completions || 0), 0);
    const totalDuration = blogs.reduce((sum, b) => sum + (b.totalReadTime || 0), 0);

    // Calculations
    const averageReadTimeMinutes = totalViews > 0 ? parseFloat(((totalDuration / totalViews) / 60).toFixed(2)) : 0;
    const bounceRatePercent = totalViews > 0 ? Math.round((totalBounces / totalViews) * 100) : 0;
    const completionRatePercent = totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0;

    // Find top-performing blog by views
    let topBlog = null;
    if (blogs.length > 0) {
      topBlog = [...blogs].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
    }

    // Weekly stats simulation based on real views
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const chartData = weekdays.map((day, idx) => {
      const factor = (idx + 1) / 28;
      const simulatedViews = Math.round(totalViews * factor * (0.8 + Math.random() * 0.4));
      return { day, views: simulatedViews || 0 };
    });

    res.status(200).json({
      stats: {
        totalBlogs,
        totalViews,
        totalLikes,
        followersCount: user.followers?.length || 0,
        reputationPoints: user.reputationPoints || 0,
        badge: user.badge || 'Reader',
        averageReadTimeMinutes,
        bounceRatePercent,
        completionRatePercent,
        topBlogTitle: topBlog ? topBlog.title : 'No articles yet',
        topBlogSlug: topBlog ? topBlog.slug : ''
      },
      chartData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Admin: Earnings Report
// Earnings formula:
//   $0.005  per view
//   $0.25   per published post
//   $0.10   per like (thumbsUp + heart + clap + laugh)
//   $0.02   per comment received
// ─────────────────────────────────────────────────────────────
export const getEarningsReport = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    // Get all non-admin users
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('name email username profileImage role createdAt');

    const report = await Promise.all(users.map(async (user) => {
      const blogs = await Blog.find({ author: user._id, status: 'published' });

      const totalPosts      = blogs.length;
      const totalViews      = blogs.reduce((s, b) => s + (b.views || 0), 0);
      const totalLikes      = blogs.reduce((s, b) => s + (b.likes?.length || 0), 0);
      const totalReactions  = blogs.reduce((s, b) => {
        const r = b.reactions || {};
        return s + (r.thumbsUp?.length || 0) + (r.heart?.length || 0)
                 + (r.clap?.length || 0)     + (r.laugh?.length || 0);
      }, 0);
      const totalComments   = await Comment.countDocuments({
        blog: { $in: blogs.map(b => b._id) }
      });

      // Earnings calculation
      const earningsFromViews     = totalViews      * 0.005;
      const earningsFromPosts     = totalPosts      * 0.25;
      const earningsFromLikes     = totalLikes      * 0.10;
      const earningsFromReactions = totalReactions  * 0.05;
      const earningsFromComments  = totalComments   * 0.02;
      const estimatedEarnings     = parseFloat(
        (earningsFromViews + earningsFromPosts + earningsFromLikes + earningsFromReactions + earningsFromComments)
        .toFixed(2)
      );

      // Top performing post
      const topPost = blogs.sort((a, b) => (b.views || 0) - (a.views || 0))[0];

      return {
        _id:              user._id,
        name:             user.name,
        email:            user.email,
        username:         user.username || '—',
        role:             user.role,
        profileImage:     user.profileImage,
        joinedAt:         user.createdAt,
        totalPosts,
        totalViews,
        totalLikes,
        totalReactions,
        totalComments,
        estimatedEarnings,
        breakdown: {
          fromViews:     earningsFromViews.toFixed(2),
          fromPosts:     earningsFromPosts.toFixed(2),
          fromLikes:     earningsFromLikes.toFixed(2),
          fromReactions: earningsFromReactions.toFixed(2),
          fromComments:  earningsFromComments.toFixed(2)
        },
        topPost: topPost ? {
          title: topPost.title,
          slug:  topPost.slug,
          views: topPost.views || 0
        } : null
      };
    }));

    // Sort by earnings descending
    report.sort((a, b) => b.estimatedEarnings - a.estimatedEarnings);

    res.status(200).json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    // Get all non-admin users (emails omitted for public access)
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('name username profileImage role createdAt');

    const report = await Promise.all(users.map(async (user) => {
      const blogs = await Blog.find({ author: user._id, status: 'published' });

      const totalPosts      = blogs.length;
      const totalViews      = blogs.reduce((s, b) => s + (b.views || 0), 0);
      const totalLikes      = blogs.reduce((s, b) => s + (b.likes?.length || 0), 0);
      const totalReactions  = blogs.reduce((s, b) => {
        const r = b.reactions || {};
        return s + (r.thumbsUp?.length || 0) + (r.heart?.length || 0)
                 + (r.clap?.length || 0)     + (r.laugh?.length || 0);
      }, 0);
      const totalComments   = await Comment.countDocuments({
        blog: { $in: blogs.map(b => b._id) }
      });

      // Earnings calculation
      const earningsFromViews     = totalViews      * 0.005;
      const earningsFromPosts     = totalPosts      * 0.25;
      const earningsFromLikes     = totalLikes      * 0.10;
      const earningsFromReactions = totalReactions  * 0.05;
      const earningsFromComments  = totalComments   * 0.02;
      const estimatedEarnings     = parseFloat(
        (earningsFromViews + earningsFromPosts + earningsFromLikes + earningsFromReactions + earningsFromComments)
        .toFixed(2)
      );

      // Top performing post
      const topPost = blogs.sort((a, b) => (b.views || 0) - (a.views || 0))[0];

      return {
        _id:              user._id,
        name:             user.name,
        username:         user.username || '—',
        role:             user.role,
        profileImage:     user.profileImage,
        joinedAt:         user.createdAt,
        totalPosts,
        totalViews,
        totalLikes,
        totalReactions,
        totalComments,
        estimatedEarnings,
        breakdown: {
          fromViews:     earningsFromViews.toFixed(2),
          fromPosts:     earningsFromPosts.toFixed(2),
          fromLikes:     earningsFromLikes.toFixed(2),
          fromReactions: earningsFromReactions.toFixed(2),
          fromComments:  earningsFromComments.toFixed(2)
        },
        topPost: topPost ? {
          title: topPost.title,
          slug:  topPost.slug,
          views: topPost.views || 0
        } : null
      };
    }));

    // Sort by earnings descending
    report.sort((a, b) => b.estimatedEarnings - a.estimatedEarnings);

    res.status(200).json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
