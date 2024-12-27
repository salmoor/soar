const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['superadmin', 'schoolAdmin'], required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: false }, // Only required for schoolAdmin
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

module.exports = class AuthManager {
    constructor({ config, managers }) {
        this.config = config;
        this.tokenManager = managers.token;
        
        // Expose HTTP endpoints
        this.httpExposed = [
            'register',
            'login'
        ];
    }

    async register({ username, password, email, role, schoolId }) {
        try {
            // Validate role
            if (!['superadmin', 'schoolAdmin'].includes(role)) {
                return { error: 'Invalid role' };
            }

            // If schoolAdmin, schoolId is required
            if (role === 'schoolAdmin' && !schoolId) {
                return { error: 'School ID is required for school administrators' };
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            const user = new User({
                username,
                password: hashedPassword,
                email,
                role,
                ...(role === 'schoolAdmin' && { schoolId })
            });

            await user.save();

            // Generate tokens
            const longToken = this.tokenManager.genLongToken({
                userId: user._id,
                userKey: user.role,
                role: user.role,
                ...(user.schoolId && { schoolId: user.schoolId })
            });

            return {
                message: 'User registered successfully',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                longToken
            };
        } catch (error) {
            console.error('Registration error:', error);
            if (error.code === 11000) { // Duplicate key error
                return { error: 'Username or email already exists' };
            }
            return { error: 'Registration failed' };
        }
    }

    async login({ username, password }) {
        try {
            // Find user
            const user = await User.findOne({ username });
            if (!user) {
                return { error: 'Invalid credentials' };
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return { error: 'Invalid credentials' };
            }

            // Generate tokens
            const longToken = this.tokenManager.genLongToken({
                userId: user._id,
                userKey: user.role,
                role: user.role,
                ...(user.schoolId && { schoolId: user.schoolId })
            });

            return {
                message: 'Login successful',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                longToken
            };
        } catch (error) {
            console.error('Login error:', error);
            return { error: 'Login failed' };
        }
    }
}
