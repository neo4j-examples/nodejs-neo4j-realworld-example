const router = require('express').Router();

router.get('/', (req, res, next) => {
    req.neo4j.read(`MATCH (t:Tag) RETURN t.name AS name ORDER BY name ASC`)
        .then(res => res.records.map(row => row.get('name')))
        .then(tags => res.send({ tags }))
        .catch(e => next(e))
})

module.exports = router
