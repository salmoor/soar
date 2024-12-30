module.exports = ({ managers }) => {
    return async ({ req, res, next, results }) => {
        const { __authenticate: user } = results;

        if (user.role === 'superadmin') {
            return next({ authorized: true });
        }

        const moduleName = req.params.moduleName;
        const method = req.method.toLowerCase();
        const requestedSchoolId = req.body.schoolId || req.query.schoolId;

        if (!requestedSchoolId || user.schoolId.toString() !== requestedSchoolId) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 403,
                message: 'Unauthorized - Can only access resources from your own school'
            });
        }

        switch (moduleName) {
            case 'school':
                if (['get', 'put'].includes(method)) {
                    return next({ authorized: true });
                }
                break;

            case 'classroom':
                return next({ authorized: true });

            case 'student':
                return next({ authorized: true });
        }

        return managers.responseDispatcher.dispatch(res, {
            ok: false,
            code: 403,
            message: 'Unauthorized - Insufficient permissions for this operation'
        });
    };
};
