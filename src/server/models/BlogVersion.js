import mongoose from 'mongoose';

const BlogVersionSchema = new mongoose.Schema({
  blogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  versionNumber: {
    type: Number,
    required: true
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const BlogVersion = mongoose.model('BlogVersion', BlogVersionSchema);
export default BlogVersion;
