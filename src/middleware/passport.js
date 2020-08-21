const passport = require('passport')
const bcrypt = require('bcrypt')
const LocalStrategy = require('passport-local').Strategy
const AnonymousStrategy = require('passport-anonymous').Strategy
const JwtStrategy = require('passport-jwt').Strategy
const { secret } = require('../config')
const cypher = require('../cypher')
const User = require('../entities/User')



function getTokenFromHeader(req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token' ||
        req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
    }

    return null;
}

passport.use(new JwtStrategy({
    secretOrKey: secret,
    algorithms: ['HS256'],
    jwtFromRequest: getTokenFromHeader,
    passReqToCallback: true,
}, (req, payload, next) => {
    req.neo4j.read(cypher('get-user-by-email'), { email: payload.email })
        .then(res => {
            // Does user exist?
            if (res.records.length == 0) return next(null, false)

            // Create user entity
            const user = new User(res.records[0].get('u'))

            return next(null, user);
        })
        .catch(e => next(e))
}))

passport.use(new AnonymousStrategy());

passport.use(new LocalStrategy({
    usernameField: 'user[email]',
    passwordField: 'user[password]',
    passReqToCallback: true,
}, async (req, email, password, next) => {
    req.neo4j.read(cypher('get-user-by-email'), { email })
        .then(res => {
            // Does user exist?
            if (res.records.length == 0) return next(null, false)

            // Create user entity
            const user = new User(res.records[0].get('u'))

            // Does the password match?
            if (!bcrypt.compareSync(password, user.getPassword())) return next(null, false)

            return next(null, user);
        })
        .catch(e => next(e))
}))

passport.serializeUser(function (user, done) {
    done(null, user.getId());
});
