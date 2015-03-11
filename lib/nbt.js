/*
 Copyright (c) 2015, The Mineserver Project
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

const TAG_END = 0;
const TAG_BYTE = 1;
const TAG_SHORT = 2;
const TAG_INT = 3;
const TAG_LONG = 4;
const TAG_FLOAT = 5;
const TAG_DOUBLE = 6;
const TAG_BYTE_ARRAY = 7;
const TAG_STRING = 8;
const TAG_LIST = 9;
const TAG_COMPOUND = 10;
const TAG_INT_ARRAY = 11;

var NBT_Item = function NBT_Item(top) {
  this.type = 0;
  this.name = "";
  this.len = 0;
  this.value = null;
  this.top = top;
};

var NBT = function NBT() {
  this.dataBuffer = null;
  this.bufferPos = 0;
  this.toplevel = new NBT_Item(null);
  this.currentItem = this.toplevel;
};

NBT.prototype.readNextVal = function(type) {
  this.currentItem.type = type;
  switch(type) {
    case TAG_BYTE:
      this.currentItem.value = this.dataBuffer.readUInt8(this.bufferPos, true);
      this.bufferPos++;
      break;
    case TAG_SHORT:
      this.currentItem.value = this.dataBuffer.readInt16BE(this.bufferPos, true);
      this.bufferPos+=2;
      break;
    case TAG_INT:
      this.currentItem.value = this.dataBuffer.readInt32BE(this.bufferPos, true);
      this.bufferPos+=4;
      break;
    case TAG_LONG:
      this.currentItem.value = [ this.dataBuffer.readUInt32BE(this.bufferPos, true),
                                 this.dataBuffer.readUInt32BE(this.bufferPos+4, true) ];
      this.bufferPos+=8;
      break;
    case TAG_FLOAT:
      this.currentItem.value = this.dataBuffer.readFloatBE(this.bufferPos, true);
      this.bufferPos+=4;
      break;
    case TAG_DOUBLE:
      this.currentItem.value = this.dataBuffer.readDoubleBE(this.bufferPos, true);
      this.bufferPos+=8;
      break;
    case TAG_BYTE_ARRAY:
      this.currentItem.len = this.dataBuffer.readInt32BE(this.bufferPos, true);
      this.bufferPos+=4;
      this.currentItem.value = new Buffer(this.currentItem.len);
      for(var i = 0; i < this.currentItem.len; i++, this.bufferPos++) {
        this.currentItem.value[i] = this.dataBuffer[this.bufferPos];
      }
      break;
    case TAG_INT_ARRAY:
      this.currentItem.len = this.dataBuffer.readInt32BE(this.bufferPos, true);
      this.bufferPos+=4;
      this.currentItem.value = new Int32Array(this.currentItem.len);
      for(var i = 0; i < this.currentItem.len; i++, this.bufferPos+=4) {
        this.currentItem.value[i] = this.dataBuffer.readInt32BE(this.bufferPos, true);
      }
      break;
    case TAG_STRING:
      this.currentItem.len = this.dataBuffer.readInt16BE(this.bufferPos, true);
      this.bufferPos+=2;
      this.currentItem.value = this.dataBuffer.toString('utf8', this.bufferPos, this.bufferPos+this.currentItem.len);
      this.bufferPos+=this.currentItem.len;
      break;
    case TAG_LIST:
      var nexttype = this.dataBuffer.readUInt8(this.bufferPos, true);
      this.bufferPos++;
      this.currentItem.len = this.dataBuffer.readInt32BE(this.bufferPos, true);
      this.bufferPos+=4;
      this.currentItem.value = new Array(this.currentItem.len);
      var len = this.currentItem.len;
      for(var i = 0; i < len; i++) {
        this.currentItem.value[i] = new NBT_Item(this.currentItem);
        this.currentItem = this.currentItem.value[i];
        this.readNextVal(nexttype);
      }
      break;
    case TAG_COMPOUND:
      var nexttype = this.dataBuffer.readUInt8(this.bufferPos, true);
      this.bufferPos++;
      if (type == TAG_END)
      {
        break;
      }
      var stringlen = this.dataBuffer.readInt16BE(this.bufferPos, true);
      this.bufferPos+=2;
      this.currentItem.name = this.dataBuffer.toString('utf8', this.bufferPos, this.bufferPos+stringlen);
      this.bufferPos+=stringlen;
      this.currentItem.value = new NBT_Item(this.currentItem);
      this.currentItem = this.currentItem.value;
      this.readNextVal(nexttype);
      break;
    case TAG_END:
      break;
  }
  this.currentItem = this.currentItem.top;
};

NBT.prototype.read = function read(nbtdata) {
  this.dataBuffer = nbtdata;
  this.bufferPos = 0;
  this.readNextVal(TAG_COMPOUND);
};


module.exports = NBT;