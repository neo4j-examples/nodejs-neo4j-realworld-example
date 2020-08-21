const neo4j = require('neo4j-driver')
const config = require('./config')

const driver = neo4j.driver(config.neo4j.url, neo4j.auth.basic(config.neo4j.username, config.neo4j.password))

module.exports = {
    read: (cypher, params = {}, database = config.neo4j.database) => {
        const session = driver.session({
            defaultAccessMode: neo4j.session.READ,
            database,
        })

        return session.run(cypher, params)
            .then(res => {
                session.close()
                return res
            })
            .catch(e => {
                session.close()
                throw e
            })
    },
    write: (cypher, params = {}, database = config.neo4j.database) => {
        const session = driver.session({
            defaultAccessMode: neo4j.session.WRITE,
            database,
        })

        return session.run(cypher, params)
            .then(res => {
                session.close()
                return res
            })
            .catch(e => {
                session.close()
                throw e
            })
    },
}