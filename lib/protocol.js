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
var zlib = require('zlib');
var stream = require("stream");
var MCBuffer = require('./mcbuffer');

var Protocol = function Protocol(options) {

  if (!(this instanceof Protocol)) {
    return new Protocol(options);
  }
  stream.Transform.call(this, {objectMode: true}); // init

  // Arrays for different connection states
  this._packets = new Array(4);
  this._packets[0] = new Array(1);
  this._packets[1] = new Array(2);
  this._packets[2] = new Array(2);
  this._packets[3] = new Array(256);

  // Packet definitions for initial state
  this._packets[0][0x00] = [{"version": "varint"},{"address": "string"},{"port": "uint16"}, {"nextState": "varint"} ];

  //Status state
  this._packets[1][0x00] = [];
  this._packets[1][0x01] = [{"time": "uint64"}];

  //Login state
  this._packets[2][0x00] = [{"nick": "string"}];
  this._packets[2][0x01] = [{"SharedSecret": "varint_array", "verifyToken": "varint_array"}];

  //Play state

  // Ping
  this._packets[3][0x00] = [{"keepalive": "varint"}];
  // Chat
  this._packets[3][0x01] = [{"message": "string"}];
  // Player position
  this._packets[3][0x04] = [{"X": "double", "feetY": "double", "Z": "double","onground":"uint8"}];
  // Player look
  this._packets[3][0x05] = [{"yaw":"float","pitch":"float","onground":"uint8"}];
  // Player Position And Look
  this._packets[3][0x06] = [{"X": "double", "feetY": "double", "Z": "double","yaw":"float","pitch":"float","onground":"uint8"}];
  // Player digging
  this._packets[3][0x07] = [{"status": "uint8", "location": "uint64", "face": "uint8"}];
  // Player block placement
  this._packets[3][0x08] = [{"location": "uint64", "face": "uint8", "heltItem": "slot", "cursorX": "uint8", "cursorY": "uint8", "cursorZ": "uint8"}];
  // Client Settings
  this._packets[3][0x15] = [{"locale": "string", "viewdistance": "uint8", "chatflags": "uint8","chatcolors":"uint8","skinparts":"uint8"}];
  // Plugin Message
  this._packets[3][0x17] = [{"channel": "string", "data": "int16_array"}];


  // Buffer to store packet data until it can be parsed
  this._buffer = new Buffer(0,'binary');
  this.bufferPos = 0;
  this.state = options.state;
};
// http://nodejs.org/api/stream.html#stream_class_stream_transform_1
util.inherits(Protocol, stream.Transform);


Protocol.prototype._transform = function (chunk, encoding, callback) {

  this._buffer = Buffer.concat([this._buffer, chunk]);
  //console.warn("Protocol buf now: " + this._buffer.length);

  var len = 0;
  // Loop until all the packets available are parsed
  while((len = this.tryParse()))
  {
    // Remove parsed packet from the buffer
    this._buffer = this._buffer.slice(len);
  }

  return callback();
};

// Special version of readVarInt when we don't know if
// the buffer is available or not
Protocol.prototype.readVarIntWithStatus = function(offset) {
    var value = 0;
    var pos = offset;
    var maxlen = this._buffer.length;
    var shift = 0;

    do
    {
      value += (this._buffer.readUInt8(pos) & ~0x80)<< shift;

      shift += 7;
      pos++;

      // We don't have data in buffer
      if(maxlen == pos)
        return { status: 0 };
    }
    while(this._buffer.readUInt8(pos-1) & 0x80);
    return { status: 1, offset: pos, data: value };
};


Protocol.prototype.checkStateChange = function(packet)
{
  if(this.state == 0)
  {
    if(packet.ID == 0x00)
    {
      this.state = packet.nextState;
    }
  }
}

// Try to parse packet, if fail return 0
// on success return number of bytes used
Protocol.prototype.tryParse = function() {
  var data;

  var offset;
  var packetLen;
  var packetID;

  if(!this._buffer.length) return 0;

  this.bufferPos = 0;

  // Read packet length with "safe mode"
  data = this.readVarIntWithStatus(0);
  if(data.status != 1) return 0;
  packetLen = data.data;
  offset = data.offset;
  // If full packet is not received
  if(packetLen + offset > this._buffer.length)
    return 0;

  var buf = new MCBuffer(this._buffer.slice(offset,offset+packetLen));
  // Next we need packet id
  this.bufferPos = offset;
  packetID = buf.readVarInt();

  //console.warn("Got packet "+ packetID + " ("+this.state+") with size " + packetLen);
  //console.warn(util.inspect(this._buffer));

  //Parse the real packet, we get the fields from _packets array
  var out_packet = {ID: packetID};
  var packet = this._packets[this.state][packetID];

  // Skip unknown
  if(!packet) return offset+packetLen;
  // Loop all the fields
  for (var ii = 0; ii < packet.length; ii++)
  {
    var p = packet[ii];
    // Get the key
    for (var key in p) {
      // Get value with the key
      var value = p[key];
      // Temp variable to hold variable we are reading
      var outval = null;

      // Here's all the types we can read from the stream
      switch(value)
      {
        case "varint":
          outval = buf.readVarInt();
          break;
        case "string": //TODO: utf8
          outval = buf.readUtf8();
          break;
        case "uint8":
          outval = buf.readUInt8();
          break;
        case "uint16":
          outval = buf.readUInt16();
          break;
        case "uint32":
          outval = buf.readUInt32();
          break;
        case "uint64":
          outval = buf.readUInt64();
        break;
        case "double":
          outval = buf.readDouble();
          break;
        case "float":
          outval = buf.readFloat();
          break;
        case "varint_array":
          var len = buf.readVarInt();
          outval = new Buffer(len);
          for(var i = 0; i < len; i++)
            outval[i] = buf.readUInt8();
          break;
        case "slot":
          outval = {};
          outval.blockID = buf.readInt16();
          if(outval.blockID != -1) {
            outval.count = buf.readUInt8();
            outval.damage = buf.readUInt16();
            outval.nbt = buf.readUInt8();
            if(outval.nbt) {
              console.log("ITEM NBT DATA!");
              break;
            }
          }
          break;
        default:
          break;
      }

      // Set value to output
      out_packet[key] = outval;
    }
  }

  this.checkStateChange(out_packet);

  // Push this packet to output
  this.push(out_packet);

  // Return number of bytes read
  return offset+packetLen;
};




module.exports = Protocol;