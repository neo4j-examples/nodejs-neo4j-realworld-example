const router = require('express').Router()
const passport = require('passport')
const { generateToken } = require('../middleware/auth')
const { check, validationResult } = require('express-validator');
const validate = require('../middleware/validate')

router.get('/', passport.authenticate('jwt'), (req, res, next) => {
    res.json({
        user: {
            ...req.user.toJson(),
            token: generateToken(req.user.getClaims()),
        },
    })
})

router.put(
    '/',
    passport.authenticate('jwt'),
    [
        check('user.username').optional().notEmpty(),
        check('user.email').notEmpty().isEmail(),
        check('user.password').optional().notEmpty(),
    ],
    validate,
    (req, res, next) => {
        req.user.update(req.body.user)
            .then(user => {
                return {
                    ...user.toJson(),
                    token: generateToken(user.getClaims()),
                }
            })
            .then(user => res.json({ user }))
            .catch(e => next(e))

})

module.exports = router