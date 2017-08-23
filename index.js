const Patch = require('./patch')
const Operations = require('./operations')

module.exports = { compare: Patch.compare, fromJSON: Patch.fromJSON, Operations }