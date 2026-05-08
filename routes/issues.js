import express from 'express';
import {
  createIssue,
  getIssues,
  getIssueById,
  voteOnIssue,
  getMyIssues
} from '../controllers/issues.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getIssues);
router.get('/:id', getIssueById);

// Protected routes
router.post('/', protect, createIssue);
router.post('/:id/vote', protect, voteOnIssue);
router.get('/user/my-issues', protect, getMyIssues);

export default router;
