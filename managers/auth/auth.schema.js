module.exports = {
    register: [
        {
            model: 'username',
            required: true
        },
        {
            model: 'password',
            required: true
        },
        {
            model: 'email',
            required: true
        },
        {
            model: 'text',
            path: 'role',
            required: true,
            oneOf: ['superadmin', 'schoolAdmin']
        },
        {
            model: 'schoolId',
            required: false,
            depends: {
                path: 'role',
                is: 'schoolAdmin',
                then: { required: true }
            },
            message: 'School ID is required for school administrators'
        }
    ],
    login: [
        {
            model: 'username',
            required: true
        },
        {
            model: 'password',
            required: true
        }
    ]
};
