const mongoose = require('mongoose');
const createApp = require('../../index');
const request = require('supertest');
const { generateMockToken, createMockUser, createMockSchool } = require('../utils/testUtils');
const UserModel = require('../../managers/entities/user/user.mongoModel');
const SchoolModel = require('../../managers/entities/school/school.mongoModel');

describe('Authorization Middleware', () => {
  let appInstance;
  let baseUrl;
  let superadminUser;
  let schoolAdminUser;
  let school;

  beforeAll(async () => {
    appInstance = await createApp();
    baseUrl = `http://localhost:${process.env.USER_PORT}`;
  });

  beforeEach(async () => {
    await mongoose.connection.collection('users').deleteMany({});
    await mongoose.connection.collection('schools').deleteMany({});

    school = await createMockSchool('Test School');
    superadminUser = await createMockUser('superadmin');
    schoolAdminUser = await createMockUser('schoolAdmin', school._id);
  });

  afterAll(async () => {
    if (appInstance.server) {
      await new Promise((resolve) => {
        appInstance.server.close(resolve);
      });
    }
    await mongoose.connection.close();
  });

  describe('Superadmin Access', () => {
    it('should allow superadmin to access any school resource', async () => {
      const token = appInstance.managers.token.genLongToken({
        userId: superadminUser._id,
        userKey: superadminUser.username
      });

      const response = await request(baseUrl)
        .get(`/api/school/getSchool?schoolId=${school._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).not.toBe(403);
      expect(response.body.ok).toBe(true);
    });

    it('should allow superadmin to modify any school resource', async () => {
      const token = appInstance.managers.token.genLongToken({
        userId: superadminUser._id,
        userKey: superadminUser.username
      });

      const response = await request(baseUrl)
        .put(`/api/school/updateSchool`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          schoolId: school._id,
          name: 'Updated School Name'
        });

      expect(response.status).not.toBe(403);
      expect(response.body.ok).toBe(true);
    });
  });

  describe('School Admin Access', () => {
    it('should allow school admin to access their own school', async () => {
      const token = appInstance.managers.token.genLongToken({
        userId: schoolAdminUser._id,
        userKey: schoolAdminUser.username
      });

      const response = await request(baseUrl)
        .get(`/api/school/getSchool?schoolId=${school._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).not.toBe(403);
      expect(response.body.ok).toBe(true);
    });

    it('should deny school admin access to other schools', async () => {
      const otherSchool = await createMockSchool('Other School');
      const token = appInstance.managers.token.genLongToken({
        userId: schoolAdminUser._id,
        userKey: schoolAdminUser.username
      });

      const response = await request(baseUrl)
        .get(`/api/school/getSchool?schoolId=${otherSchool._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should allow school admin to manage classrooms in their school', async () => {
      const token = appInstance.managers.token.genLongToken({
        userId: schoolAdminUser._id,
        userKey: schoolAdminUser.username
      });

      const response = await request(baseUrl)
        .post('/api/classroom/createClassroom')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Classroom',
          capacity: 30,
          schoolId: school._id.toString()
        });

      expect(response.status).not.toBe(403);
      expect(response.body.ok).toBe(true);
    });

    it('should deny school admin from managing classrooms in other schools', async () => {
      const otherSchool = await createMockSchool('Other School');
      const token = appInstance.managers.token.genLongToken({
        userId: schoolAdminUser._id,
        userKey: schoolAdminUser.username
      });

      const response = await request(baseUrl)
        .post('/api/classroom/createClassroom')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Classroom',
          capacity: 30,
          schoolId: otherSchool._id
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('Resource-specific Authorization', () => {
    it('should enforce resource-specific permissions for nested resources', async () => {
      const token = appInstance.managers.token.genLongToken({
        userId: schoolAdminUser._id,
        userKey: schoolAdminUser.username
      });

      const classroom = await request(baseUrl)
        .post('/api/classroom/createClassroom')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Classroom',
          capacity: 30,
          schoolId: schoolAdminUser.schoolId
        });

      const studentResponse = await request(baseUrl)
        .post('/api/student/createStudent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Test',
          lastName: 'Student',
          email: 'test@student.com',
          dateOfBirth: '2000-01-01',
          schoolId: schoolAdminUser.schoolId.toString(),
          classroomId: classroom.body.data._id
        });

      expect(studentResponse.status).not.toBe(403);
      expect(studentResponse.body.ok).toBe(true);
    });
  });
});
