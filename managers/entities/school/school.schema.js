module.exports = {
    createSchool: [
        {
            model: 'longText',
            required: true,
            path: 'name'
        },
        {
            model: 'longText',
            required: true,
            path: 'address'
        },
        {
            model: 'email',
            required: false,
            path: 'profileInfo.email'
        },
        {
            model: 'phone',
            required: false,
            path: 'profileInfo.phone'
        }
    ],
    updateSchool: [
        {
            model: 'longText',
            required: true,
            path: 'name'
        },
        {
            model: 'longText',
            required: true,
            path: 'address'
        },
        {
            model: 'email',
            required: false,
            path: 'profileInfo.email'
        },
        {
            model: 'phone',
            required: false,
            path: 'profileInfo.phone'
        }
    ]
};
