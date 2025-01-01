const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../../../index');
const UserModel = require('../../../managers/entities/user/user.mongoModel');
const SchoolModel = require('../../../managers/entities/school/school.mongoModel');

describe('Auth Integration Tests', () => {
  let appInstance;
  let baseUrl;
  let testSchool;

  beforeAll(async () => {
    appInstance = await createApp({
      virtualStack: {
        preStack: ['__device', '__headers', '__authenticate', '__authorize']
      }
    });
    baseUrl = `http://localhost:${process.env.USER_PORT}`;
  });

  beforeEach(async () => {
    await mongoose.connection.collection('users').deleteMany({});
    await mongoose.connection.collection('schools').deleteMany({});
    
    testSchool = await SchoolModel.create({
      name: 'Test School',
      address: '123 Test St',
      profileInfo: {
        email: 'school@test.com',
        phone: '1234567890'
      }
    });
  });

  afterAll(async () => {
    if (appInstance.server) {
      await new Promise((resolve) => {
        appInstance.server.close(resolve);
      });
    }
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a superadmin', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          username: 'superadmin',
          password: 'password123',
          email: 'super@test.com',
          role: 'superadmin'
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('longToken');
      expect(response.body.data.username).toBe('superadmin');
      expect(response.body.data.role).toBe('superadmin');

      // Verify user was created in database
      const user = await UserModel.findById(response.body.data.id);
      expect(user).toBeTruthy();
      expect(user.role).toBe('superadmin');
    });

    it('should successfully register a school admin', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          username: 'schooladmin',
          password: 'password123',
          email: 'school@test.com',
          role: 'schoolAdmin',
          schoolId: testSchool._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('longToken');
      expect(response.body.data.username).toBe('schooladmin');
      expect(response.body.data.role).toBe('schoolAdmin');

      // Verify user was created in database with correct school association
      const user = await UserModel.findById(response.body.data.id);
      expect(user).toBeTruthy();
      expect(user.schoolId.toString()).toBe(testSchool._id.toString());
    });

    it('should fail registration when schoolId is missing for schoolAdmin', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          username: 'schooladmin',
          password: 'password123',
          email: 'school@test.com',
          role: 'schoolAdmin'
        });

      expect(response.status).toBe(422);
      expect(response.body.ok).toBe(false);
      expect(response.body.errors).toContain('schoolId: School ID is required for school administrators');
    });

    it('should fail registration with invalid role', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          username: 'invalid',
          password: 'password123',
          email: 'invalid@test.com',
          role: 'invalidRole'
        });

      expect(response.status).toBe(422);
      expect(response.body.ok).toBe(false);
    });

    it('should prevent duplicate username registration', async () => {
      await request(baseUrl)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'test1@test.com',
          role: 'superadmin'
        });

      const response = await request(baseUrl)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'test2@test.com',
          role: 'superadmin'
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toContain('Username or email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(baseUrl)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'test@test.com',
          role: 'superadmin'
        });
    });

    it('should successfully login with correct credentials', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('longToken');
      expect(response.body.data.username).toBe('testuser');
    });

    it('should fail login with incorrect password', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail login with non-existent username', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail login with missing username', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(422);
      expect(response.body.ok).toBe(false);
      expect(response.body.errors[0]).toContain('username');
    });

    it('should fail login with missing password', async () => {
      const response = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(422);
      expect(response.body.ok).toBe(false);
      expect(response.body.errors[0]).toContain('password');
    });

    it('should maintain authentication after successful login', async () => {
       await request(baseUrl)
        .post('/api/auth/register')
        .send({
            username: 'testuser',
            password: 'password123',
            email: 'test@test.com',
            role: 'superadmin'
      });

      const loginResponse = await request(baseUrl)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      const token = loginResponse.body.data.longToken;

      const protectedResponse = await request(baseUrl)
        .get('/api/school/getAllSchools')
        .set('Authorization', `Bearer ${token}`);

      expect(protectedResponse.status).toBe(200);
      expect(protectedResponse.body.ok).toBe(true);
    });
  });
});
