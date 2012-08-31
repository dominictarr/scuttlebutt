# readable-stream

    Stability: 1 - Experimental

An exploration of a new kind of readable streams for Node.js

This is an abstract class designed to be extended.  It also provides a
`wrap` method that you can use to provide the simpler readable API for
streams that have the "readable stream" interface of Node 0.8 and
before.

## Usage

```javascript
var Readable = require('readable-stream');
var r = new Readable();

r.read = function(n) {
  // your magic goes here.
  // return n bytes, or null if there is nothing to be read.
  // if you return null, then you MUST emit 'readable' at some
  // point in the future if there are bytes available, or 'end'
  // if you are not going to have any more data.
  //
  // You MUST NOT emit either 'end' or 'readable' before
  // returning from this function, but you MAY emit 'end' or
  // 'readable' in process.nextTick().
};

r.on('end', function() {
  // no more bytes will be provided.
});

r.on('readable', function() {
  // now is the time to call read() again.
});
```

## Justification

Writable streams in node are very straightforward to use and extend.
The `write` method either returns `true` if the bytes could be
completely handled and another `write` should be performed, or `false`
if you would like the user to back off a bit, in which case a `drain`
event at some point in the future will let them continue writing.  The
`end()` method lets the user indicate that no more bytes will be
written.  That's pretty much the entire required interface for
writing.

However, readable streams in Node 0.8 and before are rather
complicated.

1. The `data` events start coming right away, no matter what.  There
   is no way to do other actions before consuming data, without
   handling buffering yourself.
2. If you extend the interface in userland programs, then you must
   implement `pause()` and `resume()` methods, and take care of
   buffering yourself.

So, while writers only have to implement `write()`, `end()`, and
`drain`, readers have to implement (at minimum):

* `pause()` method
* `resume()` method
* `data` event
* `end` event

If you are using a readable stream, and want to just get the first 10
bytes, make a decision, and then pass the rest off to somewhere else,
then you have to handle buffering, pausing, and so on.  This is all
rather brittle and easy to get wrong for all but the most trivial use
cases.

Additionally, this all made the `reader.pipe(writer)` method
unnecessarily complicated and difficult to extend without breaking
something.  Backpressure and error handling is especially challenging
and brittle.

### Solution

The reader does not have pause/resume methods.  If you want to consume
the bytes, you call `read()`.  If bytes are not being consumed, then
effectively the stream is in a paused state.  It exerts backpressure
on upstream connections, doesn't read from files, etc.

If `read()` returns `null`, then a future `readable` event will be
fired when there are more bytes ready to be consumed.

This is simpler and conceptually closer to the underlying mechanisms.
The resulting `pipe()` method is much shorter and simpler.

### Compatibility

It's not particularly difficult to wrap older-style streams in this
new interface, or to wrap this type of stream in the older-style
interface.

The `Readable` class takes an argument which is an old-style stream
with `data` events and `pause()` and `resume()` methods, and uses that
as the data source.  For example:

```javascript
var r = new Readable(oldReadableStream);

// now you can use r.read(), and it will emit 'readable' events
```

The `Readable` class will also automatically convert into an old-style
`data`-emitting stream if any listeners are added to the `data` event.
So, this works fine, though you of course lose a lot of the benefits of
the new interface:

```javascript
var r = new ReadableThing();

r.on('data', function(chunk) {
  // ...
});

// now pause, resume, etc. are patched into place, and r will
// continually call read() until it returns null, emitting the
// returned chunks in 'data' events.

r.on('end', function() {
  // ...
});
```
