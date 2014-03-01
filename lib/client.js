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

var Protocol = require('./protocol');




function writeVarInt(value) {
  var buffer = new Buffer(0, 'binary');
  var tempbuf = new Buffer(1, 'binary');
  while(value > 127)
  {
    tempbuf[0] = value | 0x80;
    buffer = Buffer.concat([buffer,tempbuf]);
    value >>= 7;
  }
  tempbuf[0] = value;
  buffer = Buffer.concat([buffer,tempbuf]);
  return buffer;
};



var Client = function Client(options) {
  this._buffer = new Buffer(0);

  this.socket = null;

  stream.Writable.call(this, {objectMode: true}); // init
}
// http://nodejs.org/api/stream.html#stream_class_stream_writable_1
util.inherits(Client, stream.Writable);

Client.prototype._write = function _write(chunk, encoding, callback) {

  var packet = chunk;//JSON.parse(chunk);

  //this._buffer = Buffer.concat([this._buffer,chunk]);
  // console.log("Client buf now: " + this._buffer.length);

  console.warn(util.inspect(packet));

  if(packet.ID == 0)
  {
    var packetid = new Buffer(1);
    packetid[0] = 0;

    var obj = new Buffer('{"version": {\
          "name": "1.7.5",     \
          "protocol": 4        \
        },                     \
        "players": {           \
          "max": 100,          \
          "online": 5,         \
          "sample": [          \
            {                  \
              "name": "Fador", \
              "id": "4566e69fc90748ee8d71d7ba5aa00d20"\
            }                                         \
          ]                                           \
        },                                            \
        "description": {                              \
          "text": "Mineserver "                       \
        }                                            \
      }');


    var buf = Buffer.concat([packetid,writeVarInt(obj.length),obj]);



    buf =  Buffer.concat([ writeVarInt(buf.length), buf]);
    this.socket.write(buf);
  }
  if(packet.ID == 1)
  {
    var timebuf = new Buffer(9);
    timebuf[0] = 1;
    timebuf.writeDoubleBE(packet.time, 1);
    var buf =  Buffer.concat([ writeVarInt(9), timebuf]);
    this.socket.write(buf);

    this.socket.end();
  }
  return callback();
};

module.exports = Client;