const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../../../../index');
const UserModel = require('../../../../managers/entities/user/user.mongoModel');
const SchoolModel = require('../../../../managers/entities/school/school.mongoModel');

describe('School Integration Tests', () => {
    let appInstance;
    let baseUrl;
    let superadminToken;
    let schoolAdminToken;
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
                email: 'test@school.com',
                phone: '1234567890123'
            }
        });

        const superadminResponse = await request(baseUrl)
            .post('/api/auth/register')
            .send({
                username: 'superadmin',
                password: 'password123',
                email: 'super@test.com',
                role: 'superadmin'
            });
        superadminToken = superadminResponse.body.data.longToken;

        const schoolAdminResponse = await request(baseUrl)
            .post('/api/auth/register')
            .send({
                username: 'schooladmin',
                password: 'password123',
                email: 'school@test.com',
                role: 'schoolAdmin',
                schoolId: testSchool._id.toString()
            });
        schoolAdminToken = schoolAdminResponse.body.data.longToken;
    });

    afterAll(async () => {
        if (appInstance.server) {
            await new Promise((resolve) => {
                appInstance.server.close(resolve);
            });
        }
        await mongoose.connection.close();
    });

    describe('POST /api/school/createSchool', () => {
        it('should allow superadmin to create a school', async () => {
            const schoolData = {
                name: 'New Test School',
                address: '456 School St',
                profileInfo: {
                    email: 'new@school.com',
                    phone: '9876543210987'
                }
            };

            const response = await request(baseUrl)
                .post('/api/school/createSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send(schoolData);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.name).toBe(schoolData.name);

            const school = await SchoolModel.findById(response.body.data._id);
            expect(school).toBeTruthy();
            expect(school.name).toBe(schoolData.name);
        });

        it('should not allow school admin to create a school', async () => {
            const schoolData = {
                name: 'New Test School',
                address: '456 School St',
                profileInfo: {
                    email: 'new@school.com',
                    phone: '9876543210'
                }
            };

            const response = await request(baseUrl)
                .post('/api/school/createSchool')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(schoolData);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });

        it('should validate school creation data', async () => {
            const invalidData = {
                name: '',
                address: '456 School St'
            };

            const response = await request(baseUrl)
                .post('/api/school/createSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send(invalidData);

            expect(response.status).toBe(422);
            expect(response.body.ok).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('GET /api/school/getSchool', () => {
        it('should allow superadmin to get any school', async () => {
            const response = await request(baseUrl)
                .get(`/api/school/getSchool?schoolId=${testSchool._id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data._id).toBe(testSchool._id.toString());
        });

        it('should allow school admin to get their own school', async () => {
            const response = await request(baseUrl)
                .get(`/api/school/getSchool?schoolId=${testSchool._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data._id).toBe(testSchool._id.toString());
        });

        it('should not allow school admin to get other schools', async () => {
            const otherSchool = await SchoolModel.create({
                name: 'Other School',
                address: '789 Other St',
                profileInfo: {
                    email: 'other@school.com',
                    phone: '5555555555'
                }
            });

            const response = await request(baseUrl)
                .get(`/api/school/getSchool?schoolId=${otherSchool._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });
    });

    describe('GET /api/school/getAllSchools', () => {
        beforeEach(async () => {
            await SchoolModel.create([
                {
                    name: 'School 2',
                    address: '456 Test Ave',
                    profileInfo: { email: 'school2@test.com', phone: '2222222222' }
                },
                {
                    name: 'School 3',
                    address: '789 Test Blvd',
                    profileInfo: { email: 'school3@test.com', phone: '3333333333' }
                }
            ]);
        });

        it('should allow superadmin to get all schools with pagination', async () => {
            const response = await request(baseUrl)
                .get('/api/school/getAllSchools?page=1&limit=2')
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.schools.length).toBe(2);
            expect(response.body.data.pagination).toBeDefined();
            expect(response.body.data.pagination.total).toBe(3);
        });

        it('should restrict school admin from getting all schools', async () => {
            const response = await request(baseUrl)
                .get('/api/school/getAllSchools')
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });
    });

    describe('PUT /api/school/updateSchool', () => {
        it('should allow superadmin to update any school', async () => {
            const updateData = {
                schoolId: testSchool._id.toString(),
                name: 'Updated School Name',
                address: '999 Updated St'
            };

            const response = await request(baseUrl)
                .put('/api/school/updateSchool')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);

            const updatedSchool = await SchoolModel.findById(testSchool._id);
            expect(updatedSchool.name).toBe(updateData.name);
        });

        it('should allow school admin to update their own school', async () => {
            const updateData = {
                schoolId: testSchool._id.toString(),
                name: 'Admin Updated Name',
                profileInfo: {
                    email: 'updated@school.com'
                }
            };

            const response = await request(baseUrl)
                .put('/api/school/updateSchool')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
        });

        it('should not allow school admin to update other schools', async () => {
            const otherSchool = await SchoolModel.create({
                name: 'Other School',
                address: '789 Other St'
            });

            const response = await request(baseUrl)
                .put('/api/school/updateSchool')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    schoolId: otherSchool._id.toString(),
                    name: 'Attempted Update'
                });

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });
    });

    describe('DELETE /api/school/deleteSchool', () => {
        it('should allow superadmin to delete a school', async () => {
            const response = await request(baseUrl)
                .delete(`/api/school/deleteSchool?schoolId=${testSchool._id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);

            const deletedSchool = await SchoolModel.findById(testSchool._id);
            expect(deletedSchool).toBeNull();
        });

        it('should not allow school admin to delete schools', async () => {
            const response = await request(baseUrl)
                .delete(`/api/school/deleteSchool?schoolId=${testSchool._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });

        it('should handle deletion of non-existent school', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(baseUrl)
                .delete(`/api/school/deleteSchool?schoolId=${nonExistentId}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(404);
            expect(response.body.ok).toBe(false);
        });
    });
});
