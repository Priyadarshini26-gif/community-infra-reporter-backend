import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRE });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, address, area, role, assignedArea } = req.body;

    // Validate input
    if (!name || !email || !password || !address || !area) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    // Validate assignedArea for authority users
    if (role === 'local_authority' && !assignedArea) {
      return res.status(400).json({ 
        success: false, 
        message: 'Assigned area is required for local authorities' 
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Create user
    user = await User.create({
      name,
      email,
      password,
      address,
      area,
      role: role || 'user',
      assignedArea: role === 'local_authority' ? assignedArea : null,
      emailVerified: true // Mock verification - in production, send OTP
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        area: user.area,
        ...(user.role === 'local_authority' && { assignedArea: user.assignedArea })
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    // Check user
    let user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        area: user.area,
        ...(user.role === 'local_authority' && { assignedArea: user.assignedArea })
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
