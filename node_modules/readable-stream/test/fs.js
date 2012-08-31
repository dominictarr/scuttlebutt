var test = require('tap').test
var FSReadable = require('../fs.js');
var fs = require('fs');

var path = require('path');
var file = path.resolve(__dirname, 'fixtures', 'x1024.txt');

var size = fs.statSync(file).size;

// expect to see chunks no more than 10 bytes each.
var expectLengths = [];
for (var i = size; i > 0; i -= 10) {
  expectLengths.push(Math.min(i, 10));
}

var util = require('util');
var Stream = require('stream');

util.inherits(TestWriter, Stream);

function TestWriter() {
  Stream.apply(this);
  this.buffer = [];
  this.length = 0;
}

TestWriter.prototype.write = function(c) {
  this.buffer.push(c.toString());
  this.length += c.length;
  return true;
};

TestWriter.prototype.end = function(c) {
  if (c) this.buffer.push(c.toString());
  this.emit('results', this.buffer);
}

test('fs test', function(t) {
  var r = new FSReadable(file, { bufferSize: 10 });
  var w = new TestWriter();

  w.on('results', function(res) {
    console.error(res, w.length);
    t.equal(w.length, size);
    var l = 0;
    t.same(res.map(function (c) { return c.length; }), expectLengths);
    t.end();
  });

  r.pipe(w);
});
