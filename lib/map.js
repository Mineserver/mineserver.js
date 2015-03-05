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


// Some better chunk hash generator
function chunkHash(x,z)
{
  return x+"_"+z;
}


var Map = function Map() {

  this.chunkmap = new Array();


};

// Load or generate a chunk
Map.prototype.getChunk = function getChunk(x, z, generate)
{
  if(this.chunkmap[chunkHash(x,z)] === undefined) {
    if(!generate) return 0;
    // TODO: load from the file
    this.chunkmap[chunkHash(x,z)] = global.server.mapgen.generateChunk(x,z);
  }

  return this.chunkmap[chunkHash(x,z)];

};

// get chunk data in the format client wants it
Map.prototype.getChunkData = function getChunkData(x, z, generate)
{
  var chunk = this.getChunk(x,z, generate);
  if(chunk === 0) return 0;
  var chunkData = new Buffer(16*16*16*16*2 + 16*16*16*16 + 256);

  //ToDo: push this to cache?
  var chunkLen = 16*16*16*2 + 16*16*16;
  for(var chunkPart = 0; chunkPart < 16; chunkPart++ ) {
     for(var i = 0; i < 16*16*16*2; i++) {
       chunkData[chunkLen * chunkPart + i] = chunk.typeData[16*16*16*2 * chunkPart + i];
     }
     for(var j = 0, i = 16*16*16*2; i < 16*16*16*2 + 16*16*16/2; i++, j++) {
       chunkData[chunkLen * chunkPart + i] = chunk.lightData[16*16*16/2 * chunkPart + j];
     }

     for(var j = 0, i = 16*16*16*2 + 16*16*16/2; i < 16*16*16*2 + 16*16*16; i++, j++) {
        chunkData[chunkLen * chunkPart + i] = chunk.skylightData[16*16*16/2 * chunkPart + j];
     }
  }

  for(var i = 0; i < 256; i++) {
    chunkData[chunkLen * 16 + i] = chunk.biome[i];
  }

  return chunkData;
};

// Return data for a block
Map.prototype.getBlock = function getBlock(x, y, z)
{
  var chunk = this.getChunk(x>>4,z>>4, false);
  if(chunk === 0) return false;

  return chunk.getBlock(x&15, y, z&15);
};

// Return data for a block
Map.prototype.setBlock = function getBlock(block, x, y, z)
{
  var chunk = this.getChunk(x>>4,z>>4, false);
  if(chunk === 0) return false;

  return chunk.setBlock(x&15, y, z&15, block);
};

module.exports = Map;