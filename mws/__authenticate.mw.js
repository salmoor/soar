module.exports = ({ managers, mongomodels }) => {
    const PUBLIC_ROUTES = [
        { module: 'auth', methods: ['register', 'login'] }
    ];

    return async ({ req, res, next, results }) => {
        const moduleName = req.params.moduleName;
        const fnName = req.params.fnName;

        const isPublicRoute = PUBLIC_ROUTES.some(route => 
            route.module === moduleName && route.methods.includes(fnName)
        );

        if (isPublicRoute) {
            return next({ isPublicRoute: true });
        }

        const { __headers } = results;
        const authHeader = __headers.authorization;

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
