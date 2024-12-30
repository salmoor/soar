module.exports = class ClassroomManager {
    constructor({ cache, config, managers, validators, mongomodels }) {
        this.cache = cache;
        this.config = config;
        this.validators = validators;
        this.responseDispatcher = managers.responseDispatcher;
        this.classroom = mongomodels.classroom;
        this.school = mongomodels.school;

        // Expose HTTP endpoints
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

    // Create a new classroom
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

            // Create new classroom
            const classroom = new this.classroom(classroomData);

            const savedClassroom = await classroom.save();

            return {
                message: 'Classroom created successfully',
                data: savedClassroom
            };
        } catch (error) {
            console.error('Create classroom error:', error);
            return { error: 'Failed to create classroom' };
        }
    }

    // Get a specific classroom
    async getClassroom({ __longToken, __query }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const classroom = await this.classroom.findById(__query.classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== classroom.schoolId.toString()) {
                return { error: 'Unauthorized - Access denied to this classroom' };
            }

            return { data: classroom };
        } catch (error) {
            console.error('Get classroom error:', error);
            return { error: 'Failed to fetch classroom' };
        }
    }

    // Get all classrooms for a school
    async getAllClassrooms({ __longToken, __query }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const schoolId = __query.schoolId;

            if (!schoolId) {
                return { error: 'School ID is required' };
            }
            
            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== schoolId) {
                return { error: 'Unauthorized - Can only view classrooms from your school' };
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
                data: classrooms,
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

    // Update a classroom
    async updateClassroom({ __longToken, classroomId, ...requestData }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const classroom = await this.classroom.findById(classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== classroom.schoolId.toString()) {
                return { error: 'Unauthorized - Can only update classrooms from your school' };
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
                message: 'Classroom updated successfully',
                data: updatedClassroom
            };
        } catch (error) {
            console.error('Update classroom error:', error);
            return { error: 'Failed to update classroom' };
        }
    }

    // Delete a classroom
    async deleteClassroom({ __longToken, __query }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const classroom = await this.classroom.findById(__query.classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== classroom.schoolId.toString()) {
                return { error: 'Unauthorized - Can only delete classrooms from your school' };
            }

            //TODO: Check students, and conditionally disable
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

    // Manage classroom capacity
    async manageCapacity({ __longToken, classroomId, newCapacity }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const classroom = await this.classroom.findById(classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== classroom.schoolId.toString()) {
                return { error: 'Unauthorized - Can only manage capacity for classrooms in your school' };
            }

            // Validate new capacity
            if (newCapacity <= 0) {
                return { error: 'New capacity must be greater than 0' };
            }

            // TODO: Check current number of students in the classroom
            // If reducing capacity below current occupancy, return error

            classroom.capacity = newCapacity;
            await classroom.save();

            return {
                message: 'Classroom capacity updated successfully',
                data: classroom
            };
        } catch (error) {
            console.error('Manage capacity error:', error);
            return { error: 'Failed to update classroom capacity' };
        }
    }

    // Manage classroom resources
    async manageResources({ __longToken, classroomId, action, resources }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const classroom = await this.classroom.findById(classroomId);
            if (!classroom) {
                return { error: 'Classroom not found' };
            }

            // Verify authorization
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== classroom.schoolId.toString()) {
                return { error: 'Unauthorized - Can only manage resources for classrooms in your school' };
            }

            switch (action) {
                case 'add':
                    // Add new resources while avoiding duplicates
                    classroom.resources = [...new Set([...classroom.resources, ...resources])];
                    break;
                case 'remove':
                    // Remove specified resources
                    classroom.resources = classroom.resources.filter(r => !resources.includes(r));
                    break;
                case 'set':
                    // Replace all resources
                    classroom.resources = resources;
                    break;
                default:
                    return { error: 'Invalid action. Use "add", "remove", or "set"' };
            }

            await classroom.save();

            return {
                message: 'Classroom resources updated successfully',
                data: classroom
            };
        } catch (error) {
            console.error('Manage resources error:', error);
            return { error: 'Failed to update classroom resources' };
        }
    }
};
