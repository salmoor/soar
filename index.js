const config = require('./config/index.config.js');
const Cortex = require('ion-cortex');
const ManagersLoader = require('./loaders/ManagersLoader.js');
const Aeon = require('aeon-machine');

const createApp = async (options = {}) => {
    const appConfig = { ...config, ...options };

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

    const cache = require('./cache/cache.dbh')({
        prefix: appConfig.dotEnv.CACHE_PREFIX,
        url: appConfig.dotEnv.CACHE_REDIS
    });

    const Oyster = require('oyster-db');
    const oyster = new Oyster({
        url: appConfig.dotEnv.OYSTER_REDIS,
        prefix: appConfig.dotEnv.OYSTER_PREFIX
    });

    const cortex = new Cortex({
        prefix: appConfig.dotEnv.CORTEX_PREFIX,
        url: appConfig.dotEnv.CORTEX_REDIS,
        type: appConfig.dotEnv.CORTEX_TYPE,
        state: () => {
            return {}
        },
        activeDelay: "50",
        idlDelay: "200",
    });
    const aeon = new Aeon({ cortex, timestampFrom: Date.now(), segmantDuration: 500 });

    const managersLoader = new ManagersLoader({ config: appConfig, cache, cortex, oyster, aeon });
    const managers = managersLoader.load();

    managers.userServer.run();

    return {
        managers,
        cache,
        cortex,
        oyster,
        aeon
    };
};

if (require.main === module) {
    createApp().catch(err => {
        console.error('Failed to start app:', err);
        process.exit(1);
    });
}

module.exports = createApp;
