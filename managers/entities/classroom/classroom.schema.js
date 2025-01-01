module.exports = {
    createClassroom: [
        {
            model: 'longText',
            required: true,
            path: 'name'
        },
        {
            model: 'number',
            required: true,
            path: 'capacity'
        },
        {
            model: 'arrayOfStrings',
            required: false,
            path: 'resources'
        },
        {
            model: 'schoolId',
            required: true
        }
    ],
    updateClassroom: [
        {
            model: 'longText',
            required: false,
            path: 'name'
        },
        {
            model: 'number',
            required: false,
            path: 'capacity'
        },
        {
            model: 'arrayOfStrings',
            required: false,
            path: 'resources'
        }
    ],
    manageCapacity: [
        {
            model: 'id',
            required: true,
            path: 'classroomId'
        },
        {
            model: 'number',
            required: true,
            path: 'newCapacity'
        }
    ],
    manageResources: [
        {
            model: 'id',
            required: true,
            path: 'classroomId'
        },
        {
            model: 'text',
            required: true,
            path: 'action',
            oneOf: ['add', 'remove', 'set']
        },
        {
            model: 'arrayOfStrings',
            required: true,
            path: 'resources'
        }
    ]
};
