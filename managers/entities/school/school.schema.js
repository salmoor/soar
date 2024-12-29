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
            path: 'contactInfo.email'
        },
        {
            model: 'phone',
            required: false,
            path: 'contactInfo.phone'
        }
    ],
    updateSchool: [
        {
            model: 'text',
            required: false,
            path: 'name'
        },
        {
            model: 'longText',
            required: false,
            path: 'address'
        },
        {
            model: 'email',
            required: false,
            path: 'contactInfo.email'
        },
        {
            model: 'phone',
            required: false,
            path: 'contactInfo.phone'
        }
    ]
};
