"use strict";

module.exports = FSReadable;

// This uses the existing bindings in Node's FS module to
// implement a read-method style readable stream.
//
// In a perfect world, some of this dancing and buffering would
// not be necessary; we could just open the file using async IO,
// and then read() synchronously until we raise EWOULDBLOCK.
//
// It a just-slightly-less imperfect world, FS readable streams
// would be the *only* stream that implements this kind of buffering
// behavior, since TCP and pipes can be reliably implemented in this
// fashion at a much lower level.

var Readable = require('./readable.js');
var util = require('util');
var fs = require('fs');
var StringDecoder = require('string_decoder').StringDecoder;
var assert = require('assert');


// a very basic memory pool.  this optimization helps revent lots
// of allocations when there are many fs readable streams happening
// concurrently.
var pool;
var minPoolSpace = 128;
var poolSize = 40 * 1024;
function allocNewPool() {
  pool = new Buffer(poolSize);
  pool.used = 0;
}

util.inherits(FSReadable, Readable);

function FSReadable(path, options) {
  Readable.apply(this);

  if (!options) options = {};

  this._buffer = [];
  this._bufferLength = 0;

  this.path = path;
  this.flags = 'r';
  this.mode = 438; //=0666
  this.fd = null;
  this.bufferSize = 64 * 1024;

  Object.keys(options).forEach(function(k) {
    this[k] = options[k];
  }, this);

  // cast to an int
  assert(typeof this.bufferSize === 'number');
  this.bufferSize = ~~this.bufferSize;

  if (this.encoding) {
    this._decoder = new StringDecoder(this.encoding);
  }

  var typeofStart = typeof this.start;
  if (typeofStart !== 'undefined') {
    if (typeofStart !== 'number') {
      throw new TypeError('start must be a Number');
    }
    var typeofEnd = typeof this.end;
    if (typeofEnd === 'undefined') {
      this.end = Infinity;
    } else if (typeofEnd !== 'number') {
      throw new TypeError('end must be a Number');
    }

    this.pos = this.start;
  }

  if (typeof this.fd !== 'number') {
    this.open();
  }
}

FSReadable.prototype.open = function() {
  fs.open(this.path, this.flags, this.mode, function(er, fd) {
    if (er) {
      this.destroy();
      this.emit('error', er);
      return;
    }

    this.fd = fd;
    this.emit('open', fd);
    this._read();
  }.bind(this));
}

FSReadable.prototype._read = function() {
  assert(typeof this.fd === 'number');

  if (this.reading || this.ended || this.destroyed) return;
  this.reading = true;

  if (!pool || pool.length - pool.used < minPoolSpace) {
    // discard the old pool. Can't add to the free list because
    // users might have refernces to slices on it.
    pool = null;
    allocNewPool();
  }

  var thisPool = pool;
  var toRead = Math.min(pool.length - pool.used, this.bufferSize);
  var start = pool.used;

  if (this.pos !== undefined) {
    toRead = Math.min(this.end - this.pos + 1, toRead);
  }

  if (toRead <= 0) {
    this.reading = false;
    this.emit('readable');
    return;
  }

  fs.read(this.fd, pool, pool.used, toRead, this.pos, afterRead.bind(this));

  function afterRead(er, bytesRead) {
    this.reading = false;

    if (er) {
      this.destroy();
      this.emit('error', er);
      return;
    }

    if (bytesRead === 0) {
      this.ended = true;
      if (this._bufferLength === 0) this.emit('end');
      this.close();
      return;
    }

    var b = thisPool.slice(start, start + bytesRead);

    var needReadableEvent = this._bufferLength === 0;
    this._bufferLength += bytesRead;
    this._buffer.push(b);
    if (needReadableEvent) this.emit('readable');
  }
}

FSReadable.prototype.read = function(n) {
  if (this._bufferLength === 0) return null;

  if (isNaN(n) || n <= 0) n = this._bufferLength;

  var ret;
  if (n >= this._bufferLength) {
    ret = Buffer.concat(this._buffer);
    this._bufferLength = 0;
    this._buffer.length = 0;
  } else {
    // read just some of it.
    if (n === this._buffer[0].length) {
      // first buffer is a perfect match
      ret = this._buffer.shift();
    } else if (n < this._buffer[0].length) {
      // just take a part of the first buffer.
      var buf = this._buffer[0];
      ret = buf.slice(0, n);
      this._buffer[0] = buf.slice(n);
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

  if (this._bufferLength === 0 && this.ended) {
    process.nextTick(this.emit.bind(this, 'end'));
    this.close();
  }

  // if we've consumed below the desired threshold, pull in more bytes.
  if (this._bufferLength < this.bufferSize) {
    this._read();
  }

  if (this._decoder) ret = this._decoder.write(ret);

  return ret;
};

FSReadable.prototype.close = function(cb) {
  if (cb) this.once('close', cb);
  if (this.closed) {
    return process.nextTick(this.emit.bind(this, 'close'));
  }
  this.closed = true;

  fs.close(this.fd, function(er) {
    if (er) this.emit('error', er);
    else this.emit('close');
  }.bind(this));
};

FSReadable.prototype.destroy = function() {
  this.destroyed = true;
  fs.close(this.fd, function() {});
};
