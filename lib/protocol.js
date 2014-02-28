/*
 Copyright (c) 2014, The Mineserver Project
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * Neither the name of the The Mineserver Project nor the
 names of its contributors may be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var util = require('util');
var stream = require("stream");

var Protocol = function Protocol(options) {

  if (!(this instanceof Protocol)) {
    return new Protocol(options);
  }
  stream.Transform.call(this, options); // init

  this._packets = new Array(256);

  this._packets[0] = [{"somefield": "sometype"} ];

  this._buffer = new Buffer(0);
  this.packetsReady = [];
};
// http://nodejs.org/api/stream.html#stream_class_stream_transform_1
util.inherits(Protocol, stream.Transform);


Protocol.prototype._transform = function (chunk, encoding, callback) {

  this._buffer = Buffer.concat([this._buffer, chunk]);
  console.log("Protocol buf now: " + this._buffer.length);

  //this.push(this._buffer);

  var len = 0;
  if((len = this.tryParse()))
  {
    this._buffer = this._buffer.slice(len);
  }

  // We got some packets ready, write to the client
  if(this.packetsReady.length)
  {
    this.push(this.packetsReady);
    this.packetsReady = [];
  }

  return callback();
};

Protocol.prototype.readVarInt = function(offset) {
    var value = 0;
    var pos = offset;
    var maxlen = this._buffer.length;

    do
    {
      value <<= 7;
      value += this._buffer.readUInt8(pos) & ~0x80;
      pos++;
      // We don't have data in buffer
      console.log("Val at "+ value);
      if(maxlen == pos)
        return { status: 0 };
    }
    while(this._buffer.readUInt8(pos) & 0x80);
    console.log("Read ok");
    return { status: 1, offset: pos, data: value };
};

Protocol.prototype.tryParse = function() {
  var data;

  var offset;
  var packetLen;
  var packetID;

  data = this.readVarInt(0);
  if(data.status != 1) return 0;
  packetLen = data.data;
  offset = data.offset;
  if(packetLen + offset > this._buffer.length)
    return 0;

  data = this.readVarInt(offset);
  packetID = data.data;

  console.log("Got packet "+ packetID + " with size " + packetLen);

  //Parse the real packet
  var packet = this._packets[packetID];

  return packetLen + offset;
};

module.exports = Protocol;