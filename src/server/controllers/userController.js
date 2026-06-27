import User from '../models/User.js';
import Blog from '../models/Blog.js';
import Notification from '../models/Notification.js';

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
