module.exports = ({ managers }) => {
    return async ({ req, res, next, results }) => {
        const { __authenticate } = results;

        if (!__authenticate) {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 401,
                message: 'Authentication required'
            });
        }

        const moduleName = req.params.moduleName;
        const fnName = req.params.fnName;
        const method = req.method.toLowerCase();

        const methodToAction = {
            'get': 'read',      
            'post': 'create',   
            'put': 'create',    
            'patch': 'create',  
            'delete': 'create'  
        };

        let layer;
        let nodeId;

        // Handle different resources
        switch (moduleName) {
            case 'school':
                layer = 'school';
                nodeId = req.body.schoolId || req.query.schoolId;
                break;
            case 'classroom':
                layer = 'school.classroom';
                const schoolId = req.body.schoolId || req.query.schoolId;
                const classroomId = req.body.classroomId || req.query.classroomId;
                nodeId = classroomId ? `${schoolId}.${classroomId}` : schoolId;
                break;
            case 'student':
                layer = 'school.classroom.student';
                const studentSchoolId = req.body.schoolId || req.query.schoolId;
                const studentId = req.body.studentId || req.query.studentId;
                nodeId = studentId ? `${studentSchoolId}.${studentId}` : studentSchoolId;
                break;
            default:
                return managers.responseDispatcher.dispatch(res, {
                    ok: false,
                    code: 400,
                    message: 'Invalid resource type'
                });
        }

        if (__authenticate.role === 'superadmin') {
            return next({ authorized: true });
        }

        try {
            const hasAccess = await managers.shark.isGranted({
                layer,
                userId: __authenticate.userId,
                nodeId,
                action: methodToAction[method],
                isOwner: __authenticate.role === 'schoolAdmin' && 
                    __authenticate.schoolId === (req.body.schoolId || req.query.schoolId)
            });

            if (!hasAccess) {
                return managers.responseDispatcher.dispatch(res, {
                    ok: false,
                    code: 403,
                    message: 'Unauthorized - Insufficient permissions for this operation'
                });
            }

            next({ authorized: true });
        } catch (error) {
            console.error('Authorization error:', error);
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 500,
                message: 'Authorization check failed'
            });
        }
    };
};
