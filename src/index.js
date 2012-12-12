var Subscription = require('./Subscription')

exports = module.exports = Bus

function Bus () {
    this._subs = []
}

var proto = Bus.prototype

/**
 * Iterate over a list of listeners invoking each one
 * @param  {Array}   topics should be an array of listener arrays from the topics objects you wish to invoke
 * @param  {Any}     data   whatever you want passed to each of the subscribers
 * @return {Boolean}        true if no listeners prevented propagation
 */
exports.invokeList = invokeList
function invokeList (topics, data) {
    var len = topics.length, i, listeners
    while ( len-- ) {
        listeners = topics[len]
        i = listeners.length
        while (i--) {
            if (listeners[i].trigger(data) === false) return false
        }
    }
    return true
}

function insertListener (node, sub) {
    node._subs = [sub].concat(node._subs)
}

function removeListener (node, callback) {
    var check
    switch ( typeof callback ) {
        case 'function':
            check = function (listenerData) {
                return listenerData.callback !== callback
            }
            break
        case 'string':
            check = function (listenerData) {
                return listenerData.callback.name !== callback
            }
            break
        case 'object':
            check = function (listenerData) {
                return listenerData !== callback
            }
            break
        default:
            // if the user didn't pass a callback, all listeners will be removed
            check = function () {
                return false
            }
    }
    node._subs = node._subs.filter(check)
}

// Recursive collect with the ability to fork and combine
exports.branchingCollect = branchingCollect
function branchingCollect (node, directive) {
    var i = 0,
        len = directive.length,
        direction,
        key,
        result = [node._subs]
    while ( i < len ) {
        direction = directive[i++]
        key = direction[0]
        if ( key in node ) {
            result = result.concat(branchingCollect(node[key], direction.slice(1)))
        }
    }
    return result
}

// Takes an list of directions to follow and collects all listeners along the way
exports.collect = collect
function collect (node, directions) {
    var result = [node._subs],
        len = directions.length,
        i = 0
    while ( i < len ) {
        node = node[directions[i++]]
        if ( node )
            result.push(node._subs)
        else
            break
    }
    return result
}

var reserved = ['on', 'off', 'get', 'emit', '_subs'].reduce(function (o, w) {
    return o[w] = true, o
}, Object.create(null))

proto.get = function (directions, useforce) {
    if (!directions) return this
    directions = directions.split('.')
    var topic = this, edge, i = 0
    
    while (edge = directions[i++]) {
        if (reserved[edge]) throw new Error('Reserved word: '+edge)
        if (topic[edge]) topic = topic[edge]
        else if (useforce) topic = topic[edge] = new Bus
        else break
    }
    return topic
}

/**
 * If any callback returns false we immediately exit otherwise we simply 
 * return true to indicate that all callbacks were fired without interference
 * @param  {String} topic   the event type
 * @param  {Any}    data    any data you want passed to the callbacks
 * @return {Boolean}
 */
proto.emit = function (topic, data) {
    if ( typeof topic === 'string' ) {
        topic = collect(this, topic.split('.'))
    } else {
        data = topic
        topic = [this._subs]
    }
    return invokeList(topic, data)
}

proto.on = function (topics, callback, context) {
    if (typeof topics !== 'string') {
        callback = topics
        context = callback
        topics = ''
    }
    if (!(callback instanceof Subscription))
        callback = new Subscription(callback, context)

    topics.split(/\s*\|\|\s*/).forEach(function (directions) {
        directions = this.get(directions, true)
        callback.register(directions)
        insertListener(directions, callback)
    }, this)

    return callback
}

proto.off = function (topics, callback) {
    if (typeof topics === 'string') {
        if (callback) {
            topics.split(/\s*\|\|\s*/).forEach(function (topic) {
                removeListener(this.get(topic), callback)
            }, this)
        }
        else {
            topics.split(/\s*\|\|\s*/).forEach(function (topic) {
                topic = topic.split('.')
                callback = topic[topic.length - 1]
                topic.pop()
                topic = this.get(topic.join('.'))
                if (topic) delete topic[callback]
            }, this)
        }
    }
    else {
        if (topics) {
        // `topics` in this case being the `callback`
            removeListener(this, topics)
        }
        else {
        // Clean the slate
            Object.keys(this).forEach(function (key) {
                if (!reserved[key]) delete this[key]
            }, this)
            this._subs = []
        }
    }
}
