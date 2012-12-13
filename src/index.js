var Subscription = require('./Subscription')
  , keys = Object.keys

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
	if (typeof directions === 'string') directions = directions.split('.')
	var topic = this 
	  , edge 
	  , i = 0
	
	while (edge = directions[i++]) {
		if (topic[edge])
			if (reserved[edge]) throw new Error('Reserved word: '+edge)
			else topic = topic[edge]
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

/**
 * Create function to filter subscriptions and notify those which don't make the cut
 * @api private
 */
function makeChecker (callback, node) {
	switch (typeof callback) {
		case 'function':
			return function (s) {
				if (s.callback !== callback) return true
				s.deregister(node)
			}
		case 'string':
			return function (s) {
				if (s.callback.name !== callback) return true
				s.deregister(node)
			}
		case 'object':
			return function (s) {
				if (s !== callback) return true
				s.deregister(node)
			}
		default:
			// if the user didn't pass a callback, all listeners will be removed
			return function (s) {s.deregister(node)}
	}
}

/**
 * Filter the current topics subscriptions and recurse on its sub-topics
 * @api private
 */
function removeListener (node, checker) {
	var topics = keys(node)
	  , count = 0
	topics.forEach(function (topic) {
		if (!reserved[topic]) {
			var subs = removeListener(node[topic], checker)
			if (!subs) delete node[topic]
			count += subs
		}
	})
	// Is the node still worth having around?
	return (node._subs = node._subs.filter(checker)).length + count
}

function del (node, child) {
	(function notifyAll (node) {
		node._subs.forEach(function (sub) {
			sub.deregister(node)
		})
		keys(node).forEach(function (topic) {
			if (!reserved[topic]) notifyAll(node[topic])
		})
	})(node[child]);
	delete node[child]
}

proto.off = function (topics, callback) {
	if (typeof topics === 'string') {
		if (callback != null) {
			topics.split(/\s*\|\|\s*/).forEach(function (topic) {
				var node = this.get(topic)
				if (node && !removeListener(node, makeChecker(callback, node))) {
					node = topic.split('.')
					topic = node.pop()
					node = this.get(node.join('.'));
					delete node[topic]
				}
			}, this)
		}
		else {
			topics.split(/\s*\|\|\s*/).forEach(function (topic) {
				topic = topic.split('.')
				callback = topic.pop()
				topic = this.get(topic.join('.'))
				if (topic && topic[callback]) del(topic, callback)
			}, this)
		}
	}
	else {
		if (topics) {
		// `topics` in this case being the `callback`
			removeListener(this, makeChecker(topics, this))
		}
		else {
		// Clean the slate
			Object.keys(this).forEach(function (key) {
				if (!reserved[key]) del(this, key)
			}, this)
			this._subs = []
		}
	}
}
