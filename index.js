const config = require('./config/index.config.js');
const Cortex = require('ion-cortex');
const ManagersLoader = require('./loaders/ManagersLoader.js');
const Aeon = require('aeon-machine');

const createApp = async (options = {}) => {
    const appConfig = { ...config, ...options };
    const isTest = process.env.NODE_ENV === 'test';

    process.on('uncaughtException', err => {
        console.log(`Uncaught Exception:`)
        console.log(err, err.stack);
        process.exit(1)
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.log('Unhandled rejection at ', promise, `reason:`, reason);
        process.exit(1)
    });

    if (appConfig.dotEnv.MONGO_URI) {
        require('./connect/mongo')({ uri: appConfig.dotEnv.MONGO_URI });
    }

    let cache, cortex, oyster, aeon;

    if (isTest) {
        const { MockCortex, MockCache, MockOyster, MockAeon } = require('./__tests__/mocks/services');
        cache = new MockCache();
        cortex = new MockCortex();
        oyster = new MockOyster();
        aeon = new MockAeon();
    } else {

        cache = require('./cache/cache.dbh')({
            prefix: appConfig.dotEnv.CACHE_PREFIX,
            url: appConfig.dotEnv.CACHE_REDIS
        });

        const Oyster = require('oyster-db');
        oyster = new Oyster({
            url: appConfig.dotEnv.OYSTER_REDIS,
            prefix: appConfig.dotEnv.OYSTER_PREFIX
        });

        cortex = new Cortex({
            prefix: appConfig.dotEnv.CORTEX_PREFIX,
            url: appConfig.dotEnv.CORTEX_REDIS,
            type: appConfig.dotEnv.CORTEX_TYPE,
            state: () => {
                return {}
            },
            activeDelay: "50",
            idlDelay: "200",
        });
        aeon = new Aeon({ cortex, timestampFrom: Date.now(), segmantDuration: 500 });

    }

    const managersLoader = new ManagersLoader({ config: appConfig, cache, cortex, oyster, aeon });
    const managers = managersLoader.load();

    const server = managers.userServer.run();

    return {
        managers,
        cache,
        cortex,
        oyster,
        aeon,
        server
    };
};

if (require.main === module) {
    createApp().catch(err => {
        console.error('Failed to start app:', err);
        process.exit(1);
    });
}

module.exports = createApp;
