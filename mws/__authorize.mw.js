module.exports = ({ managers, mongomodels }) => {
    return async ({ req, res, next, results }) => {
        if (results.__authenticate && results.__authenticate.isPublicRoute) {
            return next({ authorized: true });
        }

        const user = results.__authenticate;

        if (user.role === 'superadmin') {
            return next({ authorized: true });
        }

        const moduleName = req.params.moduleName;
        const method = req.method.toLowerCase();
        let requestedSchoolId = req.body.schoolId || req.query.schoolId;

        if ((req.query.classroomId || req.body.classroomId) && !requestedSchoolId) {
            const classroomId = req.query.classroomId || req.body.classroomId;
            const classroom = await mongomodels.classroom.findById(classroomId);
            requestedSchoolId = classroom.schoolId.toString();
        }

        if ((req.query.studentId || req.body.studentId) && !requestedSchoolId) {
            const studentId = req.query.studentId || req.body.studentId;
            const student = await mongomodels.student.findById(studentId);
            requestedSchoolId = student.schoolId.toString();
        }

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
