module.exports = class Tag {
    constructor(node) {
        this.node = node
    }

    toJson() {
        return this.node.properties.name
    }
}