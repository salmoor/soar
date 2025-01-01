module.exports = class ClassroomManager {
    constructor({ cache, config, managers, validators, mongomodels }) {
        this.cache = cache;
        this.config = config;
        this.validators = validators;
        this.responseDispatcher = managers.responseDispatcher;
        this.classroom = mongomodels.classroom;
        this.student = mongomodels.student;
        this.school = mongomodels.school;

        this.httpExposed = [
            'post=createClassroom',
            'get=getClassroom',
            'get=getAllClassrooms',
            'put=updateClassroom',
            'delete=deleteClassroom',
            'put=manageCapacity',
            'put=manageResources'
        ];
    }

    async createClassroom({ ...requestData }) {
        try {
            const validator = this.validators.classroom.createClassroom;
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

            const classroomData = {
                ...(requestData.name && { name: requestData.name }),
                ...(requestData.capacity && { capacity: requestData.capacity }),
                ...(requestData.resources && { resources: requestData.resources }),
                ...(requestData.schoolId && { schoolId: requestData.schoolId })
            };

            const classroom = new this.classroom(classroomData);
            const savedClassroom = await classroom.save();

            return {
                _id: savedClassroom._id,
                name: savedClassroom.name,
                capacity: savedClassroom.capacity,
                resources: savedClassroom.resources
            };
        } catch (error) {
            console.error('Create classroom error:', error);
            return { error: 'Failed to create classroom' };
        }
    }

    async getClassroom({ __query }) {
        try {
            const classroom = await this.classroom.findById(__query.classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            return {
                _id: classroom._id,
                name: classroom.name,
                capacity: classroom.capacity,
                resources: classroom.resources
            };
        } catch (error) {
            console.error('Get classroom error:', error);
            return { error: 'Failed to fetch classroom' };
        }
    }

    async getAllClassrooms({ __query }) {
        try {
            const schoolId = __query.schoolId;

            if (!schoolId) {
                return { error: 'School ID is required' };
            }

            const page = parseInt(__query.page) || 1;
            const limit = parseInt(__query.limit) || 10;
            const skip = (page - 1) * limit;

            const classrooms = await this.classroom.find({ schoolId })
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await this.classroom.countDocuments({ schoolId });

            return {
                classrooms,
                pagination: {
                    current: page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Get all classrooms error:', error);
            return { error: 'Failed to fetch classrooms' };
        }
    }

    async updateClassroom({ classroomId, ...requestData }) {
        try {
            const classroom = await this.classroom.findById(classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            const validator = this.validators.classroom.updateClassroom;
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

            const updateData = {
                ...(requestData.name && { name: requestData.name }),
                ...(requestData.capacity && { capacity: requestData.capacity }),
                ...(requestData.resources && { resources: requestData.resources })
            };

            const updatedClassroom = await this.classroom.findByIdAndUpdate(
                classroomId,
                { $set: updateData },
                { new: true }
            );

            return {
                _id: updatedClassroom._id,
                name: updatedClassroom.name,
                capacity: updatedClassroom.capacity,
                resources: updatedClassroom.resources
            };
        } catch (error) {
            console.error('Update classroom error:', error);
            return { error: 'Failed to update classroom' };
        }
    }

    async deleteClassroom({ __query }) {
        try {
            const classroom = await this.classroom.findById(__query.classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            const classroomStudents = await this.student.find({ classroomId: classroom._id });

            if (classroomStudents.length > 0) {
                return { error: 'Cannot delete classroom with students' };
            }

            await this.classroom.findByIdAndDelete(__query.classroomId);

            return {
                message: 'Classroom deleted successfully',
                data: classroom
            };
        } catch (error) {
            console.error('Delete classroom error:', error);
            return { error: 'Failed to delete classroom' };
        }
    }

    async manageCapacity({ classroomId, newCapacity }) {
        try {
            const classroom = await this.classroom.findById(classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            if (newCapacity <= 0) {
                return { error: 'New capacity must be greater than 0' };
            }

            const students = await this.student.find({ classroomId: classroom._id });

            if (newCapacity < students.length) {
                return { error: 'New capacity cannot be less than the number of students in the classroom' };
            }

            classroom.capacity = newCapacity;
            await classroom.save();

            return {
                _id: classroom._id,
                name: classroom.name,
                capacity: classroom.capacity,
                resources: classroom.resources
            };
        } catch (error) {
            console.error('Manage capacity error:', error);
            return { error: 'Failed to update classroom capacity' };
        }
    }

    async manageResources({ classroomId, action, resources }) {
        try {
            const classroom = await this.classroom.findById(classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            switch (action) {
                case 'add':
                    classroom.resources = [...new Set([...classroom.resources, ...resources])];
                    break;
                case 'remove':
                    classroom.resources = classroom.resources.filter(r => !resources.includes(r));
                    break;
                case 'set':
                    classroom.resources = resources;
                    break;
                default:
                    return { error: 'Invalid action. Use "add", "remove", or "set"' };
            }

            await classroom.save();

            return {
                _id: classroom._id,
                name: classroom.name,
                capacity: classroom.capacity,
                resources: classroom.resources
            };
        } catch (error) {
            console.error('Manage resources error:', error);
            return { error: 'Failed to update classroom resources' };
        }
    }
};
