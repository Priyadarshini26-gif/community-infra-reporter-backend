import Issue from '../models/Issue.js';
import User from '../models/User.js';

// @desc    Get issues in authority's assigned area
// @route   GET /api/authority/issues
// @access  Private (local_authority)
export const getAuthorityIssues = async (req, res) => {
  try {
    const authorityId = req.user._id;
    const assignedArea = req.user.assignedArea;
    const { status = 'pending', page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    // If no assigned area, show all pending issues as fallback
    // This allows authorities to access the dashboard even if area isn't set yet
    const query = {
      status: status || { $in: ['pending', 'approved'] }
    };

    // Note: Geospatial filtering by assignedArea would go here if area-based querying is required
    // For now, returning all issues in the status allows basic functionality

    const issues = await Issue.find(query)
      .populate('createdBy', 'name email address area phone')
      .populate('voters', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Issue.countDocuments(query);

    res.status(200).json({
      success: true,
      count: issues.length,
      total,
      pages: Math.ceil(total / limit),
      assignedArea: assignedArea || 'Not assigned yet',
      issues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve an issue
// @route   PATCH /api/authority/issues/:id/approve
// @access  Private (local_authority)
export const approveIssue = async (req, res) => {
  try {
    const issueId = req.params.id;
    const authorityId = req.user._id;

    const issue = await Issue.findById(issueId).populate('createdBy');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    if (issue.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending issues can be approved'
      });
    }

    // Find a government official to assign this issue to
    const govtOfficial = await User.findOne({ role: 'govt_official' });
    
    if (!govtOfficial) {
      return res.status(400).json({
        success: false,
        message: 'No government official available to assign this issue'
      });
    }

    // Update issue status and assign to govt official
    issue.status = 'approved';
    issue.approvedAt = new Date();
    issue.assignedTo = govtOfficial._id;  // ← THIS LINE IS NEW

    // Set approval deadline (3 days from creation)
    const approvalDeadline = new Date(issue.createdAt);
    approvalDeadline.setDate(approvalDeadline.getDate() + 3);
    issue.approvalDeadline = approvalDeadline;

    await issue.save();

    res.status(200).json({
      success: true,
      message: 'Issue approved and assigned to government official',
      issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reject an issue
// @route   PATCH /api/authority/issues/:id/reject
// @access  Private (local_authority)
export const rejectIssue = async (req, res) => {
  try {
    const issueId = req.params.id;
    const { rejectionReason } = req.body;
    const authorityId = req.user._id;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    if (issue.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending issues can be rejected'
      });
    }

    // Update issue status
    issue.status = 'rejected';
    issue.rejectionReason = rejectionReason;

    await issue.save();

    res.status(200).json({
      success: true,
      message: 'Issue rejected successfully',
      issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user details (for authority to view complaint author)
// @route   GET /api/authority/users/:userId
// @access  Private (local_authority)
export const getUserDetails = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).select('-password -otpCode -otpExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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

// @desc    Get priority-sorted issues (helper for dashboard)
// @route   GET /api/authority/issues/priority/sorted
// @access  Private (local_authority)
export const getPrioritySortedIssues = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get pending and approved issues
    const issues = await Issue.find({
      status: { $in: ['pending', 'approved'] }
    })
      .populate('createdBy', 'name email')
      .lean();

    // Calculate priority for each issue and sort
    const issuesWithPriority = issues.map(issue => ({
      ...issue,
      priority: issue.votes + Math.floor((Date.now() - issue.createdAt) / (1000 * 60 * 60 * 24))
    }));

    issuesWithPriority.sort((a, b) => b.priority - a.priority);

    const paginatedIssues = issuesWithPriority.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      count: paginatedIssues.length,
      total: issuesWithPriority.length,
      pages: Math.ceil(issuesWithPriority.length / limit),
      issues: paginatedIssues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
