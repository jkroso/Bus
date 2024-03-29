# Bus

A robust event framework. At least that is its goal. More specifically I intend to create an event system which provides simple and performant broad phase filtering (probably covering 80% of use cases) while providing a framework for more powerful filtering systems to operate within. 

## About event systems

The problem event systems are designed to solve is that of responding to change in state. For example when a user logs in we might want to load the app into the sate it was in when they last logged out. An event system provides a place for you to register you interest in changes in state. You want to execute the `loadLastState` function whenever a user logs in so you pass that function along with you registration. In doing so you are telling the event system that when this happens do that.
What event systems do then is house a bunch of subscriptions to particular types of changes in state. Then when an event occurs it looks for subscriptions whose conditions it can satisfy and calls their actions. Under the hood this is always going to be a process of elimination (a.k.a filtering). This is not a complicated task though an event system must be able to do it efficiently in order to be useful; since certain types of state can change very regularly. Take a clock or a users mouse for example.
A common way to implement an event system is to enforce the rule that all events have a well defined type. E.g. The event for a user logging in might get the type "login" though this is up to the programmer to decide. This allows for a very efficient implementation since filtering can be acheived by storing all subscriptions in a hash map. This design has some limitations though since what happens if you want to perform some action whenever any event occurs? You would have to subscribe to all possible types, which is impractical. Also what happens if want to subscribe to the "login" event but only the user is a customer. These are actually both very common cases.  
I will use [Backbone](http://backbonejs.org) to demonstrate common solutions to the problems I just mentioned. The first I will call the problem of types being too specific. Backbone deals with it by reserving a special event type for unfiltered events. It is called "all". The event system will do its thing then publish an "all" event as if that had been the original type of the event. The primary use case is for managing backbones collections. Whenever a model is added to a collection the collection will subscribe to the models "all" event and republish the events from the model as collection events. Remember events are used to represent changes in state. A change in the state of something which is a part of something else implies that the "something else" has also changed.  
The second problem is kind of the flip side of the first. It is that of not being specific enough. Backbone deals with this by introducing subtypes. A subtyped event might look like this "login:customer" with the semi-colon seperating the type from the sub-type. The primary use case for sub-types in backbone is to allow users to subscribe to changes on a certain attribute of a model. So lets say a you had a user model. The users login might be represented by the event "changed:login". In this case subscriptions to "changed" will still be fired since they still match. By providing sub-topics Backbone is reducing the number conditionals required in their users subscribed functions, while maintaining the efficient hash lookup filtering. This isn't really enough though since one sub-topic may still not be specific enough. For example how would the collection the user model belongs to represent the state change? perhaps it would like to publish it as "0:changed:login", but I'm not sure. Choosing topics is a difficult task since the its hard to know what will work best for the event consumer. 

## How is Bus better?

Bus uses a recursive graph structure to store its subscriptions. This means their are inherintly no limits on the number of sub topics you might choose for an event. You might not even choose to give an event a topic. Also unlike most other event systems which hide their subscriptions from users Bus leaves them exposed. So if you were to write this code `bus.on('event')` you could expect to find an event property on the `bus` object. Furthermore as I mentioned earlier Bus employees a recursive structure, so the object stored on `bus.event` is another instance of `Bus`. This has two implications. First the bad. It means property conflicts are not protected against. You can solve this problem easily with a proxy though. The upside is you trigger the sub-topic directly without firing and event on the main topic. That would look like this `bus.event.emit({data: 'stuff'})` as apposed to `bus.emit('event', {data: 'stuff'})`. A good explanation of this use case can be found [here](https://github.com/millermedeiros/js-signals/wiki/Comparison-between-different-Observer-Pattern-implementations)  

## Whats it missing?

* API documentaion. lol
* Doesn't yet manage its internal state perfectly. Some bus instances may sit around even after they have had their listeners removed. Making the .off() procedure fully recursive would be my first attempt at solving it though it would come at a performance cost. Come to think of it though the fact that I am removing any nodes in the bus graph might be a bad idea anyway. Since in cases where the user is holding a direct reference to a sub-topic it may become disconnected from the main graph unbeknownst to the user. This is something I would like to allow users to do. Perhaps it should be a rule then that once a node connected to the graph it can only be removed explicitly by the user.

## Getting Started
In the browser you can download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/jkroso/Bus/master/dist/Bus.min.js
[max]: https://raw.github.com/jkroso/Bus/master/dist/Bus.js

In node its available from npm as `loqe`

## Contributing
Please do! And feel free to discuss any ideas before you dive in. Just submit an issue.

## Release History
_(Nothing yet)_

## License
Copyright (c) 2012 Jakeb Rosoman  
Licensed under the MIT license.
