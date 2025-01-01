const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../../../../index');
const UserModel = require('../../../../managers/entities/user/user.mongoModel');
const SchoolModel = require('../../../../managers/entities/school/school.mongoModel');
const ClassroomModel = require('../../../../managers/entities/classroom/classroom.mongoModel');
const StudentModel = require('../../../../managers/entities/student/student.mongoModel');

describe('Student Integration Tests', () => {
    let appInstance;
    let baseUrl;
    let superadminToken;
    let schoolAdminToken;
    let testSchool;
    let testClassroom;
    let testStudent;

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
        await mongoose.connection.collection('students').deleteMany({});

        testSchool = await SchoolModel.create({
            name: 'Test School',
            address: '123 Test St',
            contactInfo: {
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

        testStudent = await StudentModel.create({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@test.com',
            dateOfBirth: '2000-01-01',
            schoolId: testSchool._id,
            classroomId: testClassroom._id
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

    describe('POST /api/student/createStudent', () => {
        it('should allow school admin to create a student', async () => {
            const studentData = {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane@test.com',
                dateOfBirth: '2000-01-01',
                schoolId: testSchool._id.toString(),
                classroomId: testClassroom._id.toString()
            };

            const response = await request(baseUrl)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(studentData);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.firstName).toBe(studentData.firstName);
            expect(response.body.data.email).toBe(studentData.email);
        });

        it('should fail to create student with duplicate email', async () => {
            const studentData = {
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'john@test.com',
                dateOfBirth: '2000-01-01',
                schoolId: testSchool._id.toString(),
                classroomId: testClassroom._id.toString()
            };

            const response = await request(baseUrl)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(studentData);

            expect(response.status).toBe(400);
            expect(response.body.ok).toBe(false);
            expect(response.body.message).toBe('Email already exists');
        });

        it('should validate required fields', async () => {
            const response = await request(baseUrl)
                .post('/api/student/createStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    firstName: 'Jane',
                    schoolId: testSchool._id.toString()
                });

            expect(response.status).toBe(422);
            expect(response.body.ok).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('GET /api/student/getStudent', () => {
        it('should allow school admin to get their student', async () => {
            const response = await request(baseUrl)
                .get(`/api/student/getStudent?studentId=${testStudent._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data._id).toBe(testStudent._id.toString());
        });

        it('should allow superadmin to get any student', async () => {
            const response = await request(baseUrl)
                .get(`/api/student/getStudent?studentId=${testStudent._id}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data._id).toBe(testStudent._id.toString());
        });

        it('should not allow school admin to get student from another school', async () => {
            const otherSchool = await SchoolModel.create({
                name: 'Other School',
                address: '456 Other St',
                contactInfo: { email: 'other@school.com', phone: '9876543210' }
            });

            const otherStudent = await StudentModel.create({
                firstName: 'Other',
                lastName: 'Student',
                email: 'other@test.com',
                dateOfBirth: '2000-01-01',
                schoolId: otherSchool._id
            });

            const response = await request(baseUrl)
                .get(`/api/student/getStudent?studentId=${otherStudent._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });
    });

    describe('PUT /api/student/updateStudent', () => {
        it('should allow school admin to update their student', async () => {
            const updateData = {
                studentId: testStudent._id.toString(),
                firstName: 'Updated',
                lastName: 'Name',
                email: 'updated@test.com'
            };

            const response = await request(baseUrl)
                .put('/api/student/updateStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.firstName).toBe(updateData.firstName);
            expect(response.body.data.email).toBe(updateData.email);
        });

        it('should validate update data', async () => {
            const response = await request(baseUrl)
                .put('/api/student/updateStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: testStudent._id.toString(),
                    email: 'invalid-email'
                });

            expect(response.status).toBe(422);
            expect(response.body.ok).toBe(false);
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('DELETE /api/student/deleteStudent', () => {
        it('should allow school admin to delete their student', async () => {
            const response = await request(baseUrl)
                .delete(`/api/student/deleteStudent?studentId=${testStudent._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);

            const deletedStudent = await StudentModel.findById(testStudent._id);
            expect(deletedStudent).toBeNull();
        });

        it('should not allow school admin to delete student from another school', async () => {
            const otherSchool = await SchoolModel.create({
                name: 'Other School',
                address: '456 Other St',
                contactInfo: { email: 'other@school.com', phone: '9876543210' }
            });

            const otherStudent = await StudentModel.create({
                firstName: 'Other',
                lastName: 'Student',
                email: 'other@test.com',
                dateOfBirth: '2000-01-01',
                schoolId: otherSchool._id
            });

            const response = await request(baseUrl)
                .delete(`/api/student/deleteStudent?studentId=${otherStudent._id}`)
                .set('Authorization', `Bearer ${schoolAdminToken}`);

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });
    });

    describe('PUT /api/student/transferStudent', () => {
        it('should allow transfer to another school', async () => {
            const newSchool = await SchoolModel.create({
                name: 'New School',
                address: '789 New St',
                contactInfo: { email: 'new@school.com', phone: '5555555555' }
            });

            const response = await request(baseUrl)
                .put('/api/student/transferStudent')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    studentId: testStudent._id.toString(),
                    toSchoolId: newSchool._id.toString(),
                    reason: 'Family moved'
                });

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.schoolId.toString()).toBe(newSchool._id.toString());
            expect(response.body.data.transferHistory).toHaveLength(1);
        });

        it('should clear classroom assignment after transfer', async () => {
            const newSchool = await SchoolModel.create({
                name: 'New School',
                address: '789 New St',
                contactInfo: { email: 'new@school.com', phone: '5555555555' }
            });

            const response = await request(baseUrl)
                .put('/api/student/transferStudent')
                .set('Authorization', `Bearer ${superadminToken}`)
                .send({
                    studentId: testStudent._id.toString(),
                    toSchoolId: newSchool._id.toString(),
                    reason: 'Family moved'
                });

            expect(response.status).toBe(200);
            expect(response.body.data.classroomId).toBeNull();
        });
    });

    describe('PUT /api/student/enrollStudent', () => {
        it('should enroll student in a classroom', async () => {
            const newClassroom = await ClassroomModel.create({
                name: 'New Classroom',
                capacity: 30,
                schoolId: testSchool._id,
                resources: ['computers']
            });

            const response = await request(baseUrl)
                .put('/api/student/enrollStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: testStudent._id.toString(),
                    classroomId: newClassroom._id.toString()
                });

            expect(response.status).toBe(200);
            expect(response.body.ok).toBe(true);
            expect(response.body.data.classroomId.toString()).toBe(newClassroom._id.toString());
        });

        it('should prevent enrollment if classroom is at capacity', async () => {
            const fullClassroom = await ClassroomModel.create({
                name: 'Full Classroom',
                capacity: 1,
                schoolId: testSchool._id
            });

            await StudentModel.create({
                firstName: 'Another',
                lastName: 'Student',
                email: 'another@test.com',
                dateOfBirth: '2000-01-01',
                schoolId: testSchool._id,
                classroomId: fullClassroom._id
            });

            const response = await request(baseUrl)
                .put('/api/student/enrollStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: testStudent._id.toString(),
                    classroomId: fullClassroom._id.toString()
                });

            expect(response.status).toBe(400);
            expect(response.body.ok).toBe(false);
            expect(response.body.message).toBe('Classroom is at full capacity');
        });

        it('should prevent enrollment in classroom from different school', async () => {
            const otherSchool = await SchoolModel.create({
                name: 'Other School',
                address: '456 Other St',
                contactInfo: { email: 'other@school.com', phone: '9876543210' }
            });

            const otherClassroom = await ClassroomModel.create({
                name: 'Other Classroom',
                capacity: 30,
                schoolId: otherSchool._id
            });

            const response = await request(baseUrl)
                .put('/api/student/enrollStudent')
                .set('Authorization', `Bearer ${schoolAdminToken}`)
                .send({
                    studentId: testStudent._id.toString(),
                    classroomId: otherClassroom._id.toString()
                });

            expect(response.status).toBe(403);
            expect(response.body.ok).toBe(false);
        });
    });
});
