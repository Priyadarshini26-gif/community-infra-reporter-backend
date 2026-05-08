import express from 'express';
import {
  getGovtIssues,
  updateIssueStatus,
  assignIssueToGovt,
  getStatistics
} from '../controllers/govt.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and govt_official role
router.use(protect);
router.use(authorize('govt_official'));

router.get('/issues', getGovtIssues);
router.get('/statistics', getStatistics);
router.patch('/issues/:id/status', updateIssueStatus);
router.patch('/issues/:id/assign', assignIssueToGovt);

export default router;
