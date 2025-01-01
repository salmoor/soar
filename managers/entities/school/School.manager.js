module.exports = class SchoolManager {
    constructor({ cache, config, managers, validators, mongomodels }) {
        this.cache = cache;
        this.config = config;
        this.validators = validators;
        this.responseDispatcher = managers.responseDispatcher;
        this.school = mongomodels.school;
        this.classroom = mongomodels.classroom;

        // Expose HTTP endpoints
        this.httpExposed = [
            'post=createSchool',
            'get=getSchool',
            'put=updateSchool',
            'delete=deleteSchool',
            'get=getAllSchools'
        ];
    }

    async createSchool({...requestData }) {
        try {
            const validator = this.validators.school.createSchool;
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

            const schoolData = {
                ...(requestData.name && { name: requestData.name }),
                ...(requestData.address && { address: requestData.address }),
                ...(requestData.profileInfo && { profileInfo: requestData.profileInfo })
            };

            // Create and save school instance
            const school = new this.school(schoolData);
            const savedSchool = await school.save();

            return {
                _id: savedSchool._id,
                name: savedSchool.name,
                address: savedSchool.address,
                profileInfo: savedSchool.profileInfo,
            };
        } catch (error) {
            console.error('Create school error:', error);
            return { 
                error: 'Failed to create school',
                message: error.message 
            };
        }
    }

    // Get a specific school by ID
    async getSchool({ __query }) {
        try {
            const school = await this.school.findById(__query.schoolId);
            if (!school) {
                return { error: 'School not found' };
            }

            return {
                _id: school._id,
                name: school.name,
                address: school.address,
                profileInfo: school.profileInfo,
            };
        } catch (error) {
            console.error('Get school error:', error);
            return { error: 'Failed to fetch school' };
        }
    }

    // Get all schools (superadmin only)
    async getAllSchools({ __query }) {
        try {
            const page = __query.page ?? 1;
            const limit = __query.limit ?? 10;

            const skip = (page - 1) * limit;

            const schools = await this.school.find()
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await this.school.countDocuments();

            return {
                schools,
                pagination: {
                    current: page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Get all schools error:', error);
            return { error: 'Failed to fetch schools' };
        }
    }

    // Update a school
    async updateSchool({schoolId, ...requestData }) {
        try {
            const validator = this.validators.school.createSchool;
            const validationResult = await validator(requestData);

            const schoolData = {
                ...(requestData.name && { name: requestData.name }),
                ...(requestData.address && { address: requestData.address }),
                ...(requestData.profileInfo && { profileInfo: requestData.profileInfo })
            };

            const school = await this.school.findByIdAndUpdate(
                schoolId,
                { $set: schoolData },
                { new: true }
            );

            if (!school) {
                return { error: 'School not found' };
            }

            return {
                _id: school._id,
                name: school.name,
                address: school.address,
                profileInfo: school.profileInfo
            };
        } catch (error) {
            console.error('Update school error:', error);
            return { error: 'Failed to update school' };
        }
    }

    async deleteSchool({ __query }) {
        try {
            const school = await this.school.findByIdAndDelete(__query.schoolId);

            if (!school) {
                return { errors: ['School not found'], code: 404 };
            }

            const classrooms = await this.classroom.countDocuments({ schoolId: __query.schoolId });
            if (classrooms > 0) {
                return { 
                    error: 'Cannot delete school',
                    message: `School has ${classrooms} classroom(s). Please delete or reassign all classrooms before deleting the school.`
                };
            }

            return {
                _id: school._id,
                name: school.name,
                address: school.address,
                profileInfo: school.profileInfo
            };
        } catch (error) {
            console.error('Delete school error:', error);
            return { error: 'Failed to delete school' };
        }
    }
};
