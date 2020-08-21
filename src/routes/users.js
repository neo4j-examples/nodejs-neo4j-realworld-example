const passport = require('passport');
const router = require('express').Router()
const bcrypt = require('bcrypt')
const { check, validationResult } = require('express-validator');
const cypher = require('../cypher')
const { rounds } = require('../config')
const User = require('../entities/User')
const { generateToken } = require('../middleware/auth')
const validate = require('../middleware/validate')


router.post('/',
    [
        check('user.username').notEmpty(),
        check('user.email').notEmpty().isEmail(),
        check('user.password').notEmpty(),
    ],
    validate,
    (req, res, next) => {
        const { user } = req.body

        user.password = bcrypt.hashSync(user.password, rounds)
        user.bio = user.bio || null
        user.image = user.image || null

        // Create User
        req.neo4j.write(cypher('create-user'), user)
            // Convert to user entity
            .then(res => {
                const user = new User(res.records[0].get('u'))

                return {
                    ...user.toJson(),
                    // Generate a JWT token
                    token: generateToken(user.getClaims()),
                }
            })
            // Return the output
            .then(user => res.json({ user }))
            // Pass any errors to the next middleware
            .catch(next)
    }
)


router.post('/login', passport.authenticate('local'), (req, res, next) => {
    res.status(201).json({
        user: {
            // Use user bound to request
            ...req.user.toJson(),
            // Generate a JWT token
            token: generateToken(req.user.getClaims()),
        },
    })
})

module.exports = router