const bcrypt = require('bcrypt');

module.exports = class AuthManager {
    constructor({ config, managers, mongomodels }) {
        this.config = config;
        this.tokenManager = managers.token;
        this.user = mongomodels.user;
        
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
            const user = new this.user({
                username,
                password: hashedPassword,
                email,
                role,
                ...(role === 'schoolAdmin' && { schoolId })
            });

            await user.save();

            if (role === 'schoolAdmin') {
                this.shark.addDirectAccess({
                    userId: user._id,
                    nodeId: schoolId,
                    action: 'create'
                });
            }

            // Generate tokens
            const longToken = this.tokenManager.genLongToken({
                userId: user._id,
                userKey: user.username,
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
            const user = await this.user.findOne({ username });
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
                userKey: user.username
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
