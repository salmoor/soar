module.exports = ({ cache, managers }) => {
    const WINDOW_SIZE_IN_SECONDS = 60;
    const MAX_REQUESTS_PER_WINDOW = 10;

    return async ({ req, res, next, results }) => {

        const { ip } = results.__device
        const endpoint = `${req.method}:${req.path}`;
        const rateLimitKey = `ratelimit:${ip}:${endpoint}`;

        try {
            const currentCount = parseInt(await cache.key.get({ key: rateLimitKey })) || 0;

            if (currentCount >= MAX_REQUESTS_PER_WINDOW) {
                return managers.responseDispatcher.dispatch(res, {
                    ok: false,
                    code: 429,
                    message: 'Too Many Requests',
                    errors: [`Rate limit exceeded. Try again in ${WINDOW_SIZE_IN_SECONDS} seconds`]
                });
            }

            if (currentCount === 0) {
                await cache.key.set({
                    key: rateLimitKey,
                    data: '1',
                    ttl: WINDOW_SIZE_IN_SECONDS
                });
            } else {
                await cache.key.set({
                    key: rateLimitKey,
                    data: (currentCount + 1).toString(),
                    ttl: WINDOW_SIZE_IN_SECONDS
                });
            }

            res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
            res.setHeader('X-RateLimit-Remaining', MAX_REQUESTS_PER_WINDOW - (currentCount + 1));
            res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + WINDOW_SIZE_IN_SECONDS);

            next();
        } catch (error) {
            console.error('Rate limiting error:', error);
            next();
        }
    };
};
