const jwt = require('jsonwebtoken')
const passport = require('passport')
const secret = require('../config').secret

module.exports = {
    required: passport.authenticate('jwt'),
    optional: (req, res, next) => {
        passport.authenticate('jwt', function(err, user) {
            req.user = user
            next();
          })(req, res, next);
    },
    generateToken: claims => jwt.sign(claims, secret),
};
