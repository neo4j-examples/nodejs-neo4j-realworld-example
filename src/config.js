module.exports = {
    secret: process.env.NODE_ENV === 'production' ? process.env.SECRET : 'secret',

    rounds:  process.env.NODE_ENV === 'production' ? parseInt(process.env.ROUNDS) :10,

    neo4j: {
        url: 'neo4j://localhost:7687',
        username: 'neo4j',
        password: 'neo',
        database: 'neo4j',
    },
  };