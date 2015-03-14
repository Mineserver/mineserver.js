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

// ToDo: define globally?
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



var NBT_Item = function(top) {
  this.type = 0;
  this.listType = 0;
  this.name = "";
  this.len = 0;
  this.value = null;
  this.top = top;
};

NBT_Item.prototype.findItem = function(name) {
  if(this.type == TAG_LIST || this.type == TAG_COMPOUND) {
    for(var i = 0; i < this.len; i++) {
      if(this.value[i].name == name) {
        return this.value[i];
      }
    }
  }
  else return null;
};

NBT_Item.byte = function(value) {
  var item = new NBT_Item(null);
  item.type = TAG_BYTE; item.value = value;
  return item;
};

NBT_Item.short = function(value) {
  var item = new NBT_Item(null);
  item.type = TAG_SHORT; item.value = value;
  return item;
};

NBT_Item.int = function(value) {
  var item = new NBT_Item(null);
  item.type = TAG_INT; item.value = value;
  return item;
};

NBT_Item.long = function(value) {
  var item = new NBT_Item(null);
  item.type = TAG_LONG; item.value = value;
  return item;
};


NBT_Item.float = function(value) {
  var item = new NBT_Item(null);
  item.type = TAG_FLOAT; item.value = value;
  return item;
};

NBT_Item.double = function(value) {
  var item = new NBT_Item(null);
  item.type = TAG_DOUBLE; item.value = value;
  return item;
};

NBT_Item.byte_array = function(buffer, len) {
  var item = new NBT_Item(null);
  item.type = TAG_BYTE_ARRAY;
  item.value = buffer;
  item.len = len;
  return item;
};

NBT_Item.string = function(value) {
  var item = new NBT_Item(null);
  item.type = TAG_STRING;
  item.value = value;
  return item;
};

NBT_Item.list = function(type, array, len) {
  var item = new NBT_Item(null);
  item.type = TAG_LIST;
  item.value = array;
  item.len = len;
  item.listType = type;
  return item;
};

NBT_Item.compound = function(array, len) {
  var item = new NBT_Item(null);
  item.type = TAG_COMPOUND;
  item.value = array;
  item.len = len;
  return item;
};

NBT_Item.int_array = function(array, len) {
  var item = new NBT_Item(null);
  item.type = TAG_INT_ARRAY;
  item.value = array;
  item.len = len;
  return item;
};

module.exports = NBT_Item;
