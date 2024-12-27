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
    async createStudent({ __longToken, firstName, lastName, email, schoolId, classroomId, grade, dateOfBirth }) {
        try {
            // Verify authorization
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            // Check if school admin has access to this school
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== schoolId) {
                return { error: 'Unauthorized - Can only create students for your school' };
            }

            // If classroomId is provided, verify it belongs to the school
            if (classroomId) {
                const classroom = await this.classroom.findById(classroomId);
                if (!classroom || classroom.schoolId.toString() !== schoolId) {
                    return { error: 'Invalid classroom ID or classroom does not belong to the school' };
                }
            }

            // Create new student
            const student = new this.student({
                firstName,
                lastName,
                email,
                schoolId,
                classroomId,
                grade,
                dateOfBirth: new Date(dateOfBirth)
            });

            const savedStudent = await student.save();

            return {
                message: 'Student created successfully',
                data: savedStudent
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
    async getStudent({ __longToken, __query }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const student = await this.student.findById(__query.studentId)
                .populate('schoolId', 'name')
                .populate('classroomId', 'name');

            if (!student) {
                return { error: 'Student not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== student.schoolId.toString()) {
                return { error: 'Unauthorized - Access denied to this student' };
            }

            return { data: student };
        } catch (error) {
            console.error('Get student error:', error);
            return { error: 'Failed to fetch student' };
        }
    }

    // Get all students for a school
    async getAllStudents({ __longToken, __query }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const schoolId = __query.schoolId;
            
            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== schoolId) {
                return { error: 'Unauthorized - Can only view students from your school' };
            }

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
                data: students,
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

    async updateStudent({ __longToken, studentId, firstName, lastName, email, classroomId }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const student = await this.student.findById(studentId);
            if (!student) {
                return { error: 'Student not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== student.schoolId.toString()) {
                return { error: 'Unauthorized - Can only update students from your school' };
            }

            // If updating classroom, verify it belongs to the same school
            if (classroomId) {
                const classroom = await this.classroom.findById(classroomId);
                if (!classroom || classroom.schoolId.toString() !== student.schoolId.toString()) {
                    return { error: 'Invalid classroom ID or classroom does not belong to the school' };
                }
            }

            // Create update object with only the fields we want to update
            const updateData = {};
            if (firstName) updateData.firstName = firstName;
            if (lastName) updateData.lastName = lastName;
            if (email) updateData.email = email;
            if (classroomId) updateData.classroomId = classroomId;

            const updatedStudent = await this.student.findByIdAndUpdate(
                studentId,
                { $set: updateData },
                { new: true }
            );

            return {
                message: 'Student updated successfully',
                data: updatedStudent
            };
        } catch (error) {
            console.error('Update student error:', error);
            return { error: 'Failed to update student' };
        }
    }

    // Delete a student
    async deleteStudent({ __longToken, __query }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const student = await this.student.findById(__query.studentId);
            if (!student) {
                return { error: 'Student not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== student.schoolId.toString()) {
                return { error: 'Unauthorized - Can only delete students from your school' };
            }

            // Perform hard delete
            await this.student.findByIdAndDelete(__query.studentId);

            return {
                message: 'Student deleted successfully',
                data: { id: __query.studentId }
            };
        } catch (error) {
            console.error('Delete student error:', error);
            return { error: 'Failed to delete student' };
        }
    }

    // Transfer student to another school
    async transferStudent({ __longToken, studentId, toSchoolId, reason }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const student = await this.student.findById(studentId);
            if (!student) {
                return { error: 'Student not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin') {
                if (__longToken.schoolId !== student.schoolId.toString() && 
                    __longToken.schoolId !== toSchoolId) {
                    return { error: 'Unauthorized - Can only transfer students to/from your school' };
                }
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
                message: 'Student transferred successfully',
                data: updatedStudent
            };
        } catch (error) {
            console.error('Transfer student error:', error);
            return { error: 'Failed to transfer student' };
        }
    }

    // Enroll student in a classroom
    async enrollStudent({ __longToken, studentId, classroomId }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const student = await this.student.findById(studentId);
            if (!student) {
                return { error: 'Student not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== student.schoolId.toString()) {
                return { error: 'Unauthorized - Can only manage students from your school' };
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
                status: 'active'
            });

            if (currentStudentsCount >= classroom.capacity) {
                return { error: 'Classroom is at full capacity' };
            }

            // Update student's classroom
            student.classroomId = classroomId;
            const updatedStudent = await student.save();

            return {
                message: 'Student enrolled successfully',
                data: updatedStudent
            };
        } catch (error) {
            console.error('Enroll student error:', error);
            return { error: 'Failed to enroll student' };
        }
    }
};
