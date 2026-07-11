import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'blog_sphere_super_secret_jwt_token_key_2026_987654321';

export const register = async (req, res) => {
  try {
    const { name, email, password, bio, profileImage, role, isPrivate, username } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const finalUsername = username 
      ? username.toLowerCase().trim() 
      : name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);

    let uniqueUsername = finalUsername;
    while (await User.findOne({ username: uniqueUsername })) {
      uniqueUsername = `${finalUsername}${Math.floor(Math.random() * 100)}`;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Block anyone from registering as an admin
    const signupRole = (role === 'admin') ? 'author' : (role || 'author');

    // Create user
    const user = new User({
      name,
      username: uniqueUsername,
      email,
      password: hashedPassword,
      bio: bio || '',
      profileImage: profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      role: signupRole,
      isPrivate: isPrivate || false
    });

    await user.save();

    // Sign JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Exclude password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Sign JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: userResponse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required.' });
    }

    // Verify Google ID Token via Google API
    const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    
    // Validate audience if GOOGLE_CLIENT_ID is configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && googleRes.data.aud !== clientId) {
      return res.status(400).json({ error: 'Token audience mismatch. Invalid Client ID.' });
    }

    const { sub: googleId, email, name, picture } = googleRes.data;

    if (!email) {
      return res.status(400).json({ error: 'Email permission is required for authentication.' });
    }

    // 1. Find user by googleId
    let user = await User.findOne({ googleId });

    if (!user) {
      // 2. Find user by email (linking strategy)
      user = await User.findOne({ email });

      if (user) {
        // Link Google ID to existing email account
        user.googleId = googleId;
        if (!user.profileImage) {
          user.profileImage = picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
        }
        await user.save();
      } else {
        // 3. Register a new user
        const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
        let uniqueUsername = baseUsername;
        // Keep checking username uniqueness
        while (await User.findOne({ username: uniqueUsername })) {
          uniqueUsername = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
        }

        user = new User({
          name,
          username: uniqueUsername,
          email,
          googleId,
          isVerified: true,
          profileImage: picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
          role: 'reader'
        });

        await user.save();
      }
    }

    // Sign local JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      message: 'Google login successful!',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ error: 'Google login failed: ' + (error.response?.data?.error_description || error.message) });
  }
};
