module.exports = {
    createStudent: [
        {
            model: 'text',
            required: true,
            path: 'firstName'
        },
        {
            model: 'text',
            required: true,
            path: 'lastName'
        },
        {
            model: 'email',
            required: true,
            path: 'email'
        },
        {
            model: 'schoolId',
            required: true,
        },
        {
            model: 'classroomId',
            required: false,
        }
    ],
    updateStudent: [
        {
            model: 'text',
            required: false,
            path: 'firstName'
        },
        {
            model: 'text',
            required: false,
            path: 'lastName'
        },
        {
            model: 'email',
            required: false,
            path: 'email'
        },
        {
            model: 'id',
            required: false,
            path: 'classroomId'
        }
    ],
    transferStudent: [
        {
            model: 'id',
            required: true,
            path: 'toSchoolId'
        },
        {
            model: 'text',
            required: false,
            path: 'reason'
        }
    ]
};
