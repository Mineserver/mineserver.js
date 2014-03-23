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
var MCBuffer = require('./mcbuffer');

var Protocol = require('./protocol');







var Client = function Client(options) {
  this._buffer = new Buffer(0);
  this.socket = null;
  this.state = 0;
  this.nick = "";
  //Init writable stream
  stream.Writable.call(this, {objectMode: true});
}
// http://nodejs.org/api/stream.html#stream_class_stream_writable_1
util.inherits(Client, stream.Writable);

// Function to read stuff that is being written to this stream
Client.prototype._write = function _write(chunk, encoding, callback) {

  // Chunk contains full packet in object mode
  var packet = chunk;


  console.warn(util.inspect(packet));

  //TODO: move this stuff away from Client
  //Output format:
  //[packetlen:varint, packetType:varint, packetData]

  if(this.state == 0)
  {
    // Handle packets
    if(packet.ID == 0)
    {
      this.state = packet.nextState;
    }
  }
  else if(this.state == 1)
  {
    // Handle packets
    if(packet.ID == 0)
    {
      var serverInfo =
      {"version": {"name": global.server.protocolName, "protocol": global.server.protocolVersion},
        "players": {
          "max": global.server.MaxClients,"online": global.server.onlineClients,
          "sample": [
            {
              "name": "Fador",
              "id": "4566e69fc90748ee8d71d7ba5aa00d20"
            }
          ]
        },
        "description": {"text": global.server.config.serverName}
      };
      this.socket.write(new MCBuffer(new Buffer(0)).writeUInt8(0x00).writeUtf8(JSON.stringify(serverInfo)).packetOut());
    }
    if(packet.ID == 0x01)
    {
      // Write response and close socket
      this.socket.end(new MCBuffer(new Buffer(0)).writeUInt8(0x01).writeUInt64(packet.time).packetOut());
    }
  }
  else if(this.state == 2)
  {
    // Handle packets
    if(packet.ID == 0)
    {
      // Grab player nick
      this.nick = packet.nick;

      // Encryption Request
      console.log("Response: "+global.server.serverID);
      var serverID = global.server.serverID;


      var publicKey = new Buffer("30819d300d06092a864886f70d010101050003818b0030818702818100c8693ccd66fd69db4f9fc882d8681ace4ee5de52ac9d3d5de8efaa61a52f513aedf1ccd776aedd89b3cd5fbdd54e8d3e69271a8cc11c88fdbc5dd355d05f70b418de6c1c14e0e6234bede87f2caea3a65f766c966f6dc902ce84f5918b7f4110e957b8a89eaf00e72dfa3c33ebd4e36700612b79c56da85d96c50f877c62ca87020111", "hex");

      var verify = new Buffer("sadf");

      this.socket.write(new MCBuffer(new Buffer(0)).writeUInt8(0x01).writeUtf8(serverID).writeUInt16(publicKey.length).concat(publicKey).writeUInt16(verify.length).concat(verify).packetOut());

    }
  }
  return callback();
};

module.exports = Client;