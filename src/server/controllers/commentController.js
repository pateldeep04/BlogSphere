import Comment from '../models/Comment.js';
import Blog from '../models/Blog.js';
import Notification from '../models/Notification.js';

export const createComment = async (req, res) => {
  try {
    const { blogId, text, parentComment } = req.body;
    const userId = req.user._id;

    const blog = await Blog.findById(blogId).populate('author');
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const comment = new Comment({
      blogId,
      userId,
      text,
      parentComment: parentComment || null
    });

    await comment.save();

    // Populate user info for immediate frontend use
    await comment.populate('userId', 'name profileImage');

    // Real-time Notification
    // 1. If reply: notify parent comment author
    // 2. If general comment: notify blog author
    if (parentComment) {
      const parent = await Comment.findById(parentComment).populate('userId');
      if (parent && parent.userId._id.toString() !== userId.toString()) {
        const notif = new Notification({
          userId: parent.userId._id,
          message: `${req.user.name} replied to your comment on "${blog.title}"`,
          type: 'comment',
          referenceId: blog._id
        });
        await notif.save();
        if (global.io) {
          global.io.to(`user_${parent.userId._id}`).emit('notification_received', notif);
        }
      }
    } else if (blog.author._id.toString() !== userId.toString()) {
      const notif = new Notification({
        userId: blog.author._id,
        message: `${req.user.name} commented on your blog "${blog.title}"`,
        type: 'comment',
        referenceId: blog._id
      });
      await notif.save();
      if (global.io) {
        global.io.to(`user_${blog.author._id}`).emit('notification_received', notif);
      }
    }

    res.status(201).json({ message: 'Comment posted successfully', comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCommentsByBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const comments = await Comment.find({ blogId })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: 1 }); // Oldest first for chronological order

    res.status(200).json({ comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const blog = await Blog.findById(comment.blogId);

    // Authorization: comment owner, blog author, or admin
    const isCommentOwner = comment.userId.toString() === req.user._id.toString();
    const isBlogOwner = blog && blog.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCommentOwner && !isBlogOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment.' });
    }

    // Delete comment and any replies
    await Comment.findByIdAndDelete(id);
    await Comment.deleteMany({ parentComment: id });

    res.status(200).json({ message: 'Comment and replies deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
