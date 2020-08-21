const fs = require('fs')

module.exports = file => {
    const buffer = fs.readFileSync(`${__dirname}/${file}.cypher`)
    return buffer.toString()
}