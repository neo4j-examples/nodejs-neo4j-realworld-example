const router = require('express').Router()
const User = require('../entities/User')
const { required, optional } = require('../middleware/auth')

router.get('/:username', optional, (req, res, next) => {

    req.neo4j.read(`
        MATCH (u:User {username: $username})
        RETURN u, CASE WHEN $userId IS NOT NULL THEN exists((u)<-[:FOLLOWS]-({id: $userId})) ELSE false END AS following
    `, {
        username: req.params.username,
        userId: req.user ? req.user.getId() : null,
    })
        .then(res => {
            if ( res.records.length == 0 ) return undefined

            const user = new User(res.records[0].get('u'), res.records[0].get('following'))

            return user.toJson()
        })
        .then(profile =>
            profile ? res.json({ profile }) : res.status(404).json({
                code: 404,
                message: 'Not Found'
            })
        )
        .catch(e => next(e))

})

router.post('/:username/follow', required, (req, res, next) => {
    req.neo4j.write(`
        MATCH (target:User {username: $username})
        MATCH (current:User {id: $userId})

        MERGE (current)-[r:FOLLOWS]->(target)
        ON CREATE SET r.createdAt = datetime()

        RETURN target
    `, { username: req.params.username, userId: req.user.getId() })
        .then(res => {
            if ( !res.records.length ) return undefined

            const user = new User(res.records[0].get('target'), true)

            return user.toJson()
        })
        .then(profile =>
            profile ? res.status(201).json({ profile }) : res.status(404).json({
                code: 404,
                message: 'Not Found'
            })
        )
})

router.delete('/:username/follow', required, (req, res, next) => {
    req.neo4j.write(`
        MATCH (target:User {username: $username})
        MATCH (current:User {id: $userId})

        FOREACH (rel IN [ (target)<-[r:FOLLOWS]-(:User {id: $userId}) | r ] |
            DELETE rel
        )

        RETURN target
    `, { username: req.params.username, userId: req.user.getId() })
        .then(res => {
            if ( !res.records.length ) return undefined

            const user = new User(res.records[0].get('target'), false)

            return user.toJson()
        })
        .then(profile =>
            profile ? res.status(202).json({ profile }) : res.status(404).json({
                code: 404,
                message: 'Not Found'
            })
        )
})

module.exports = router