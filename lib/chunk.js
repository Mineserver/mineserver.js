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
var MCBuffer = require('./mcbuffer');
var Packetizer = require('./packetizer');

var Chunk = function Chunk() {

  this.X = 0;
  this.Z = 0;

  this.users = new Array();

  this.typeData = new Buffer(16*16*16*16*2);
  this.lightData = new Buffer(16*16*16*16 / 2);
  this.skylightData = new Buffer(16*16*16*16 / 2);
  this.biome = new Buffer(16*16);

};

Chunk.prototype.getBlock = function getBlock(x, y, z)
{
  var blockPos = x*16 + y*16*16 + z;
  var block = {};
  block.type = (this.typeData[blockPos]>>4) & this.typeData[blockPos+1]<<4;

  block.meta = this.typeData[blockPos] & 0xf;

  return block;
};

Chunk.prototype.setBlock = function setBlock(block, x, y, z)
{
  var blockPos = x*16 + y*16*16 + z;
  if(block.type !== undefined)
  {
    var meta = (block.meta === undefined)?0:block.meta;
    this.typeData[blockPos] = ((block.type & 0xf) <<4) & meta;
    this.typeData[blockPos+1]= block.type >>4;

    global.server.sendAllClients(new Packetizer().blockChange(x, y, z,
      this.typeData[blockPos+1] << 8 | this.typeData[blockPos]), -1);
  }

  return true;
};

module.exports = Chunk;