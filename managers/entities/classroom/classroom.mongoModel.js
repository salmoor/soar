const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  resources: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Classroom', ClassroomSchema);
