import Issue from '../models/Issue.js';
import User from '../models/User.js';
import { config } from '../config/config.js';

// Helper function to convert meters to degrees (approximate)
// 1 degree ≈ 111 km
const metersToDegreesRadius = (meters) => {
  return meters / 111000;
};

// Helper function to check for duplicate issues
// IMPORTANT LOGIC: Check if same user has reported same category issue
// within 100m in last 24 hours that is not resolved
const checkDuplicateIssue = async (userId, category, coordinates) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const radiusDegrees = metersToDegreesRadius(config.DUPLICATE_CHECK_RADIUS);

  // Query: same user, same category, within 100m, created in last 24h, not resolved
  const duplicateIssue = await Issue.findOne({
    createdBy: userId,
    category: category,
    status: { $ne: 'resolved' },
    createdAt: { $gte: twentyFourHoursAgo },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: config.DUPLICATE_CHECK_RADIUS
      }
    }
  });

  return duplicateIssue;
};

// Helper function to find similar issues for user awareness
// Check: same category, within 100m (but different user or already resolved)
const findSimilarIssues = async (category, coordinates, userId) => {
  const radiusDegrees = metersToDegreesRadius(config.DUPLICATE_CHECK_RADIUS);

  const similarIssues = await Issue.find({
    category: category,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: config.DUPLICATE_CHECK_RADIUS
      }
    },
    $or: [
      { createdBy: { $ne: userId } },
      { status: 'resolved' }
    ]
  })
    .populate('createdBy', 'name email')
    .sort({ votes: -1, createdAt: -1 })
    .limit(5);

  return similarIssues;
};

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private
export const createIssue = async (req, res) => {
  try {
    const { description, category, subcategory, coordinates, imageUrl } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!description || !category || !subcategory || !coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (description, category, subcategory, coordinates)'
      });
    }

    // Validate coordinates format
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates format'
      });
    }

    // DUPLICATE DETECTION LOGIC
    // Check if user already reported this issue
    const duplicateIssue = await checkDuplicateIssue(userId, category, coordinates);

    if (duplicateIssue) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported a similar issue in this area within the last 24 hours',
        hasDuplicate: true,
        duplicateIssueId: duplicateIssue._id
      });
    }

    // Find similar issues to show user
    const similarIssues = await findSimilarIssues(category, coordinates, userId);

    // Create issue with GeoJSON location
    const issue = await Issue.create({
      description,
      category,
      subcategory,
      location: {
        type: 'Point',
        coordinates: coordinates
      },
      createdBy: userId,
      imageUrl
    });

    // Set approval deadline
    const approvalDeadline = new Date(issue.createdAt);
    approvalDeadline.setDate(approvalDeadline.getDate() + config.AUTHORITY_APPROVAL_DAYS);
    issue.approvalDeadline = approvalDeadline;
    await issue.save();

    res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      issue,
      similarIssues: similarIssues.length > 0 ? {
        found: true,
        count: similarIssues.length,
        issues: similarIssues,
        message: 'Similar issues already reported in this area. Please consider voting for existing issues instead.'
      } : {
        found: false,
        count: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all issues with filters and pagination
// @route   GET /api/issues
// @access  Public
export const getIssues = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 10, coordinates, radius = 5000 } = req.query;

    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;

    // Geospatial query if coordinates provided
    if (coordinates) {
      const [lng, lat] = coordinates.split(',').map(Number);
      if (lng && lat) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: parseInt(radius)
          }
        };
      }
    }

    const skip = (page - 1) * limit;

    const issues = await Issue.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Issue.countDocuments(query);

    res.status(200).json({
      success: true,
      count: issues.length,
      total,
      pages: Math.ceil(total / limit),
      issues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single issue
// @route   GET /api/issues/:id
// @access  Public
export const getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('createdBy', 'name email address area')
      .populate('assignedTo', 'name email')
      .populate('voters', 'name email');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    res.status(200).json({
      success: true,
      issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Vote on an issue
// @route   POST /api/issues/:id/vote
// @access  Private
export const voteOnIssue = async (req, res) => {
  try {
    const issueId = req.params.id;
    const userId = req.user._id;

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // VOTING LOGIC: Prevent duplicate voting
    // Check if user has already voted
    const hasVoted = issue.voters.includes(userId);

    if (hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this issue'
      });
    }

    // Add user to voters and increment votes
    issue.voters.push(userId);
    issue.votes += 1;
    await issue.save();

    res.status(200).json({
      success: true,
      message: 'Vote recorded successfully',
      issue: {
        id: issue._id,
        votes: issue.votes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get issues created by current user
// @route   GET /api/issues/user/my-issues
// @access  Private
export const getMyIssues = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const issues = await Issue.find({ createdBy: userId })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Issue.countDocuments({ createdBy: userId });

    res.status(200).json({
      success: true,
      count: issues.length,
      total,
      pages: Math.ceil(total / limit),
      issues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
