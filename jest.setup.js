const mongoose = require('mongoose');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    }
});

afterAll(async () => {
  await mongoose.connection.close();
});
