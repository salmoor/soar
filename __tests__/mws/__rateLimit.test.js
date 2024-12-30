const createApp = require('../../index');
const request = require('supertest');
const { MockCache } = require('../mocks/services');

describe('Rate Limiting Middleware', () => {
    let appInstance;
    let baseUrl;
    let mockCache;

    beforeAll(async () => {
        mockCache = new MockCache();
        appInstance = await createApp({
            virtualStack: {
                preStack: ['__device', '__headers', '__rateLimit']
            },
            cache: mockCache
        });
        baseUrl = `http://localhost:${process.env.USER_PORT}`;
    });

    afterAll(async () => {
        if (appInstance.server) {
            await new Promise((resolve) => {
                appInstance.server.close(resolve);
            });
        }
    });

    beforeEach(() => {
        mockCache.key.get.mockReset();
        mockCache.key.set.mockReset();
    });

    it('should allow requests within rate limit', async () => {
        const mockGet = mockCache.key.get.mockResolvedValue('5');
        const mockSet = mockCache.key.set;

        const response = await request(baseUrl)
            .get('/api/school/getAllSchools')
            .set('x-forwarded-for', '1.2.3.4');

        expect(mockGet).toHaveBeenCalled();
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
            data: '6'
        }));

        expect(response.status).not.toBe(429);
        expect(response.headers['x-ratelimit-limit']).toBe('10');
        expect(response.headers['x-ratelimit-remaining']).toBe('4');
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should block requests exceeding rate limit', async () => {
        mockCache.key.get.mockResolvedValue('10');

        const response = await request(baseUrl)
            .get('/api/school/getAllSchools')
            .set('x-forwarded-for', '1.2.3.4');

        expect(response.status).toBe(429);
        expect(response.body.message).toBe('Too Many Requests');
        expect(response.body.errors).toContain('Rate limit exceeded. Try again in 60 seconds');
    });

    it('should create new rate limit entry for first request', async () => {
        mockCache.key.get.mockResolvedValue(null);

        await request(baseUrl)
            .get('/api/school/getAllSchools')
            .set('x-forwarded-for', '1.2.3.4');

        expect(mockCache.key.set).toHaveBeenCalledWith(
            expect.objectContaining({
                data: '1',
                ttl: 60
            })
        );
    });

    it('should increment counter for subsequent requests', async () => {
        mockCache.key.get.mockResolvedValue('5');

        await request(baseUrl)
            .get('/api/school/getAllSchools')
            .set('x-forwarded-for', '1.2.3.4');

        expect(mockCache.key.set).toHaveBeenCalledWith(
            expect.objectContaining({
                data: '6'
            })
        );
    });

    it('should track requests separately for different endpoints', async () => {
        mockCache.key.get.mockResolvedValue('5');

        await Promise.all([
            request(baseUrl)
                .get('/api/school/getAllSchools')
                .set('x-forwarded-for', '1.2.3.4'),
            request(baseUrl)
                .get('/api/classroom/getAllClassrooms')
                .set('x-forwarded-for', '1.2.3.4')
        ]);

        const setCalls = mockCache.key.set.mock.calls;
        expect(setCalls[0][0].key).not.toBe(setCalls[1][0].key);
    });

    it('should track requests separately for different IPs', async () => {
        mockCache.key.get.mockResolvedValue('5');

        await Promise.all([
            request(baseUrl)
                .get('/api/school/getAllSchools')
                .set('x-forwarded-for', '1.2.3.4'),
            request(baseUrl)
                .get('/api/school/getAllSchools')
                .set('x-forwarded-for', '5.6.7.8')
        ]);

        const setCalls = mockCache.key.set.mock.calls;
        expect(setCalls[0][0].key).not.toBe(setCalls[1][0].key);
    });

    it('should continue processing if rate limit check fails', async () => {
        mockCache.key.get.mockRejectedValue(new Error('Cache error'));
        mockCache.key.set.mockRejectedValue(new Error('Cache error'));

        const response = await request(baseUrl)
            .get('/api/school/getAllSchools')
            .set('x-forwarded-for', '1.2.3.4');

        expect(mockCache.key.get).toHaveBeenCalled();
        
        expect(response.status).not.toBe(429);
        expect(response.status).toBe(200);
    });
});
