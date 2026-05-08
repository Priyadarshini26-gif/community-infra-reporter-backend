import express from 'express';
import {
  getAuthorityIssues,
  approveIssue,
  rejectIssue,
  getUserDetails,
  getPrioritySortedIssues
} from '../controllers/authority.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and local_authority role
router.use(protect);
router.use(authorize('local_authority'));

router.get('/issues', getAuthorityIssues);
router.get('/issues/priority/sorted', getPrioritySortedIssues);
router.get('/users/:userId', getUserDetails);
router.patch('/issues/:id/approve', approveIssue);
router.patch('/issues/:id/reject', rejectIssue);

export default router;
