module.exports = Subscription

function Subscription (callback, context) {
    this.callback = callback
    this.context = context
    this.nodes = []
}

var proto = Subscription.prototype

proto.trigger = function (data) {
    return this.callback.call(this.context, data)
}

proto.register = function (node) {
	this.nodes = this.nodes.slice()
    this.nodes.push(node)
	return this
}

proto.deregister = function (node) {
    this.nodes = this.node.filter(function (n) {return n === node})
    return this
}

proto.once = function () {
	var trigger = this.trigger
	this.trigger = function (data) {
		this.remove()
        return trigger.call(this, data)
    }
}

proto.remove = function () {
    this.nodes.forEach(function (topic) {
        topic.off(this)
    }, this)
    this.nodes = []
	return this
}
