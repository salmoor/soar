const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config({
    path: '.env.test'
});
const SchoolModel = require('../../managers/entities/school/school.mongoModel');
const UserModel = require('../../managers/entities/user/user.mongoModel');


const generateMockToken = (payload) => { 
    return jwt.sign(
        payload,
        dotenv.LONG_TOKEN_SECRET,
        { expiresIn: '1h' }
    );
};

const createMockUser = async (role = 'schooladmin', schoolId = null) => {
    const user = new UserModel({
        username: `test-${Date.now()}`,
        email: `test-${Date.now()}@test.com`,
        password: 'password123',
        role,
        ...(schoolId && { schoolId })
    });
    await user.save();
    return user;
};

const createMockSchool = async (name = 'Test School') => {
    const school = new SchoolModel({
        name,
        address: '123 Test St',
        profileInfo: {
            email: 'test@school.com',
            phone: '1234567890'
        }
    });
    await school.save();
    return school;
};

module.exports = {
    generateMockToken,
    createMockUser,
    createMockSchool
};
