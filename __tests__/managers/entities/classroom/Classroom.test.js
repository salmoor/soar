const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../../../../index');
const UserModel = require('../../../../managers/entities/user/user.mongoModel');
const SchoolModel = require('../../../../managers/entities/school/school.mongoModel');
const ClassroomModel = require('../../../../managers/entities/classroom/classroom.mongoModel');

describe('Classroom Integration Tests', () => {
    let appInstance;
    let baseUrl;
    let superadminToken;
    let schoolAdminToken;
    let testSchool;
    let testClassroom;

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
        await mongoose.connection.collection('classrooms').deleteMany({});

        testSchool = await SchoolModel.create({
            name: 'Test School',
            address: '123 Test St',
            profileInfo: {
                email: 'test@school.com',
                phone: '1234567890'
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

        testClassroom = await ClassroomModel.create({
            name: 'Test Classroom',
            capacity: 30,
            schoolId: testSchool._id,
            resources: ['projector', 'whiteboard']
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

    describe('POST /api/classroom/createClassroom', () => {
        it('should allow school admin to create a classroom', async () => {
            const classroomData = {
                name: 'New Classroom',
                capacity: 25,
                schoolId: testSchool._id.toString(),
                resources: ['computers', 'smartboard']
            };

            const response = await request(baseUrl)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(classroomData);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.name).toBe(classroomData.name);
            expect(response.body.data.capacity).toBe(classroomData.capacity);
            expect(response.body.data.resources).toEqual(expect.arrayContaining(classroomData.resources));

            const classroom = await ClassroomModel.findById(response.body.data._id);
            expect(classroom).toBeTruthy();
            expect(classroom.schoolId.toString()).toBe(testSchool._id.toString());
        });

        it('should allow superadmin to create a classroom', async () => {
            const classroomData = {
                name: 'Super Classroom',
                capacity: 35,
                schoolId: testSchool._id.toString(),
                resources: ['lab equipment']
            };

            const response = await request(baseUrl)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send(classroomData);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.name).toBe(classroomData.name);
        });

        it('should validate classroom creation data', async () => {
            const invalidData = {
                schoolId: testSchool._id.toString()
            };

            const response = await request(baseUrl)
                .post('/api/classroom/createClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(invalidData);

            expect(response.status).toBe(422);
            expect(response.body.ok).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('GET /api/classroom/getClassroom', () => {
        it('should allow school admin to get their classroom', async () => {
            const response = await request(baseUrl)
                .get(`/api/classroom/getClassroom?classroomId=${testClassroom._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data._id).toBe(testClassroom._id.toString());
        });

        it('should allow superadmin to get any classroom', async () => {
            const response = await request(baseUrl)
                .get(`/api/classroom/getClassroom?classroomId=${testClassroom._id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data._id).toBe(testClassroom._id.toString());
        });

        it('should not allow school admin to get classroom from another school', async () => {
            const otherSchool = await SchoolModel.create({
                name: 'Other School',
                address: '456 Other St',
                profileInfo: { email: 'other@school.com', phone: '9876543210' }
            });

            const otherClassroom = await ClassroomModel.create({
                name: 'Other Classroom',
                capacity: 25,
                schoolId: otherSchool._id
            });

            const response = await request(baseUrl)
                .get(`/api/classroom/getClassroom?classroomId=${otherClassroom._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });
    });

    describe('GET /api/classroom/getAllClassrooms', () => {
        beforeEach(async () => {
            await ClassroomModel.create([
                {
                    name: 'Classroom 2',
                    capacity: 25,
                    schoolId: testSchool._id,
                    resources: ['computers']
                },
                {
                    name: 'Classroom 3',
                    capacity: 30,
                    schoolId: testSchool._id,
                    resources: ['projector']
                }
            ]);
        });

        it('should return paginated classrooms for school admin', async () => {
            const response = await request(baseUrl)
                .get(`/api/classroom/getAllClassrooms?schoolId=${testSchool._id}&page=1&limit=2`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.classrooms.length).toBe(2);
            expect(response.body.data.pagination).toBeDefined();
            expect(response.body.data.pagination.total).toBe(3);
        });

        it('should return all classrooms for superadmin', async () => {
            const response = await request(baseUrl)
                .get(`/api/classroom/getAllClassrooms?schoolId=${testSchool._id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.classrooms.length).toBeGreaterThan(0);
        });
    });

    describe('PUT /api/classroom/updateClassroom', () => {
        it('should allow school admin to update their classroom', async () => {
            const updateData = {
                classroomId: testClassroom._id.toString(),
                name: 'Updated Classroom',
                capacity: 40,
                resources: ['computers', 'tablets']
            };

            const response = await request(baseUrl)
                .put('/api/classroom/updateClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
            expect(response.body.data.capacity).toBe(updateData.capacity);
            expect(response.body.data.resources).toEqual(expect.arrayContaining(updateData.resources));
        });

        it('should validate update data', async () => {
            const invalidData = {
                classroomId: testClassroom._id.toString(),
                capacity: 'invalid'
            };

            const response = await request(baseUrl)
                .put('/api/classroom/updateClassroom')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(invalidData);

            expect(response.status).toBe(422);
            expect(response.body.ok).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('DELETE /api/classroom/deleteClassroom', () => {
        it('should allow school admin to delete their classroom', async () => {
            const response = await request(baseUrl)
                .delete(`/api/classroom/deleteClassroom?classroomId=${testClassroom._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);

            const deletedClassroom = await ClassroomModel.findById(testClassroom._id);
            expect(deletedClassroom).toBeNull();
        });

        it('should not allow school admin to delete classroom from another school', async () => {
            const otherSchool = await SchoolModel.create({
                name: 'Other School',
                address: '456 Other St',
                profileInfo: { email: 'other@school.com', phone: '9876543210' }
            });

            const otherClassroom = await ClassroomModel.create({
                name: 'Other Classroom',
                capacity: 25,
                schoolId: otherSchool._id
            });

            const response = await request(baseUrl)
                .delete(`/api/classroom/deleteClassroom?classroomId=${otherClassroom._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });
    });

    describe('PUT /api/classroom/manageCapacity', () => {
        it('should allow school admin to update classroom capacity', async () => {
            const response = await request(baseUrl)
                .put('/api/classroom/manageCapacity')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    classroomId: testClassroom._id.toString(),
                    newCapacity: 45
                });

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.capacity).toBe(45);
        });

        it('should validate capacity value', async () => {
            const response = await request(baseUrl)
                .put('/api/classroom/manageCapacity')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    classroomId: testClassroom._id.toString(),
                    newCapacity: 0
                });

            expect(response.status).toBe(400);
            expect(response.body.ok).toBe(false);
        });
    });

    describe('PUT /api/classroom/manageResources', () => {
        it('should allow adding new resources', async () => {
            const response = await request(baseUrl)
                .put('/api/classroom/manageResources')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    classroomId: testClassroom._id.toString(),
                    action: 'add',
                    resources: ['smartboard', 'laptops']
                });

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.resources).toEqual(
                expect.arrayContaining([...testClassroom.resources, 'smartboard', 'laptops'])
            );
        });

        it('should allow removing resources', async () => {
            const response = await request(baseUrl)
                .put('/api/classroom/manageResources')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    classroomId: testClassroom._id.toString(),
                    action: 'remove',
                    resources: ['projector']
                });

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.resources).not.toContain('projector');
        });

        it('should validate action type', async () => {
            const response = await request(baseUrl)
                .put('/api/classroom/manageResources')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    classroomId: testClassroom._id.toString(),
                    action: 'invalid',
                    resources: ['smartboard']
                });

            expect(response.status).toBe(400);
            expect(response.body.ok).toBe(false);
        });
    });
});
