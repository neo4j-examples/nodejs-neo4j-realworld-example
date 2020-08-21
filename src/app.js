const express = require('express')
const bodyParser = require('body-parser')
const passport = require('passport')

const app = express()

app.use(bodyParser.json())


app.use(passport.initialize())
require('./middleware/passport')


// Bind Neo4j to the request
app.use((req, res, next) => {
  req.neo4j = require('./neo4j')
  next()
})
// Convert response from neo4j types to native types
app.use(require('./middleware/neo4j-type-handler'))

app.use(require('./routes'));


// Handle any constraint errors thrown by Neo4j
app.use(require('./middleware/neo4j-error-handler'))

app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
// if (!isProduction) {
//   app.use(function (err, req, res, next) {
//     console.log(err.stack);

//     res.status(err.status || 500);

//     res.json({
//       'errors': {
//         message: err.message,
//         error: err
//       }
//     });
//   });
// }

// // production error handler
// // no stacktraces leaked to user
// app.use(function (err, req, res, next) {
//   res.status(err.status || 500);
//   res.json({
//     'errors': {
//       message: err.message,
//       error: {}
//     }
//   });
// });

module.exports = app