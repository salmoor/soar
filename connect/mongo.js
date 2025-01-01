const mongoose      = require('mongoose');
mongoose.Promise    = global.Promise;

module.exports = ({uri})=>{
  //database connection
  mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const ensureIndexes = async () => {
    try {
      await Promise.all([
        require('../managers/entities/user/user.mongoModel').createIndexes(),
        require('../managers/entities/school/school.mongoModel').createIndexes(),
        require('../managers/entities/classroom/classroom.mongoModel').createIndexes(),
        require('../managers/entities/student/student.mongoModel').createIndexes()
      ]);
      console.log('💾 Database indexes have been created');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  };

  // When successfully connected
  mongoose.connection.on('connected', function () {
    console.log('💾  Mongoose default connection open to ' + uri);
    ensureIndexes();
  });

  // If the connection throws an error
  mongoose.connection.on('error',function (err) {
    console.log('💾  Mongoose default connection error: ' + err);
    console.log('=> if using local mongodb: make sure that mongo server is running \n'+
      '=> if using online mongodb: check your internet connection \n');
  });

  // When the connection is disconnected
  mongoose.connection.on('disconnected', function () {
    console.log('💾  Mongoose default connection disconnected');
  });

  // If the Node process ends, close the Mongoose connection
  process.on('SIGINT', function() {
    mongoose.connection.close(function () {
      console.log('💾  Mongoose default connection disconnected through app termination');
      process.exit(0);
    });
  });
}
