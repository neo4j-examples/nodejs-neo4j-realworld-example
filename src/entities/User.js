const neo4j = require('../neo4j')
const bcrypt = require('bcrypt')
const { rounds } = require('../config')

module.exports = class User {

    constructor(node, following) {
        this.node = node
        this.following = following
    }

    getId(){
        return this.node.properties.id
    }

    getPassword() {
        return this.node.properties.password
    }

    getClaims() {
        const { username, email, bio, image } = this.node.properties

        return {
            sub: username,
            username,
            email,
            bio,
            image: image || 'https://picsum.photos/200',
        }
    }

    toJson() {
        const { password, bio, image, ...properties } = this.node.properties;

        return {
            image: image || 'https://picsum.photos/200',
            bio: bio || null,
            following: this.following,
            ...properties,
        }
    }

    update(properties) {
        if ( properties.password ) properties.password = bcrypt.hashSync(properties.password, rounds)

        return neo4j.write(`
            MATCH (u:User {id: $id})
            SET u += $properties
            RETURN u
        `, { id: this.getId(), properties })
            .then(res => {
                this.node = res.records[0].get('u')
                return this
            })
    }

}