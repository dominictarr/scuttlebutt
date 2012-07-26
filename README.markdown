# scuttlebutt

This seems like a silly name, but I assure you, this is real science. 
read this: http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf

or if you are lazy: http://en.wikipedia.org/wiki/Scuttlebutt (lazyness will get you nowhere, btw)

## srsly

okay, so this module implements the stream part of a gossip protocol. you can pipe each scuttlebutt
object to as many others as you wish, in any kinda random order. The end result will eventually end
up the same. It's your responsiblity to write your app so that it handles update events in this way.
That is just the way distributed programming is.
