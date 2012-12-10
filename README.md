# Observer

Defines a constructor for subscription objects and topic objects, and returns a topic instance. Any topics you subscribe to on this instance will themselves be topic instances. Thereby creating a nice tree structure for your events. You could however use these topic objects to build all sorts of interesting event networks, even circular ones.

## Getting Started
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/jkroso/Observer/master/dist/Observer.min.js
[max]: https://raw.github.com/jkroso/Observer/master/dist/Observer.js

## Examples
Observer is defined as an AMD module which returns an instance. Not the constructor. This instance can be refereed to as the global instance.

```javascript
require(['Observer'], function (observer) {
	observer instanceof observer.constructor // true
})
```

To subscribe to events on the global instance (or any instance) use the `on` method

```javascript
observer.on(function (data) {
	console.log('An event fired on the global instance and was passed ', data)
})
```

To publish and event us the `publish` method 

```javascript
observer.publish('some arbitrary data') // true
```

The publish method return true in this case because none of the subscriptions returned `false`. Values returned from subscriptions which do not strictly === `false` are ignored. However, a value of `false` will case further subscriptions to be skipped. The returned boolean from the `publish` function is just their for convenience in case you need to check for cancellations.

If you want to be more specific about the type of event you are publishing you can pass as the first argument to `publish` an event type. 

```javascript
observer.publish('subtopic1', 'some arbitrary data') // true
```

In this case the effect will be exactly the same as the last event we published. Since the first subscription did not specify a topic it will be triggered on all topics. More specific topics though get priority over less specific ones. Adding a subscription to a specific topic is done as you would expect.

```javascript
observer.on('subtopic1', function (data) {
	console.log('subtopic1 received ', data)
})
```
Now if we were to publish the same 'subtopic1' event we fired before we would see the following in our console:
	
	'subtopic1 received some arbitrary data'
	'An event fired on the global instance and was passed some arbitrary data'

To demonstrate the what would happen if the 'subtopic1' subscription was to stopPropagation lets change the 'subtopic1' subscription to :

```javascript
observer.on('subtopic1', function (data) {
	console.log('subtopic1 received ', data)
	return false
})
```
This time if we were to publish the same event again we would only see the following in our console:

	'subtopic1 received some arbitrary data'

Furthermore false would be the returned value of `publish`.

If our desire is to only publish to the `subtopic1` subscription though we have another option. All instances of `Observer` have a `get` method. This method takes a topic as an argument and return that topic. Which if you have been paying attention you will realize is itself an instance `Observer`. Therefore, we publish an event using `subtopic1` as the base with the following code:

```javascript
observer.get('subtopic1').publish('some arbitrary data') // false
```
or
```javascript
observer.subtopic1.publish('some arbitrary data') // false
```
Again the publication process is canceled by the listener we subscribed so false is returned from the `publish` call. However, in this case it makes no actual difference since we called publish from `subtopic1` only listeners at or below it can be called. Note the second option will result in an error if `subtopic1` does not exist. This is desirable in some cases however.

In order to create a new instance completely separate from the global instance, invoke the modules constructor

```javascript
var newInstance = new observer.constructor
```

If at a later stage you decide you want to connect this instance to the global network that is not a problem:

```javascript
observer.subtopic2 = newInstance
```
Now you can run `observer.publish('subtopic2')`. Conversely if you want to disconnect a subtopic from a network you  can do so simple by taking a reference to it an deleting it from its parent topic. e.g

```javascript
var existingInstance = observer.subtopic1;
delete observer.subtopic1
```

Of course subtopic1 will still have its subscription we placed on it and can still be invoked though now we need to use `existingInstance.publish('some arbitrary data')`. Only difference is now we can't publish to `subtopic1` from the global instance.

Finally I need to mention you are not limited to publishing to immediate subtopics. To reach down multiple levels simple seperate your topics with a '.'. 

```javascript
oberver.publish('subtopic2.a.b.c.d.e', 'some arbitrary data')
```

What this does is walk down the network pooling together all `_listener` objects from each topic as it goes. Then once it has either run out of directions or fails to find a topic you specified it will sequencially trigger all those which it found. `_listener` objects are fully immutable. Therefore, `publish`, is an atomic operation since all required references to subscriptions are gathered before triggering any of them you are free to add and remove subscriptions from within subscriptions without effecting the current event.

## Documentation

Subscribe to an event using `observer.on`.

* [topics = null]: a ' ' separated list of direction strings. (separate directions with a '.') e.g. `topicA.topicB.topicC`
* [context = window]: What `this` will be when the callback is invoked.
* callback: Function to invoke when the message is published.
* [priority = 0]: Priority relative to other subscriptions for the same message. The higher the value the higher the priority. Use of negative numbers is permitted.

returns an instance of `Subscription`

The following will subscribe a function to both `topicC` and `anotherB`

```javascript
observer.on('topicA.topicB.topicC anotherA.anotherB', function (data) {})
```

Subscribe to the next instance of an event using `observer.once`. If the subscription is bound to multiple topics it will be removed from all of them not just the one that was triggered.

* [topics = null]: see `observer.on`
* [context = window]: see `observer.on`
* callback: see `observer.on`
* [priority = 0]: see `observer.on`

Publish an event using `observer.publish`

* [topic = null]: Directions to the topic. (separate topics with a '.') e.g. `topicA.topicB.topicC`
* [data = null]: A value to pass to each subscription

returns a boolean indicating whether or not the publication was canceled by any subscriptions

Unsubscribe using `observer.off`

* [topics = null]: see `observer.on`
* [callback = null]: can be a string referencing the name of the subscribed function, an instance of `Subscription`, a Function, or null to remove all subscriptions on the specified topic.

returns `undefined`

## Contributing
In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](https://github.com/cowboy/grunt).

_Also, please don't edit files in the "dist" subdirectory as they are generated via grunt. You'll find source code in the "lib" subdirectory!_

## Release History
_(Nothing yet)_

## License
Copyright (c) 2012 Jakeb Rosoman  
Licensed under the MIT license.
