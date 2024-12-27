module.exports = class SchoolManager {
    constructor({ cache, config, managers, validators, mongomodels }) {
        this.cache = cache;
        this.config = config;
        this.validators = validators;
        this.responseDispatcher = managers.responseDispatcher;
        this.school = mongomodels.school;

        // Expose HTTP endpoints
        this.httpExposed = [
            'post=createSchool',
            'get=getSchool',
            'put=updateSchool',
            'delete=deleteSchool',
            'get=getAllSchools'
        ];
    }

    // Create a new school
    async createSchool({ __longToken, name, address, contactInfo }) {
        try {
            // Verify superadmin role
            if (!__longToken || __longToken.role !== 'superadmin') {
                return { error: 'Unauthorized - Superadmin access required' };
            }

            // Create new school instance
            const school = new this.school({
                name,
                address,
                contactInfo: {
                    email: contactInfo?.email,
                    phone: contactInfo?.phone
                }
            });

            // Save to database
            const savedSchool = await school.save();
            
            return {
                message: 'School created successfully',
                data: savedSchool
            };
        } catch (error) {
            console.error('Create school error:', error);
            return { error: 'Failed to create school' };
        }
    }

    // Get a specific school by ID
    async getSchool({ __longToken, __query }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            const school = await this.school.findById(__query.schoolId);
            if (!school) {
                return { error: 'School not found' };
            }

            // If school admin, verify they belong to this school
            if (__longToken.role === 'schoolAdmin' && __longToken.schoolId !== schoolId) {
                return { error: 'Unauthorized - Access denied to this school' };
            }

            return { data: school };
        } catch (error) {
            console.error('Get school error:', error);
            return { error: 'Failed to fetch school' };
        }
    }

    // Get all schools (superadmin only)
    async getAllSchools({ __longToken, __query }) {
        try {
            if (!__longToken || __longToken.role !== 'superadmin') {
                return { error: 'Unauthorized - Superadmin access required' };
            }

            const page = __query.page ?? 1;
            const limit = __query.limit ?? 10;

            const skip = (page - 1) * limit;
            
            const schools = await this.school.find()
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await this.school.countDocuments();

            return {
                data: schools,
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
    async updateSchool({ __longToken, schoolId, name, address, contactInfo }) {
        try {
            if (!__longToken) {
                return { error: 'Authentication required' };
            }

            // Only superadmin can update any school
            // School admin can only update their own school
            if (__longToken.role !== 'superadmin' && 
                (__longToken.role !== 'schoolAdmin' || __longToken.schoolId !== schoolId)) {
                return { error: 'Unauthorized - Insufficient permissions' };
            }

            const updateData = {
                ...(name && { name }),
                ...(address && { address }),
                ...(contactInfo && { contactInfo })
            };

            const school = await this.school.findByIdAndUpdate(
                schoolId,
                { $set: updateData },
                { new: true }
            );

            if (!school) {
                return { error: 'School not found' };
            }

            return {
                message: 'School updated successfully',
                data: school
            };
        } catch (error) {
            console.error('Update school error:', error);
            return { error: 'Failed to update school' };
        }
    }

    // Delete a school (superadmin only)
    async deleteSchool({ __longToken, __query }) {
        try {
            if (!__longToken || __longToken.role !== 'superadmin') {
                return { error: 'Unauthorized - Superadmin access required' };
            }

            const school = await this.school.findByIdAndDelete(__query.schoolId);
            
            if (!school) {
                return { error: 'School not found' };
            }

            //TODO -  Check if there are related classrooms
            return {
                message: 'School deleted successfully',
                data: school
            };
        } catch (error) {
            console.error('Delete school error:', error);
            return { error: 'Failed to delete school' };
        }
    }
};
