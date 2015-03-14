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
var NBT_Item = require('./nbt_item');

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

const INITIAL_BUFFER_SIZE = 1024*10;

var NBT = function NBT() {
  this.dataBuffer = null;
  this.bufferPos = 0;
  this.toplevel = new NBT_Item(null);
  this.currentItem = this.toplevel;
  this.debug_level = 0;
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
      this.currentItem.listType = nexttype;
      this.bufferPos++;
      this.currentItem.len = this.dataBuffer.readInt32BE(this.bufferPos, true);
      this.bufferPos+=4;
      this.currentItem.value = new Array(this.currentItem.len);
      var len = this.currentItem.len;
      for(var i = 0; i < len; i++) {
        this.currentItem.value[i] = new NBT_Item(this.currentItem);
      }
      for(var i = 0; i < len; i++) {
        this.currentItem = this.currentItem.value[i];
        this.readNextVal(nexttype);
      }
      break;
    case TAG_COMPOUND:
      this.currentItem.value = new Array();
      this.currentItem.len = 0;
      while(1) {
        if(this.dataBuffer.length <= this.bufferPos-1) break;
        var nexttype = this.dataBuffer.readUInt8(this.bufferPos, true);
        this.bufferPos++;
        if (nexttype == TAG_END) {
          break;
        }
        var stringlen = this.dataBuffer.readInt16BE(this.bufferPos, true);
        this.bufferPos += 2;
        var tempname = this.dataBuffer.toString('utf8', this.bufferPos, this.bufferPos + stringlen);
        this.bufferPos += stringlen;
        this.currentItem.value[this.currentItem.len] = new NBT_Item(this.currentItem);
        this.currentItem.value[this.currentItem.len].name = tempname;
        this.currentItem = this.currentItem.value[this.currentItem.len];
        this.readNextVal(nexttype);
        this.currentItem.len++;
      }
      break;
    case TAG_END:
      break;
  }
  this.currentItem = this.currentItem.top;
};

NBT.prototype.writeVal = function(item) {
  // Resize buffer
  if(this.dataBuffer.length - this.bufferPos < 512*10) {
    var newBuffer = new Buffer(this.dataBuffer.length*2);
    this.dataBuffer.copy(newBuffer, 0, 0, this.bufferPos);
    this.dataBuffer = newBuffer;
  }
  switch(item.type) {
    case TAG_BYTE:
      this.dataBuffer.writeUInt8(item.value, this.bufferPos);
      this.bufferPos++;
      break;
    case TAG_SHORT:
      this.dataBuffer.writeInt16BE(item.value, this.bufferPos);
      this.bufferPos+=2;
      break;
    case TAG_INT:
      this.dataBuffer.writeInt32BE(item.value, this.bufferPos);
      this.bufferPos+=4;
      break;
    case TAG_LONG:
      this.dataBuffer.writeUInt32BE(item.value[0], this.bufferPos);
      this.dataBuffer.writeUInt32BE(item.value[1], this.bufferPos+4);
      this.bufferPos+=8;
      break;
    case TAG_FLOAT:
      this.dataBuffer.writeFloatBE(item.value, this.bufferPos);
      this.bufferPos+=4;
      break;
    case TAG_DOUBLE:
      this.dataBuffer.writeDoubleBE(item.value, this.bufferPos);
      this.bufferPos+=8;
      break;
    case TAG_BYTE_ARRAY:
      this.dataBuffer.writeUInt32BE(item.len, this.bufferPos);
      this.bufferPos+=4;
      for(var i = 0; i < item.len; i++) {
        this.dataBuffer.writeUInt8(item.value[i], this.bufferPos);
        this.bufferPos++;
      }
      break;
    case TAG_INT_ARRAY:
      this.dataBuffer.writeUInt32BE(item.len, this.bufferPos);
      this.bufferPos+=4;
      for(var i = 0; i < item.len; i++) {
        this.dataBuffer.writeUInt32BE(item.value[i], this.bufferPos);
        this.bufferPos+=4;
      }
      break;
    case TAG_STRING:
      this.dataBuffer.writeUInt16BE(item.len, this.bufferPos);
      this.bufferPos+=2;
      var buf = new Buffer(item.value);
      for(var i = 0; i < buf.length; i++, this.bufferPos++) {
        this.dataBuffer.writeUInt8(buf[i], this.bufferPos);
      }
      break;
    case TAG_LIST:
      this.dataBuffer.writeUInt8(item.listType, this.bufferPos);
      this.bufferPos++;
      this.dataBuffer.writeUInt32BE(item.len, this.bufferPos);
      this.bufferPos+=4;
      for(var i = 0; i < item.len; i++) {
        this.writeVal(item.value[i]);
      }
      break;
    case TAG_COMPOUND:
      for(var i = 0;  i < item.len; i++) {
        this.dataBuffer.writeUInt8(item.value[i].type, this.bufferPos);
        this.bufferPos++;
        if(item.value[i].type == TAG_END) break;

        var buf = new Buffer(item.value[i].name);
        this.dataBuffer.writeUInt16BE(buf.length, this.bufferPos);
        this.bufferPos += 2;
        for (var j = 0; j < buf.length; j++, this.bufferPos++) {
          this.dataBuffer.writeUInt8(buf[j], this.bufferPos);
        }
        this.writeVal(item.value[i]);
      }
      this.dataBuffer.writeUInt8(TAG_END, this.bufferPos);
      this.bufferPos++;
      break;
    case TAG_END:
      this.dataBuffer.writeUInt8(TAG_END, this.bufferPos);
      this.bufferPos++;
      break;
  }
};

NBT.prototype.debug = function(item) {
  var prefix = "";
  for(var i = 0; i < this.debug_level; i++) {
    prefix += "  ";
  }
  switch(item.type) {
    case TAG_BYTE:
      console.log(prefix+"TAG_Byte(\"" + item.name + "\"): "+ item.value);
      break;
    case TAG_SHORT:
      console.log(prefix+"TAG_Short(\"" + item.name + "\"): "+ item.value);
      break;
    case TAG_INT:
      console.log(prefix+"TAG_Int(\"" + item.name + "\"): "+ item.value);
      break;
    case TAG_LONG:
      console.log(prefix+"TAG_Long(\"" + item.name + "\"): "+ item.value[0] + " " +item.value[1]);
      break;
    case TAG_FLOAT:
      console.log(prefix+"TAG_Float(\"" + item.name + "\"): "+ item.value);
      break;
    case TAG_DOUBLE:
      console.log(prefix+"TAG_Double(\"" + item.name + "\"): "+ item.value);
      break;
    case TAG_BYTE_ARRAY:
      console.log(prefix+"TAG_Byte_Array(\"" + item.name + "\"): "+ item.len + "bytes");
      break;
    case TAG_INT_ARRAY:
      console.log(prefix+"TAG_Int_Array(\"" + item.name + "\"): "+ item.len + "bytes");
      break;
    case TAG_STRING:
      console.log(prefix+"TAG_String(\"" + item.name + "\"): "+ item.value);
      break;
    case TAG_LIST:
      console.log(prefix+"TAG_List(\"" + item.name + "\"): Type: "+ item.type + " Len: " + item.len);
      this.debug_level++;
      for(var i = 0; i < item.len; i++) {
        this.debug(item.value[i]);
      }
      this.debug_level--;
      break;
    case TAG_COMPOUND:
      console.log(prefix+"TAG_Compound(\"" + item.name + "\"): Type: "+ item.type);
      this.debug_level++;
      for(var i = 0; i < item.len; i++) {
        this.debug(item.value[i]);
      }
      this.debug_level--;
      break;
    case TAG_END:
      this.debug_level--;
      console.log(prefix+"TAG_End(\"\")");
      break;
  }

};

NBT.prototype.read = function read(nbtdata, offset) {
  this.dataBuffer = nbtdata;
  this.bufferPos = offset;
  this.readNextVal(TAG_COMPOUND);
};

NBT.prototype.write = function write(item) {
  this.dataBuffer = new Buffer(INITIAL_BUFFER_SIZE, 'binary');
  this.bufferPos = 0;
  this.writeVal(item);
};


module.exports = NBT;