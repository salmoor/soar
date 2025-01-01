module.exports = class StudentManager {
    constructor({ cache, config, managers, validators, mongomodels }) {
        this.cache = cache;
        this.config = config;
        this.validators = validators;
        this.responseDispatcher = managers.responseDispatcher;
        this.student = mongomodels.student;
        this.classroom = mongomodels.classroom;

        // Expose HTTP endpoints
        this.httpExposed = [
            'post=createStudent',
            'get=getStudent',
            'get=getAllStudents',
            'put=updateStudent',
            'delete=deleteStudent',
            'put=transferStudent',
            'put=enrollStudent'
        ];
    }

    // Create a new student
    async createStudent({ ...requestData }) {
        try {
            const validator = this.validators.student.createStudent;
            const validationResult = await validator(requestData);

            if (validationResult && validationResult.length > 0) {
                const errors = validationResult.map(err => `${err.label}: ${err.message}`);
                return {
                    ok: false,
                    message: 'Validation failed',
                    code: 422,
                    errors
                };
            }

            const studentData = {
                ...(requestData.firstName && { firstName: requestData.firstName }),
                ...(requestData.lastName && { lastName: requestData.lastName }),
                ...(requestData.email && { email: requestData.email }),
                ...(requestData.schoolId && { schoolId: requestData.schoolId }),
                ...(requestData.classroomId && { classroomId: requestData.classroomId }),
                ...(requestData.grade && { grade: requestData.grade }),
                ...(requestData.dateOfBirth && { dateOfBirth: new Date(requestData.dateOfBirth) })
            };

            const student = new this.student(studentData);
            const savedStudent = await student.save();

            return {
                _id: savedStudent._id,
                firstName: savedStudent.firstName,
                lastName: savedStudent.lastName,
                email: savedStudent.email,
                schoolId: savedStudent.schoolId,
                classroomId: savedStudent.classroomId,
                grade: savedStudent.grade,
                dateOfBirth: savedStudent.dateOfBirth,
                transferHistory: savedStudent.transferHistory
            };
        } catch (error) {
            console.error('Create student error:', error);
            if (error.code === 11000) {
                return { error: 'Email already exists' };
            }
            return { error: 'Failed to create student' };
        }
    }

    // Get a specific student
    async getStudent({ __query }) {
        try {
            const student = await this.student.findById(__query.studentId)
                .populate('schoolId', 'name')
                .populate('classroomId', 'name');

            if (!student) {
                return { error: 'Student not found' };
            }

            return {
                _id: student._id,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
                schoolId: student.schoolId,
                classroomId: student.classroomId,
                grade: student.grade,
                dateOfBirth: student.dateOfBirth,
                transferHistory: student.transferHistory
            };
        } catch (error) {
            console.error('Get student error:', error);
            return { error: 'Failed to fetch student' };
        }
    }

    // Get all students for a school
    async getAllStudents({ __query }) {
        try {
            const schoolId = __query.schoolId;

            const page = parseInt(__query.page) || 1;
            const limit = parseInt(__query.limit) || 10;
            const skip = (page - 1) * limit;

            const filter = { schoolId };
            if (__query.classroomId) {
                filter.classroomId = __query.classroomId;
            }

            const students = await this.student.find(filter)
                .populate('schoolId', 'name')
                .populate('classroomId', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ lastName: 1, firstName: 1 });

            const total = await this.student.countDocuments(filter);

            return {
                students,
                pagination: {
                    current: page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Get all students error:', error);
            return { error: 'Failed to fetch students' };
        }
    }

    async updateStudent({ studentId, ...requestData }) {
        try {
            const student = await this.student.findById(studentId);
            if (!student) {
                return { error: 'Student not found' };
            }

            const validator = this.validators.student.updateStudent;
            const validationResult = await validator(requestData);

            if (validationResult && validationResult.length > 0) {
                const errors = validationResult.map(err => `${err.label}: ${err.message}`);
                return {
                    ok: false,
                    message: 'Validation failed',
                    code: 422,
                    errors
                };
            }

            // Extract validated data
            const updateData = {
                ...(requestData.firstName && { firstName: requestData.firstName }),
                ...(requestData.lastName && { lastName: requestData.lastName }),
                ...(requestData.email && { email: requestData.email }),
                ...(requestData.classroomId && { classroomId: requestData.classroomId })
            };

            const updatedStudent = await this.student.findByIdAndUpdate(
                studentId,
                { $set: updateData },
                { new: true }
            );

            return {
                _id: updatedStudent._id,
                firstName: updatedStudent.firstName,
                lastName: updatedStudent.lastName,
                email: updatedStudent.email,
                schoolId: updatedStudent.schoolId,
                classroomId: updatedStudent.classroomId,
                grade: updatedStudent.grade,
                dateOfBirth: updatedStudent.dateOfBirth,
                transferHistory: updatedStudent.transferHistory
            };
        } catch (error) {
            console.error('Update student error:', error);
            return { error: 'Failed to update student' };
        }
    }

    // Delete a student
    async deleteStudent({ __query }) {
        try {
            const student = await this.student.findById(__query.studentId);
            if (!student) {
                return { error: 'Student not found' };
            }

            await this.student.findByIdAndDelete(__query.studentId);

            return {
                _id: student._id,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
                schoolId: student.schoolId,
                classroomId: student.classroomId,
                grade: student.grade,
                dateOfBirth: student.dateOfBirth,
                transferHistory: student.transferHistory
            };
        } catch (error) {
            console.error('Delete student error:', error);
            return { error: 'Failed to delete student' };
        }
    }

    // Transfer student to another school
    async transferStudent({ studentId, toSchoolId, reason }) {
        try {
            const student = await this.student.findById(studentId);
            if (!student) {
                return { error: 'Student not found' };
            }
            
            // Add transfer record
            student.transferHistory.push({
                fromSchool: student.schoolId,
                toSchool: toSchoolId,
                reason
            });

            // Update student record
            student.schoolId = toSchoolId;
            student.classroomId = null;

            const updatedStudent = await student.save();

            return {
                _id: updatedStudent._id,
                firstName: updatedStudent.firstName,
                lastName: updatedStudent.lastName,
                email: updatedStudent.email,
                schoolId: updatedStudent.schoolId,
                classroomId: updatedStudent.classroomId,
                grade: updatedStudent.grade,
                dateOfBirth: updatedStudent.dateOfBirth,
                transferHistory: updatedStudent.transferHistory
            };
        } catch (error) {
            console.error('Transfer student error:', error);
            return { error: 'Failed to transfer student' };
        }
    }

    // Enroll student in a classroom
    async enrollStudent({ studentId, classroomId }) {
        try {
            const student = await this.student.findById(studentId);
            if (!student) {
                return { error: 'Student not found' };
            }

            // Verify classroom exists and belongs to the same school
            const classroom = await this.classroom.findById(classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }
            if (classroom.schoolId.toString() !== student.schoolId.toString()) {
                return { error: 'Classroom does not belong to student\'s school' };
            }

            // Check classroom capacity
            const currentStudentsCount = await this.student.countDocuments({
                classroomId,
            });

            if (currentStudentsCount >= classroom.capacity) {
                return { error: 'Classroom is at full capacity' };
            }

            // Update student's classroom
            student.classroomId = classroomId;
            const updatedStudent = await student.save();

            return {
                _id: updatedStudent._id,
                firstName: updatedStudent.firstName,
                lastName: updatedStudent.lastName,
                email: updatedStudent.email,
                schoolId: updatedStudent.schoolId,
                classroomId: updatedStudent.classroomId,
                grade: updatedStudent.grade,
                dateOfBirth: updatedStudent.dateOfBirth,
                transferHistory: updatedStudent.transferHistory
            };
        } catch (error) {
            console.error('Enroll student error:', error);
            return { error: 'Failed to enroll student' };
        }
    }
};
