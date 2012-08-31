"use strict";

module.exports = Readable;

var Stream = require('stream');
var util = require('util');

util.inherits(Readable, Stream);

function Readable(stream) {
  if (stream) this.wrap(stream);
  Stream.apply(this);
}

// override this method.
Readable.prototype.read = function(n) {
  return null;
};

Readable.prototype.pipe = function(dest, opt) {
  if (!(opt && opt.end === false || dest === process.stdout ||
        dest === process.stderr)) {
    this.on('end', dest.end.bind(dest));
  }

  dest.emit('pipe', this);

  flow.call(this);

  function flow() {
    var chunk;
    while (chunk = this.read()) {
      var written = dest.write(chunk);
      if (written === false) {
        dest.once('drain', flow.bind(this));
        return;
      }
    }
    this.once('readable', flow);
  }
};

// kludge for on('data', fn) consumers.  Sad.
// This is *not* part of the new readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.on = function(ev, fn) {
  if (ev === 'data') emitDataEvents(this);
  return Stream.prototype.on.call(this, ev, fn);
};
Readable.prototype.addListener = Readable.prototype.on;

function emitDataEvents(stream) {
  var paused = false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addEventListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;
    var c;
    while (!paused && (c = stream.read())) {
      stream.emit('data', c);
    }
    if (c === null) readable = false;
  });

  stream.pause = function() {
    paused = true;
  };

  stream.resume = function() {
    paused = false;
    if (readable) stream.emit('readable');
  };
}

// wrap an old-style stream
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  this._buffer = [];
  this._bufferLength = 0;
  var paused = false;
  var ended = false;

  stream.on('end', function() {
    ended = true;
    if (this._bufferLength === 0) {
      this.emit('end');
    }
  }.bind(this));

  stream.on('data', function(chunk) {
    this._buffer.push(chunk);
    this._bufferLength += chunk.length;
    this.emit('readable');
    // if not consumed, then pause the stream.
    if (this._bufferLength > 0 && !paused) {
      paused = true;
      stream.pause();
    }
  }.bind(this));

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  events.forEach(function(ev) {
    stream.on(ev, this.emit.bind(this, ev));
  }.bind(this));

  // consume some bytes.  if not all is consumed, then
  // pause the underlying stream.
  this.read = function(n) {
    var ret;

    if (this._bufferLength === 0) {
      ret = null;
    } else if (!n || n >= this._bufferLength) {
      // read it all
      ret = Buffer.concat(this._buffer);
      this._bufferLength = 0;
      this._buffer.length = 0;
    } else {
      // read just some of it.
      if (n < this._buffer[0].length) {
        // just take a part of the first buffer.
        var buf = this._buffer[0];
        ret = buf.slice(0, n);
        this._buffer[0] = buf.slice(n);
      } else if (n === this._buffer[0].length) {
        // first buffer is a perfect match
        ret = this._buffer.shift();
      } else {
        // complex case.
        ret = new Buffer(n);
        var c = 0;
        for (var i = 0; i < this._buffer.length && c < n; i++) {
          var buf = this._buffer[i];
          var cpy = Math.min(n - c, buf.length);
          buf.copy(ret, c, 0, cpy);
          if (cpy < buf.length) {
            this._buffer[i] = buf.slice(cpy);
            this._buffer = this._buffer.slice(i);
          }
          n -= cpy;
        }
      }
      this._bufferLength -= n;
    }

    if (this._bufferLength === 0) {
      if (paused) {
        stream.resume();
        paused = false;
      }
      if (ended) {
        process.nextTick(this.emit.bind(this, 'end'));
      }
    }
    return ret;
  };
};
