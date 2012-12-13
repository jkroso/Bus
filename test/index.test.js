var Bus = require('../src/index.js'),
	Subscription = require('../src/Subscription'),
	chai = require('chai'),
	should = chai.should(),
	spies = require('chai-spies')

chai.use(spies)
// chai.Assertion.includeStack = true

describe('Bus', function (emitter) {
	function noop () {}
	function noop2 () {}

	function hasListeners (where) {
		if (!where.length) {
			Array.prototype.slice.call(arguments, 1).forEach(function (fn) {
				var res = false
				emitter._subs.forEach(function (sub) {
					if (sub === fn || sub.callback === fn) res = true
				})
				res.should.be.true
			})
			return
		}
		(function recur (emitter, arr) {
			var event = arr.shift()
			emitter.should.have.property(event).and.is.instanceOf(Bus)
			if (arr.length) {
				emitter = emitter[event]
				recur.apply(this, arguments)
			}
			else {
				emitter[event].should.have.property('_subs').an('array')
				Array.prototype.slice.call(arguments, 2).forEach(function (fn, i) {
					var res = false
					emitter[event]._subs.forEach(function (sub) {
						if (sub === fn || sub.callback === fn) res = true
					})
					res.should.be.true
				})
			}
		}).apply(this, [emitter].concat(Array.apply(null,arguments)))
	}
	function notListeners (where) {
		if (!where.length) {
			Array.prototype.slice.call(arguments, 1).forEach(function (fn) {
				emitter._subs.forEach(function (sub) {
					sub.should.not.equal(fn)
					sub.callback.should.not.equal(fn)
				})
			})
			return
		}
		(function recur (emitter, where) {
			var event = where.shift()
			if (!emitter[event]) return
			emitter[event].should.be.an.instanceOf(Bus)
			if (where.length) {
				emitter = emitter[event]
				recur.apply(this, arguments)
			}
			else {
				emitter[event].should.have.property('_subs').an('array')
				Array.prototype.slice.call(arguments, 2).forEach(function (fn) {
					emitter[event]._subs.forEach(function (sub) {
						sub.should.not.equal(fn)
						sub.callback.should.not.equal(fn)
					})
				})
			}
		}).apply(this, [emitter].concat(Array.apply(null,arguments)))
	}

	beforeEach(function () {
		emitter = new Bus
	})

	it('should have a _subs property', function () {
		emitter.should.have.keys(['_subs'])
	})
	describe('.on()', function () {
		it('should return a Subscription', function () {
			emitter.on('event.nested', noop).should.be.an.instanceOf(Subscription)
		})
		it('should call register on the subscription', function () {
			var spy = chai.spy()
			var sub = new Subscription(noop, this)
			sub.register = spy
			emitter.on(sub)
			spy.should.have.been.called()
			spy.should.have.been.called.with(emitter)
		})
		describe('.on(\'event.nested\', fn)', function () {
			it('should store a subscription', function () {
				emitter.on('event.nested', noop)
				hasListeners(['event', 'nested'], noop)
			})
			it('should store several subscriptions', function () {
				emitter.on('event.nested', noop)
				emitter.on('event.nested', noop2)
				hasListeners(['event', 'nested'], noop, noop2)
			})
			it('should \'t allow events to override the API', function () {
				['on', 'off', 'emit', 'get'].forEach(function (method) {
					(function () {
						emitter.on(method)
					}).should.throw(Error, /(?:R|r)eserved.*word/)
				})
			})
		})
		describe('.on(\'a||b||c\', fn)', function () {
			it('should bind the same function to all slots', function () {
				var sub = emitter.on('a||b||c', noop)
				should.exist(emitter.a)
				should.exist(emitter.b)
				should.exist(emitter.c)
				emitter.a._subs.should.include(sub)
				emitter.b._subs.should.include(sub)
				emitter.c._subs.should.include(sub)
			})
		})
		describe('.on(fn)', function () {
			it('should bind to the top level Bus', function () {
				var sub = emitter.on(noop)
				emitter._subs.should.deep.equal([sub])
			})
		})
		describe('.on([event,] subscription)', function () {
			it('should not require a topic', function () {
				var sub = new Subscription
				emitter._subs.should.not.include(sub)
				emitter.on(sub)                
				emitter._subs.should.include(sub)
			})
			it('should append the subscription to the correct topic', function () {
				var sub = new Subscription
				emitter.on('event.nested', sub)                
				emitter.event.nested._subs.should.include(sub)
			})
		})
	})    
	describe('.off()', function (sub) {
		function noop () {}

		beforeEach(function () {
			sub = emitter.on('event.nested', noop)
		})

		it('should return undefined', function () {
			should.not.exist(emitter.off('not.existing')) 
		})
		describe('.off([event,] fn)', function () {
			it('should remove the subscription from the topic', function () {
				hasListeners(['event','nested'], noop)
				emitter.off('event.nested', noop)
				notListeners(['event','nested'], noop)
			})
			it('should remove all matching subscriptions on sub-topics', function () {
				emitter.on('event', noop)
				hasListeners(['event','nested'], noop)
				hasListeners(['event'], noop)
				emitter.off(noop)
				notListeners(['event','nested'], noop)
				notListeners(['event'], noop)
			})
			it('should leave listeners bound to parent topics', function () {
				emitter.on(noop)
				emitter.off('event', noop)
				notListeners(['event','nested'], noop)
				hasListeners([], noop)
			})
		})
		describe('.off(event)', function () {
			it('should remove the topic', function () {
				should.exist(emitter.event.nested)                
				emitter.off('event.nested')
				should.exist(emitter.event)
				should.not.exist(emitter.event.nested)
			})
			it('should remove all disjuncted topics', function () {
				var sub = emitter.on('a||b||c', noop)
				emitter.off('a||b', noop)
				should.not.exist(emitter.a)
				should.not.exist(emitter.b)
				hasListeners(['c'], noop)
			})
			it('should also handle nested topics which are disjuncted', function () {
				var sub = emitter.on('a||b.b||c', noop)
				emitter.off('a||b.b', noop)
				should.not.exist(emitter.a)
				should.not.exist(emitter.b.b)
				hasListeners(['c'], noop)
			})
			it('should call .deregister() on all subscriptions at or below the matching topic', function () {
				var sub = new Subscription(noop, this)
				sub.deregister = chai.spy()
				emitter.on(sub)
				emitter.on('event', sub)
				emitter.on('event.nested', sub)
				emitter.off(sub)
				sub.deregister.should.have.been.called(3)
			})
		})
		describe('.off([event,] subscription)', function () {
			it('should not require a topic', function () {
				emitter.on(sub)
				emitter._subs.should.include(sub)
				emitter.off(sub)
				emitter._subs.should.not.include(sub)
			})
			it('should deeply remove the subscription', function () {
				emitter.off(sub)
				notListeners([], sub)
				notListeners(['event'], sub)
				notListeners(['event', 'nested'], sub)
			})
			it('should remove from the specified topic', function () {
				emitter.off('event.nested', sub)
				notListeners(['event', 'nested'], sub)
			})
			it('should call deregister on the matching subscription', function () {
				var spy = chai.spy()
				var sub = new Subscription(noop, this)
				sub.deregister = spy
				emitter.on(sub)
				emitter.off(sub)
				spy.should.have.been.called()
				spy.should.have.been.called.with(emitter)
			})
		})
		describe('.off()', function () {
			it('should clear all subscriptions and subtopics', function () {
				emitter.on(noop)
				emitter.off()
				emitter._subs.should.be.a('array').and.have.a.lengthOf(0)
			})
		})
		describe('.off([event,] string)', function () {
			it('should remove all subscription with named functions matching the string', function () {
				emitter.off('event.nested', 'noop')  
				notListeners(['event', 'nested'], noop)
			})
			it('Can unsubscribe anonamous functions while leaving named functions', function () {
				var anon = function () {}
				emitter.on('event.nested', anon)
				emitter.off('event.nested', '')
				notListeners(['event', 'nested'], anon)
			})
		})
	})
	describe('.emit()', function (spy, spy2) {
		var sentinel = {}
		beforeEach(function () {
			spy = chai.spy()
			spy2 = chai.spy()
		})
		it('Should invoke the subscriptions bound to the Bus it is called on', function () {
			emitter.on(spy)
			emitter.emit()
			spy.should.have.been.called()
		})
		it('should call then in the order they were added', function () {
			var order = 1
			emitter.on(function () {
				order.should.equal(1)
				order++
			})
			emitter.on(function () {
				order.should.equal(2)
				order++
			})
			emitter.emit()
			order.should.equal(3)
		})
		describe('.emit(topic)', function () {
			it('should call all topics within the path', function () {
				emitter.on('event', spy)
				emitter.on('event.nested', spy)
				emitter.emit('event.nested')
				spy.should.have.been.called.twice
			})
			it('should also call itelf', function () {
				emitter.on('event', spy)
				emitter.on(spy)
				emitter.emit('event')
				spy.should.have.been.called.twice
			})
			it('should not mind long paths', function () {
				emitter.on('event', spy)
				emitter.on(spy)
				emitter.emit('event.nested.more.heaps')
				spy.should.have.been.called.twice
			})
			it('should call in order of specificity', function () {
				var order = 1
				emitter.on('a.b.c.d', function one (data) {
					order.should.equal(1)
					order++
				})
				emitter.on('a.b.c', function two (data) {
					order.should.equal(2)
					order++
				})
				emitter.on('a.b', function three (data) {
					order.should.equal(3)
					order++
				})
				emitter.on('a', function four (data) {
					order.should.equal(4)
					order++
				})
				emitter.on(function five (data) {
					order.should.equal(5)
				})
				emitter.emit('a.b.c.d.e.f.g', 'Some data')
				order.should.equal(5)
			})
		})
		describe('.emit(topic, data)', function () {
			it('should pass the data to the subscriptions', function () {
				emitter.on('event', spy)
				emitter.emit('event', sentinel)
				spy.should.have.been.called.with.exactly(sentinel)
			})
		})
		describe('.emit(data)', function () {
			it('should call the top level Bus with the data', function () {
				emitter.on(spy)
				emitter.emit(sentinel)
				spy.should.have.been.called.with(sentinel)
			})
			it('should not work if the data happens to be a string', function () {
				emitter.on(spy)
				emitter.on('data', spy)
				emitter.emit('data')
				spy.should.have.been.called.twice
				spy.should.have.been.called.with()
			})
		})
		describe('If a subscription calls .off()', function () {
			it('should process all that were present at the time emit was called', function () {
				var sub1 = emitter.on('event', function() {
					spy2()
					emitter.off('event', sub2)
				})
				var sub2 = emitter.on('event', spy)
				emitter.emit('event')
				emitter.emit('event')
				spy.should.have.been.called.once
				spy2.should.have.been.called.twice
			})
		})
		describe('Propagation', function () {
			it('should stop once a subscription returns false', function () {
				emitter.on('event', spy2)
				emitter.on('event', function () {
					return false
				})
				emitter.on('event', spy)
				emitter.emit('event')
				spy.should.have.not.been.called()
				spy2.should.have.been.called()
			})
			it('should stop all higher level subscription aswell', function () {
				emitter.on('event', spy2)
				emitter.on('event', function () {
					return false
				})
				emitter.on(spy)
				emitter.emit('event')
				spy.should.have.not.been.called()
				spy2.should.have.been.called()
			})
		})
		describe('The calling context', function () {
			it('should be determined by the subscription', function () {
				emitter.on('event', function() {
					spy()
					this.should.equal(sentinel)
				}, sentinel)
				emitter.emit('event')
				spy.should.have.been.called()
			})
		})
	})
	describe('Subscription', function () {
		describe('.once()', function () {
			it('should remove the subscription after one call', function () {
				var spy = chai.spy()
				var sub = emitter.on(spy).once()
				hasListeners([], spy)
				emitter.emit()
				emitter.emit()
				spy.should.have.been.called.once
				notListeners([], spy)
			})
		})
	})
})