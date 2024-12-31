const jwt = require('jsonwebtoken');
const TokenManager = require('../../../managers/token/Token.manager');

describe('TokenManager', () => {
    let tokenManager;
    const mockConfig = {
        dotEnv: {
            LONG_TOKEN_SECRET: 'test-long-secret',
            SHORT_TOKEN_SECRET: 'test-short-secret'
        }
    };

    beforeEach(() => {
        tokenManager = new TokenManager({ config: mockConfig });
    });

    describe('genLongToken', () => {
        it('should generate a valid long token with correct payload', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser'
            };

            const token = tokenManager.genLongToken(payload);
            const decoded = jwt.verify(token, mockConfig.dotEnv.LONG_TOKEN_SECRET);

            expect(decoded.userId).toBe(payload.userId);
            expect(decoded.userKey).toBe(payload.userKey);
            expect(decoded.exp).toBeDefined();
        });

        it('should set expiration to 3 years', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser'
            };

            const token = tokenManager.genLongToken(payload);
            const decoded = jwt.verify(token, mockConfig.dotEnv.LONG_TOKEN_SECRET);

            const threeYearsInSeconds = 3 * 365 * 24 * 60 * 60;
            const now = Math.floor(Date.now() / 1000);
            
            const tolerance = 24 * 60 * 60;
            expect(decoded.exp).toBeGreaterThan(now + threeYearsInSeconds - tolerance);
            expect(decoded.exp).toBeLessThan(now + threeYearsInSeconds + tolerance);
        });
    });

    describe('verifyLongToken', () => {
        it('should verify a valid long token', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser'
            };

            const token = tokenManager.genLongToken(payload);
            const verified = tokenManager.verifyLongToken({ token });

            expect(verified.userId).toBe(payload.userId);
            expect(verified.userKey).toBe(payload.userKey);
        });

        it('should return null for an invalid token', () => {
            const invalidToken = 'invalid.token.here';
            const verified = tokenManager.verifyLongToken({ token: invalidToken });

            expect(verified).toBeNull();
        });

        it('should return null for a token signed with wrong secret', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser'
            };

            const token = jwt.sign(payload, 'wrong-secret');
            const verified = tokenManager.verifyLongToken({ token });

            expect(verified).toBeNull();
        });

        it('should return null for an expired token', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser'
            };

            const token = jwt.sign(payload, mockConfig.dotEnv.LONG_TOKEN_SECRET, {
                expiresIn: '-1h'
            });

            const verified = tokenManager.verifyLongToken({ token });
            expect(verified).toBeNull();
        });
    });

    describe('genShortToken', () => {
        it('should generate a valid short token with correct payload', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser',
                sessionId: 'sess123',
                deviceId: 'dev456'
            };

            const token = tokenManager.genShortToken(payload);
            const decoded = jwt.verify(token, mockConfig.dotEnv.SHORT_TOKEN_SECRET);

            expect(decoded.userId).toBe(payload.userId);
            expect(decoded.userKey).toBe(payload.userKey);
            expect(decoded.sessionId).toBe(payload.sessionId);
            expect(decoded.deviceId).toBe(payload.deviceId);
            expect(decoded.exp).toBeDefined();
        });

        it('should set expiration to 1 year', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser',
                sessionId: 'sess123',
                deviceId: 'dev456'
            };

            const token = tokenManager.genShortToken(payload);
            const decoded = jwt.verify(token, mockConfig.dotEnv.SHORT_TOKEN_SECRET);

            const oneYearInSeconds = 365 * 24 * 60 * 60;
            const now = Math.floor(Date.now() / 1000);
            
            const tolerance = 24 * 60 * 60;
            expect(decoded.exp).toBeGreaterThan(now + oneYearInSeconds - tolerance);
            expect(decoded.exp).toBeLessThan(now + oneYearInSeconds + tolerance);
        });
    });

    describe('verifyShortToken', () => {
        it('should verify a valid short token', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser',
                sessionId: 'sess123',
                deviceId: 'dev456'
            };

            const token = tokenManager.genShortToken(payload);
            const verified = tokenManager.verifyShortToken({ token });

            expect(verified.userId).toBe(payload.userId);
            expect(verified.userKey).toBe(payload.userKey);
            expect(verified.sessionId).toBe(payload.sessionId);
            expect(verified.deviceId).toBe(payload.deviceId);
        });

        it('should return null for an invalid token', () => {
            const invalidToken = 'invalid.token.here';
            const verified = tokenManager.verifyShortToken({ token: invalidToken });

            expect(verified).toBeNull();
        });

        it('should return null for a token signed with wrong secret', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser',
                sessionId: 'sess123',
                deviceId: 'dev456'
            };

            const token = jwt.sign(payload, 'wrong-secret');
            const verified = tokenManager.verifyShortToken({ token });

            expect(verified).toBeNull();
        });

        it('should return null for an expired token', () => {
            const payload = {
                userId: '123',
                userKey: 'testUser',
                sessionId: 'sess123',
                deviceId: 'dev456'
            };

            const token = jwt.sign(payload, mockConfig.dotEnv.SHORT_TOKEN_SECRET, {
                expiresIn: '-1h'
            });

            const verified = tokenManager.verifyShortToken({ token });
            expect(verified).toBeNull();
        });
    });
});
