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

var MCBuffer = function MCBuffer(buffer) {
    this.buffer = new Buffer(buffer);
    this.bufferPos = 0;
};

MCBuffer.prototype.buffer = function() {
 return this.buffer;
};

MCBuffer.prototype.concat = function (array) {
  this.buffer = Buffer.concat([this.buffer, array]);
  return this;
};

MCBuffer.prototype.packetOut = function() {
  var tempBuf = new MCBuffer(0);
  tempBuf.writeVarInt(this.buffer.length);
  return Buffer.concat([tempBuf.buffer, this.buffer]);
};

MCBuffer.prototype.writeVarInt = function (value) {
  while(value > 127)
  {
    this.writeUInt8(value | 0x80);
    value >>= 7;
  }
  this.writeUInt8(value);
  return this;
};

MCBuffer.prototype.writeUtf8 = function (string) {
  this.writeVarInt(string.length);
  this.concat(new Buffer(string));
  return this;
};

MCBuffer.prototype.writeUInt8 = function (value) {
  var tempBuf = new Buffer(1);
  tempBuf[0] = value;
  this.buffer = Buffer.concat([this.buffer, tempBuf]);
  return this;
};

MCBuffer.prototype.writeUInt16 = function (value) {
  var tempBuf = new Buffer(2);
  tempBuf.writeUInt16BE(value,0);
  this.buffer = Buffer.concat([this.buffer, tempBuf]);
  return this;
};

MCBuffer.prototype.writeUInt32 = function (value) {
  var tempBuf = new Buffer(4);
  tempBuf.writeUInt32BE(value,0);
  this.buffer = Buffer.concat([this.buffer, tempBuf]);
  return this;
};

MCBuffer.prototype.writeUInt64 = function (value) {
  var tempBuf = new Buffer(8);
  tempBuf.writeDoubleBE(value,0);
  this.buffer = Buffer.concat([this.buffer, tempBuf]);
  return this;
};

MCBuffer.prototype.readUInt8 = function () {
  return this.buffer[this.bufferPos++];
};

MCBuffer.prototype.readUInt16 = function () {
  pos = this.bufferPos;
  this.bufferPos+=2;
  return this.buffer.readUInt16BE(pos, true);
};

MCBuffer.prototype.readUInt32 = function () {
  pos = this.bufferPos;
  this.bufferPos+=4;
  return this.buffer.readUInt32BE(pos, true);
};

MCBuffer.prototype.readUInt64 = function () {
  pos = this.bufferPos;
  this.bufferPos+=8;
  return this.buffer.readDoubleBE(pos, true); //TODO: read real uint64
};

MCBuffer.prototype.readVarInt = function () {
  var value = 0;
  do
  {
    value <<= 7;
    value += this.buffer[this.bufferPos] & ~0x80;
  }
  while(this.buffer[this.bufferPos++] & 0x80);

  return value;
};

MCBuffer.prototype.readUtf8 = function () {
  var len = this.readVarInt();
  var pos = this.bufferPos;
  this.bufferPos += len;
  return this.buffer.toString('utf8', pos, pos+len);
};



module.exports = MCBuffer;