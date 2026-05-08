import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: [
      'electricity',
      'road',
      'garbage',
      'water',
      'sidewalk',
      'tree',
      'traffic',
      'other'
    ]
  },
  subcategory: {
    type: String,
    required: [true, 'Please select a subcategory']
  },
  title: {
    type: String,
    default: null,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: 2000
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Please provide location coordinates'],
      validate: {
        validator: function(v) {
          return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'rejected', 'approved', 'in-progress', 'resolved'],
    default: 'pending'
  },
  votes: {
    type: Number,
    default: 0,
    min: 0
  },
  voters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  rejectionReason: {
    type: String,
    default: null
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolutionImage: {
    type: String,
    default: null
  },
  resolutionNote: {
    type: String,
    default: null
  },
  imageUrl: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approvalDeadline: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create 2dsphere index for geospatial queries
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ createdBy: 1 });
issueSchema.index({ createdAt: 1 });

// Calculate priority score
issueSchema.methods.calculatePriority = function() {
  const daysSinceCreated = Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  const priorityScore = this.votes + daysSinceCreated;
  return priorityScore;
};

// Set approval deadline when status changes to pending/approved
issueSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'approved' && !this.approvalDeadline) {
    const deadline = new Date(this.createdAt);
    deadline.setDate(deadline.getDate() + 3);
    this.approvalDeadline = deadline;
  }
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Issue', issueSchema);
