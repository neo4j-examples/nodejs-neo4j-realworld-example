const {
    isDuration,
    isLocalTime,
    isTime,
    isDate,
    isDateTime,
    isLocalDateTime,
    isInt,
    isPoint,
    types,
 } = require('neo4j-driver');
const { isNode, isRelationship } = require('neo4j-driver/lib/graph-types')
const { Result } = types

const toNative = (value, showLabelsOrType = false, showIdentity = false) => {
    if ( value === null ) return null
    else if ( value === undefined ) return null
    else if ( value instanceof Result || value.records ) {
        return value.records.map(row => Object.fromEntries(
            row.keys.map(key => [ key, toNative(row.get(key)) ])
        ))
    }
    else if ( Array.isArray(value) ) return value.map(value => toNative(value))
    else if ( isNode(value) ) return toNative({
        _id: showIdentity ?  toNative(value.identity) : undefined,
        _labels: showLabelsOrType ? toNative(value.labels) : undefined,
        ...toNative(value.properties),
    })
    else if ( isRelationship(value) ) return toNative({
        _id: showIdentity ? toNative(value.identity) : undefined,
        _type: showLabelsOrType? toNative(value.type) : undefined,
        ...toNative(value.properties),
    })
    // Number
    else if ( isInt(value) ) return value.toNumber()

    // Temporal
    else if (
        isDuration(value)  ||
        isLocalTime(value) ||
        isTime(value) ||
        isDate(value) ||
        isDateTime(value) ||
        isLocalDateTime(value)
    ) {
        return value.toString()
    }

    // Spatial
    if ( isPoint(value) ) {
        switch (value.srid.toNumber()) {
            case 4326:
                return { longitude: value.y, latitude: value.x }

            case 4979:
                return { longitude: value.y, latitude: value.x, height: value.z }

            default:
                return toNative({ x: value.x, y: value.y, z: value.z })
        }

    }

    // Object
    else if ( typeof value === 'object' ) {
        return Object.fromEntries(
            Object.keys(value).map(key => [key, toNative(value[ key ], showLabelsOrType, showIdentity)])
        )
    }

    return value
}

module.exports = (req, res, next) => {
    const json = res.json

    res.json = function (value) {
        json.call(this, toNative(value));
    }

    next()
}