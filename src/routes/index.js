const router = require('express').Router();

router.use('/user', require('./user'))
router.use('/users', require('./users'))
router.use('/articles', require('./articles'))
router.use('/profiles', require('./profiles'))
router.use('/tags', require('./tags'))

module.exports = router
