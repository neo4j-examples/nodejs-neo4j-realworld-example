const router = require('express').Router()
const Article = require('../entities/Article')
const Comment = require('../entities/Comment')
const User = require('../entities/User')
const Tag = require('../entities/Tag')
const { int } = require('neo4j-driver')
const { required, optional } = require('../middleware/auth')
const { check } = require('express-validator')
const validate = require('../middleware/validate')
const neo4j = require('../neo4j')

router.get('/', optional, (req, res, next) => {
    const skip = int( parseInt(req.params.offset) || 0 )
    const limit = int( parseInt(req.params.limit) || 10 )

    const params = {
        userId: req.user ? req.user.getId() : null,
        skip, limit
    }

    const where = [];

    if ( req.query.author ) {
        where.push( `(a)<-[:POSTED]-({username: $author})` )
        params.author = req.query.author
    }

    if ( req.query.favorited ) {
        where.push( `(a)<-[:FAVORITED]-({username: $favorited})` )
        params.favorited = req.query.favorited
    }

    if ( req.query.tag ) {
        where.push( ` ALL (tag in $tags WHERE (a)-[:HAS_TAG]->({name: tag})) ` )
        params.tags = req.query.tag.split(',')
    }

    return req.neo4j.read(`
        MATCH (a:Article)
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}

        WITH count(a) AS articlesCount, collect(a) AS articles

        UNWIND articles AS a

        WITH articlesCount, a
        ORDER BY a.createdAt DESC
        SKIP $skip LIMIT $limit

        RETURN
            articlesCount,
            a,
            [ (a)<-[:POSTED]-(u) | u ][0] AS author,
            [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
            CASE
                WHEN $userId IS NOT NULL
                THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                ELSE false
            END AS favorited,
            size((a)<-[:FAVORITED]-()) AS favoritesCount
    `, params)
        .then(res => {
            const articlesCount = res.records.length ? res.records[0].get('articlesCount') : 0
            const articles = res.records.map(row => {
                return new Article(
                    row.get('a'),
                    new User(row.get('author')),
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )
            })

            return {
                articlesCount,
                articles: articles.map(a => a.toJson()),
            }

        })
        .then(json => res.send(json))
        .catch(e => next(e))

})

router.post('/',
    required,
    [
        check('article.title').optional().notEmpty(),
        check('article.description').optional().notEmpty(),
        check('article.body').optional().notEmpty(),
        check('article.tagList').optional().isArray().notEmpty(),
    ],
    validate,
    (req, res, next) => {
        req.neo4j.write(`
            MATCH (u:User {id: $userId})

            WITH u, randomUUID() AS uuid

            CREATE (a:Article {
                id: uuid,
                createdAt: datetime(),
                updatedAt: datetime()
            }) SET a += $article, a.slug = apoc.text.slug($article.title +' '+ uuid)

            CREATE (u)-[:POSTED]->(a)

            FOREACH ( name IN $tagList |
                MERGE (t:Tag {name: name})
                ON CREATE SET t.id = randomUUID(),  t.slug = apoc.text.slug(name)

                MERGE (a)-[:HAS_TAG]->(t)
            )

            RETURN u,
                a,
                [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
                exists((a)<-[:FAVORITED]-(u)) AS favorited,
                size((a)<-[:FAVORITED]-()) AS favoritesCount
        `, {
            userId: req.user.getId(),
            article: {
                title: req.body.article.title,
                description: req.body.article.description,
                body: req.body.article.body
            },
            tagList: req.body.article.tagList,
        })
            .then(res => {
                const row = res.records[0]

                return new Article(
                    row.get('a'),
                    req.user,
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )
            })
            .then(article => article.toJson())
            .then(article => res.status(201).json({ article }))
            .catch(e => next(e))
    }
)

router.get('/feed', required, (req, res, next) => {
    const skip = int(0)
    const limit = int(10)

    const params = {
        userId: req.user ? req.user.getId() : null,
        skip, limit
    }

    const where = [];

    if ( req.query.author ) {
        where.push( `a.username = $author` )
        params.author = req.query.author
    }

    if ( req.query.favorited ) {
        where.push( `(a)<-[:FAVORITED]-({username: $favorited})` )
        params.favorited = req.query.favorited
    }

    if ( req.query.tag ) {
        where.push( ` ALL (tag in $tags WHERE (a)-[:HAS_TAG]->({name: tag})) ` )
        params.tags = req.query.tag.split(',')
    }

    return req.neo4j.read(`
        MATCH (current:User)-[:FOLLOWS]->(u)-[:POSTED]->(a)
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}

        WITH count(a) AS articlesCount, collect(a) AS articles

        UNWIND articles AS a

        WITH articlesCount, a
        ORDER BY a.createdAt DESC
        SKIP $skip LIMIT $limit

        RETURN
            articlesCount,
            a,
            [ (a)<-[:POSTED]-(u) | u ][0] AS author,
            [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
            CASE
                WHEN $userId IS NOT NULL
                THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                ELSE false
            END AS favorited,
            size((a)<-[:FAVORITED]-()) AS favoritesCount
    `, params)
        .then(res => {

            const articlesCount = res.records.length ? res.records[0].get('articlesCount') : 0
            const articles = res.records.map(row => {
                return new Article(
                    row.get('a'),
                    new User(row.get('author')),
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )
            })

            return {
                articlesCount,
                articles: articles.map(a => a.toJson()),
            }
        })
        .then(json => res.json(json))
        .catch(e => next(e))
})

router.get('/:slug', optional, (req, res, next) => {
    const { slug } = req.params

    return req.neo4j.read(`
        MATCH (a:Article {slug: $slug})
        RETURN
            a,
            [ (a)<-[:POSTED]-(u) | u ][0] AS author,
            [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
            CASE
                WHEN $userId IS NOT NULL
                THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                ELSE false
            END AS favorited,
            size((a)<-[:FAVORITED]-()) AS favoritesCount
    `, { slug, userId: req.user.getId()})
        .then(res => {
            if ( res.records.length ) {
                const row = res.records[0]

                const article = new Article(
                    row.get('a'),
                    new User(row.get('author')),
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )

                return article.toJson()
            }
        })
        .then(article =>
            article ? res.json({ article }) : res.status(404).json({
                code: 404,
                message: 'Not Found'
            })
        )
})

router.put('/:slug',
    optional,
    [
        check('article.title').optional().notEmpty(),
        check('article.description').optional().notEmpty(),
        check('article.body').optional().notEmpty(),
        check('article.tagList').optional().isArray().notEmpty(),
    ],
    validate,
    (req, res, next) => {
        const keys = [ 'title', 'description', 'body', ]

        const updates = Object.fromEntries( Object.keys(req.body.article)
            .filter( key => keys.includes(key) && req.body.article.hasOwnProperty(key) && req.body.article[ key ] !== null)
            .map( key => [key, req.body.article[ key ] ])
        )

        const tagList = req.body.article.tagList || []

        return req.neo4j.write(`
            MATCH (u:User {id: $userId})-[:POSTED]->(a:Article {slug: $slug})

            SET a += $updates

            FOREACH (r IN CASE WHEN size($tagList) > 0 THEN [ (a)-[r:HAS_TAG]->() | r] ELSE [] END |
                DELETE r
            )

            FOREACH ( name IN $tagList |
                MERGE (t:Tag {name: name}) ON CREATE SET t.id = randomUUID(), t.slug = apoc.text.slug(name)
                MERGE (a)-[:HAS_TAG]->(t)
            )

            RETURN
                a,
                [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
                CASE
                    WHEN $userId IS NOT NULL
                    THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                    ELSE false
                END AS favorited,
                size((a)<-[:FAVORITED]-()) AS favoritesCount
        `, {
            slug: req.params.slug,
            userId: req.user.getId(),
            updates,
            tagList
        })
            .then(res => {
                if ( !res.records.length ) return undefined;

                const row = res.records[0]

                const article = new Article(
                    row.get('a'),
                    req.user,
                    row.get('tagList').map(tag => new Tag(tag)),
                    row.get('favoritesCount'),
                    row.get('favorited')
                )

                return article.toJson()
            })
            .then(article =>
                article ? res.json({ article }) : res.status(404).json({
                    code: 404,
                    message: 'Not Found'
                })
            )
            .catch(e => next(e))
    }
)

router.post('/:slug/favorite', required, (req, res, next) => {
    req.neo4j.write(`
        MATCH (a:Article {slug: $slug})
        MATCH (u:User {id: $userId})

        MERGE (u)-[r:FAVORITED]->(a)
        ON CREATE SET r.createdAt = datetime()

        RETURN a,
            [ (a)<-[:POSTED]-(ux) | ux ][0] AS author,
            [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
            CASE
                WHEN $userId IS NOT NULL
                THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                ELSE false
            END AS favorited,
            size((a)<-[:FAVORITED]-()) AS favoritesCount
    `, {
        slug: req.params.slug,
        userId: req.user.getId(),
    })
        .then(res => {
            if ( !res.records.length ) return undefined;

            const row = res.records[0]

            const article =  new Article(
                row.get('a'),
                new User(row.get('author')),
                row.get('tagList').map(tag => new Tag(tag)),
                row.get('favoritesCount'),
                row.get('favorited')
            )

            return article.toJson()
        })
        .then(article =>
            article ? res.status(201).json({ article }) : res.status(404).json({
                code: 404,
                message: 'Not Found'
            })
        )
        .catch(e => next(e))
})

router.delete('/:slug/favorite', required, (req, res, next) => {
    req.neo4j.write(`
        MATCH (a:Article {slug: $slug})
        MATCH (u:User {id: $userId})

        OPTIONAL MATCH (u)-[r:FAVORITED]->(a)
        DELETE r

        RETURN a,
            [ (a)<-[:POSTED]-(ux) | ux ][0] AS author,
            [ (a)-[:HAS_TAG]->(t) | t ] AS tagList,
            CASE
                WHEN $userId IS NOT NULL
                THEN exists((a)<-[:FAVORITED]-({id: $userId}))
                ELSE false
            END AS favorited,
            size((a)<-[:FAVORITED]-()) AS favoritesCount
    `, {
        slug: req.params.slug,
        userId: req.user.getId(),
    })
        .then(res => {
            if ( !res.records.length ) return undefined;

            const row = res.records[0]

            const article =  new Article(
                row.get('a'),
                new User(row.get('author')),
                row.get('tagList').map(tag => new Tag(tag)),
                row.get('favoritesCount'),
                row.get('favorited')
            )

            return article.toJson()
        })
        .then(article =>
            article ? res.status(202).json({ article }) : res.status(404).json({
                code: 404,
                message: 'Not Found'
            })
        )
        .catch(e => next(e))
})

router.post('/:slug/comments',
    [ check('comment.body').notEmpty() ],
    validate,
    required,
    (req, res, next) => {
        req.neo4j.write(`
            MATCH (a:Article {slug: $slug})
            MATCH (u:User {id: $userId})

            CREATE (u)-[:COMMENTED]->(c:Comment {
                id: randomUUID(),
                createdAt: datetime(),
                updatedAt: datetime(),
                body: $body
            })-[:FOR]->(a)

            RETURN c, u
        `, {
            slug: req.params.slug,
            userId: req.user.getId(),
            body: req.body.comment.body,
        })
            .then(res => {
                if ( !res.records.length ) return undefined;

                const row = res.records[0]

                const comment = new Comment(row.get('c'), new User(row.get('u')))

                return comment.toJson()
            })
            .then(comment =>
                comment ? res.status(202).json({ comment }) : res.status(404).json({
                    code: 404,
                    message: 'Not Found'
                })
            )
            .catch(e => next(e))
    }
)

router.get('/:slug/comments', optional, (req, res, next) => {
    req.neo4j.read(`
        MATCH (:Article {slug: $slug})<-[:FOR]-(c:Comment)<-[:COMMENTED]-(u)
        RETURN c, u
        ORDER BY c.createdAt DESC
    `, { slug: req.params.slug })
        .then(res => {
            if ( !res.records.length ) return [];

            return res.records.map(row => new Comment(row.get('c'), new User(row.get('u'))))
        })
        .then(rows => rows.map(row => row.toJson()))
        .then(comments => res.send({ comments }))
        .catch(e => next(e))

})

router.delete('/:slug/comments/:commentId', required, (req, res, next) => {
    req.neo4j.write(`
        MATCH (:Article {slug: $slug})<-[:FOR]-(c:Comment {id: $commentId})<-[:COMMENTED]-(a:User {id: $userId})
        DETACH DELETE c
        RETURN c, a
    `, {
        slug: req.params.slug,
        userId: req.user.getId(),
        commentId: req.params.commentId,
    })
        .then(res => res.records.length)
        .then(records => records ? res.status(204).send('OK') : res.status(404).json({
            code: 404,
            message: 'Not Found'
        }))
        .catch(e => next(e))
})

router.delete('/:slug', required, (req, res, next) => {
    req.neo4j.write(`
        MATCH (u:User {id: $userId})-[:POSTED]->(a:Article {slug: $slug})
        FOREACH (c IN [ (a)<-[:ON]-(c:Comment) | c ] |
            DETACH DELETE c
        )
        DETACH DELETE a
        RETURN a
    `, {
        slug: req.params.slug,
        userId: req.user.getId(),
    })
        .then(res => res.records.length)
        .then(records => records ? res.status(204).send('OK') : res.status(404).json({
            code: 404,
            message: 'Not Found'
        }))
        .catch(e => next(e))
})

module.exports = router