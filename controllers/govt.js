import Issue from '../models/Issue.js';

// @desc    Get assigned issues for govt official
// @route   GET /api/govt/issues
// @access  Private (govt_official)
export const getGovtIssues = async (req, res) => {
  try {
    const govtOfficialId = req.user._id;
    const { status = 'in-progress', page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    // Show issues that are either:
    // 1. Assigned to this official, OR
    // 2. Approved but not yet assigned to anyone (previous issues)
    const query = {
      $or: [
        { assignedTo: govtOfficialId, status: { $in: ['approved', 'in-progress', 'resolved'] } },
        { status: 'approved', assignedTo: null }
      ],
      status: status || { $in: ['approved', 'in-progress'] }
    };

    const issues = await Issue.find(query)
      .populate('createdBy', 'name email address phone')
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
      issues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update issue status (mark in-progress or resolved)
// @route   PATCH /api/govt/issues/:id/status
// @access  Private (govt_official)
export const updateIssueStatus = async (req, res) => {
  try {
    const issueId = req.params.id;
    const { status, resolutionNote, resolutionImage } = req.body;
    const govtOfficialId = req.user._id;

    // Validate status
    const validStatuses = ['in-progress', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed: in-progress, resolved'
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check if issue is assigned to this official
    // Auto-assign if not already assigned, or check if assigned to this official
    if (!issue.assignedTo) {
      issue.assignedTo = govtOfficialId;
    } else if (!issue.assignedTo.equals(govtOfficialId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this issue'
     });
    }

    // Check if issue is approved before updating to in-progress or resolved
    if (issue.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Issue must be approved first'
      });
    }

    // Update status
    issue.status = status;

    // If resolved, add resolution details
    if (status === 'resolved') {
      if (!resolutionNote) {
        return res.status(400).json({
          success: false,
          message: 'Resolution note is required to mark as resolved'
        });
      }
      issue.resolutionNote = resolutionNote;
      if (resolutionImage) {
        issue.resolutionImage = resolutionImage;
      }
    }

    await issue.save();

    res.status(200).json({
      success: true,
      message: `Issue marked as ${status}`,
      issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assign issue to govt official (authority or admin function)
// @route   PATCH /api/govt/issues/:id/assign
// @access  Private (local_authority or admin)
export const assignIssueToGovt = async (req, res) => {
  try {
    const issueId = req.params.id;
    const { govtOfficialId } = req.body;

    if (!govtOfficialId) {
      return res.status(400).json({
        success: false,
        message: 'Government official ID is required'
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Only approved issues can be assigned
    if (issue.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved issues can be assigned'
      });
    }

    issue.assignedTo = govtOfficialId;
    await issue.save();

    res.status(200).json({
      success: true,
      message: 'Issue assigned successfully',
      issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get resolved issues statistics
// @route   GET /api/govt/statistics
// @access  Private (govt_official)
export const getStatistics = async (req, res) => {
  try {
    const govtOfficialId = req.user._id;

    // Get stats for issues assigned to this official
    const totalIssues = await Issue.countDocuments({ assignedTo: govtOfficialId });
    const resolvedIssues = await Issue.countDocuments({ 
      assignedTo: govtOfficialId, 
      status: 'resolved' 
    });
    const inProgressIssues = await Issue.countDocuments({ 
      assignedTo: govtOfficialId, 
      status: 'in-progress' 
    });

    const resolutionRate = totalIssues > 0 ? ((resolvedIssues / totalIssues) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      statistics: {
        totalIssues,
        resolvedIssues,
        inProgressIssues,
        resolutionRate: `${resolutionRate}%`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
