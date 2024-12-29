const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['superadmin', 'schoolAdmin'], required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: false },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
