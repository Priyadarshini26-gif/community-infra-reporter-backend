import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { config } from './config/config.js';

// Import routes
import authRoutes from './routes/auth.js';
import issuesRoutes from './routes/issues.js';
import authorityRoutes from './routes/authority.js';
import govtRoutes from './routes/govt.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Connect to database
connectDB();

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API is working"
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/authority', authorityRoutes);
app.use('/api/govt', govtRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
