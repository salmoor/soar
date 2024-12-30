const mongoose = require('mongoose');
const createApp = require('../../index');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { generateMockToken } = require('../utils/testUtils');
const UserModel = require('../../managers/entities/user/user.mongoModel');
const dotenv = require('dotenv').config({
    path: process.env.NODE_ENV === 'test' 
        ? '.env.test'
        : '.env'
});

describe('Authentication Middleware', () => {
  let appInstance;
  let baseUrl;

  beforeAll(async () => {
    appInstance = await createApp();
    baseUrl = `http://localhost:${dotenv.parsed.USER_PORT}`;
  });

  beforeEach(async () => {
    await mongoose.connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    if (appInstance.server) {
      await new Promise((resolve) => {
        appInstance.server.close(resolve);
      });
    }
  });

  it('should reject requests without authorization header', async () => {
    const response = await request(baseUrl)
      .get('/api/school/getAllSchools');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authorization header with Bearer token required');
  });

  it('should reject invalid tokens', async () => {
    const response = await request(baseUrl)
      .get('/api/school/getAllSchools')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid token');
  });

  it('should reject expired tokens', async () => {
    const expiredToken = jwt.sign(
      { userId: '123', role: 'superadmin' },
      'test-secret',
      { expiresIn: '0s' }
    );

    const response = await request(baseUrl)
      .get('/api/school/getAllSchools')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });

  it('should accept valid tokens and authenticate user', async () => {
    const user = new UserModel({
      username: 'testuser',
      email: 'test@test.com',
      password: 'password123',
      role: 'superadmin'
    });
    await user.save();

    const token = appInstance.managers.token.genLongToken({userId: user._id, userKey: user.role})

    const response = await request(baseUrl)
      .get('/api/school/getAllSchools')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).not.toBe(401);
  });

  it('should reject tokens for non-existent users', async () => {
    const nonExistentUserId = new mongoose.Types.ObjectId();
    const token = appInstance.managers.token.genLongToken({
      userId: nonExistentUserId,
      userKey: 'test'
    });

    const response = await request(baseUrl)
      .get('/api/school/getAllSchools')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('User not found');
  });

});
