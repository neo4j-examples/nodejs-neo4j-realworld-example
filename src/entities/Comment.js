module.exports = class Comment {

    constructor(node, author) {
        this.node = node
        this.author = author
    }

    toJson() {
        return {
            ...this.node.properties,
            author: this.author.toJson(),
        }
    }

}