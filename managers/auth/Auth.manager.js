const bcrypt = require('bcrypt');

module.exports = class AuthManager {
    constructor({ config, managers, validators, mongomodels }) {
        this.config = config;
        this.tokenManager = managers.token;
        this.validators = validators;
        this.user = mongomodels.user;

        this.httpExposed = [
            'post=register',
            'post=login'
        ];
    }

    async register({ ...requestData }) {
        try {
            const validator = this.validators.auth.register;
            const validationResult = await validator(requestData);

            if (validationResult && validationResult.length > 0) {
                const errors = validationResult.map(err => `${err.label}: ${err.message}`);
                return {
                    ok: false,
                    message: 'Validation failed',
                    code: 422,
                    errors
                };
            }

            if (requestData.role === 'schoolAdmin' && !requestData.schoolId) {
                return {
                    ok: false,
                    message: 'Validation failed',
                    code: 422,
                    errors: ['schoolId: School ID is required for school administrators']
                };
            }

            const hashedPassword = await bcrypt.hash(requestData.password, 10);

            const userData = {
                username: requestData.username,
                password: hashedPassword,
                email: requestData.email,
                role: requestData.role,
                ...(requestData.schoolId && { schoolId: requestData.schoolId })
            };

            const user = new this.user(userData);
            await user.save();

            const longToken = this.tokenManager.genLongToken({
                userId: user._id,
                userKey: user.username
            });

            return {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                longToken
            };
        } catch (error) {
            console.error('Registration error:', error);
            if (error.code === 11000) {
                return { error: 'Username or email already exists' };
            }
            return { error: 'Registration failed' };
        }
    }

    async login({ ...requestData }) {
        try {
            const validator = this.validators.auth.login;
            const validationResult = await validator(requestData);

            if (validationResult && validationResult.length > 0) {
                const errors = validationResult.map(err => `${err.label}: ${err.message}`);
                return {
                    ok: false,
                    message: 'Validation failed',
                    code: 422,
                    errors
                };
            }

            const user = await this.user.findOne({ username: requestData.username });
            if (!user) {
                return { error: 'Invalid credentials' };
            }

            const validPassword = await bcrypt.compare(requestData.password, user.password);
            if (!validPassword) {
                return { error: 'Invalid credentials' };
            }

            const longToken = this.tokenManager.genLongToken({
                userId: user._id,
                userKey: user.username
            });

            return {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                longToken
            };
        } catch (error) {
            console.error('Login error:', error);
            return { error: 'Login failed' };
        }
    }
};
