class MockCortex {
    constructor() {
        this.subscribers = new Map();
    }
    
    sub(event, callback) {
        this.subscribers.set(event, callback);
    }
    
    AsyncEmitToAllOf() {
        return Promise.resolve();
    }
}

class MockCache {
    constructor() {
        this.store = new Map();
        this.key = {
            get: jest.fn(async ({ key }) => {
                return this.store.get(key);
            }),
            set: jest.fn(async ({ key, data, ttl }) => {
                this.store.set(key, data);
                return true;
            }),
            expire: jest.fn(async ({ key, expire }) => {
                return true;
            }),
            delete: jest.fn(async ({ key }) => {
                return this.store.delete(key);
            })
        };
        this.hash = {
            set: jest.fn(async ({ key, data }) => {
                return true;
            }),
            get: jest.fn(async ({ key }) => {
                return {};
            }),
            getField: jest.fn(async ({ key, fieldKey }) => {
                return null;
            })
        };
        this.set = {
            add: jest.fn(async ({ key, arr }) => {
                return true;
            }),
            get: jest.fn(async ({ key }) => {
                return [];
            })
        };
        this.sorted = {
            get: jest.fn(async ({ key, withScores }) => {
                return [];
            }),
            set: jest.fn(async ({ key, scores }) => {
                return true;
            })
        };
    }
}

class MockOyster {
    constructor() {
        this.store = new Map();
    }

    async call() {
        return {};
    }
}

class MockAeon {
    constructor() {}
    
    async call() {
        return {};
    }
}

module.exports = {
    MockCortex,
    MockCache,
    MockOyster,
    MockAeon
};
