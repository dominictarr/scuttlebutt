var tap = require('tap');
var R = require('../readable');

var util = require('util');

function TestReader(n) {
  R.apply(this);
  this._buffer = new Buffer(n || 100);
  this._buffer.fill('x');
  this._pos = 0;
  this._bufs = 10;
}

util.inherits(TestReader, R);

TestReader.prototype.read = function(n) {
  var toRead = Math.min(n, this._buffer.length - this._pos);
  if (toRead === 0) {
    // simulate the read buffer filling up with some more bytes some time
    // in the future.
    setTimeout(function() {
      this._pos = 0;
      this._bufs -= 1;
      if (this._bufs === 0) {
        // read them all!
        this.emit('end');
      } else {
        this.emit('readable');
      }
    }.bind(this), 10);
    return null;
  }

  var ret = this._buffer.slice(this._pos, this._pos + toRead);
  this._pos += toRead;
  return ret;
};

tap.test('a most basic test', function(t) {
  var r = new TestReader(20);

  var reads = [];
  var expect = [ 'x',
                 'xx',
                 'xxx',
                 'xxxx',
                 'xxxxx',
                 'xxxxx',
                 'xxxxxxxx',
                 'xxxxxxxxx',
                 'xxx',
                 'xxxxxxxxxxxx',
                 'xxxxxxxx',
                 'xxxxxxxxxxxxxxx',
                 'xxxxx',
                 'xxxxxxxxxxxxxxxxxx',
                 'xx',
                 'xxxxxxxxxxxxxxxxxxxx',
                 'xxxxxxxxxxxxxxxxxxxx',
                 'xxxxxxxxxxxxxxxxxxxx',
                 'xxxxxxxxxxxxxxxxxxxx',
                 'xxxxxxxxxxxxxxxxxxxx' ];

  r.on('end', function() {
    t.same(reads, expect);
    t.end();
  });

  var readSize = 1;
  function flow() {
    var res;
    while (null !== (res = r.read(readSize++))) {
      reads.push(res.toString());
    }
    r.once('readable', flow);
  }

  flow();
});
