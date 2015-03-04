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
function chunkHash(x,y)
{
  return x+"_"+y;
}


var Map = function Map() {

  this.chunkmap = new Array();


};

// Load or generate a chunk
Map.prototype.getChunk = function(x, y)
{
  if(this.chunkmap[chunkHash(x,y)] === undefined) {
    // TODO: load from the file
    this.chunkmap[chunkHash(x,y)] = global.server.mapgen.generateChunk(x,y);
  }

  return this.chunkmap[chunkHash(x,y)];

};

// get chunk data in the format client wants it
Map.prototype.getChunkData = function(x, y)
{
  var chunk = this.getChunk(x,y);
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

module.exports = Map;