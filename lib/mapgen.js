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
var Chunk = require('./chunk');

/*
  This is a sample map generator which only generates "flatgrass" map with
   0-99 filled with dirt and 100 with grass.
 */
var MapGen = function MapGen() {


};


MapGen.prototype.generateChunk = function(x, z)
{
  // Update local variables
  var chunk = new Chunk();

  chunk.X = x;
  chunk.Z = z;

  //Clear the chunk
  chunk.typeData.fill(0x00);
  chunk.lightData.fill(0xff);
  chunk.skylightData.fill(0xff);
  chunk.biome.fill(0x00);

  for(var y = 0; y < 256; y++) {

    if(y < 100) {
      for (var i = 0; i < 16 * 16 * 2; i += 2) {
        chunk.typeData[y*16*16*2+i] = 0x03 << 4;
      }
    }
    else if(y == 100) {
      for (var i = 0; i < 16 * 16 * 2; i += 2) {
        chunk.typeData[y * 16 * 16 * 2 + i] = 0x02 << 4;
      }
    }
  }
  // Reset lastChange field so this chunk is saved
  chunk.lastChange = Math.floor(new Date() / 1000);

  return chunk;
};

module.exports = MapGen;