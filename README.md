# A Community Driven Infrastructure Reporting And Prioritization Platform - Backend

Backend API service for the Community Driven Infrastructure Reporting & Prioritization Platform.

Provides authentication, issue management, voting, approval workflows, and resolution tracking.

## Features

### Authentication
- User Registration
- Login Authentication
- JWT Token Generation
- Password Hashing using bcryptjs
- Role-Based Authorization

### Issue Management
- Create Issues
- Retrieve Issues
- Update Issue Status
- Issue Categorization
- Geospatial Location Storage

### Duplicate Detection
- Same User Detection
- Category Matching
- Geographic Proximity Validation
- Time-Based Duplicate Prevention

### Voting System
- Community Voting
- One Vote Per User
- Priority Score Calculation

### Authority Workflow
- Approve Issues
- Reject Issues
- Assign Issues

### Government Workflow
- Update Progress
- Upload Resolution Images
- Add Resolution Notes
- Mark Issues as Resolved

## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT
- bcryptjs
- Multer
- CORS
- dotenv

## Installation

### Clone Repository

git clone <backend-repository-url>

cd backend

### Install Dependencies

npm install

## Environment Variables

Create a `.env` file.

PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key

JWT_EXPIRE=7d

CLIENT_URL=http://localhost:5173

## Run Server

npm start

or

npm run dev

Server runs on:

http://localhost:5000

## API Endpoints

### Authentication

POST /api/auth/register

POST /api/auth/login

### Issues

GET /api/issues

GET /api/issues/:id

POST /api/issues

PUT /api/issues/:id

DELETE /api/issues/:id

POST /api/issues/:id/vote

### Authority

GET /api/authority/issues

PUT /api/authority/approve/:id

PUT /api/authority/reject/:id

### Government

GET /api/govt/issues

PUT /api/govt/update-status/:id

POST /api/govt/upload-proof/:id

## Database Collections

### Users

- Name
- Email
- Password
- Role
- Area

### Issues

- Title
- Description
- Category
- Location
- Status
- Votes
- Priority Score
- Resolution Notes

### Votes

- User ID
- Issue ID

## Security

- JWT Authentication
- Password Hashing
- Role-Based Access Control
- Input Validation
- Secure Environment Variables

## Geospatial Features

MongoDB 2dsphere Index

Supports:
- Nearby Issue Search
- Duplicate Detection
- Location-Based Filtering

## Performance Features

- Indexed Queries
- Geospatial Search Optimization
- Stateless Authentication
- Scalable API Design

## Deployment

Backend Deployment:

https://crs-backend-o2de.onrender.com

## Testing

### Unit Testing
- Authentication
- Duplicate Detection
- Voting Logic

### Integration Testing
- Registration Flow
- Login Flow
- Issue Reporting Workflow

### System Testing
- Citizen Workflow
- Authority Workflow
- Government Workflow

## Future Enhancements

- Redis Caching
- WebSocket Notifications
- AI-Based Duplicate Detection
- Microservice Architecture
