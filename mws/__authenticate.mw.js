module.exports = ({ managers, mongomodels }) => {
    return async ({ req, res, next }) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                message: 'Authorization header with Bearer token required'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = managers.token.verifyLongToken({ token });
        
        if (!decoded) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                message: 'Invalid token'
            });
        }

        const user = await mongomodels.user.findById(decoded.userId);
        if (!user) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                message: 'User not found'
            });
        }

        next(user);
    };
};
