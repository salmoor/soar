const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    schoolId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'School', 
        required: true 
    },
    classroomId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Classroom',
        required: false
    },
    firstName: { 
        type: String, 
        required: true 
    },
    lastName: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true,
        unique: true
    },
    dateOfBirth: { 
        type: Date, 
        required: true 
    },
    enrollmentDate: { 
        type: Date, 
        default: Date.now 
    },
    // Track student transfers
    transferHistory: [{
        fromSchool: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
        toSchool: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
        date: { type: Date, default: Date.now },
        reason: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
