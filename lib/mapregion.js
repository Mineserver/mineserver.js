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
var fs = require('fs');
var path = require('path');

const SECTOR_BYTES = 4096;
const SECTOR_INTS = SECTOR_BYTES / 4;
const CHUNK_HEADER_SIZE = 5;



/*
 struct RegionFile {
   struct ChunkOffset {
     int sector_number;
     char sector_count;
   } chunk_offsets[1024];

   struct ChunkTimestamp {
     int timestamp;
   } chunk_timestamps[1024];

   struct Sector {
     int length;
     char version;
     char data[length - 1];
   } sectors[file_length / 4096 - 1];
 }
 */


var Region = function Region() {

  this.X = 0;
  this.Z = 0;

  this.offsets = new Uint32Array(SECTOR_INTS);
  this.timestamps = new Uint32Array(SECTOR_INTS);
  this.sectorFree = new Array(0);

};

Region.prototype.openFile = function openFile(mapdir, chunkX, chunkZ, cb)
{
  this.X = chunkX;
  this.Z = chunkZ;


  //ToDo: Async
  if(!fs.existsSync(path.join(mapdir, "region"))) {
    fs.mkdirSync(path.join(mapdir, "region"));
  }

  fs.open( path.join(mapdir, "region", "r." + this.X + "." + this.Z + ".mca"), "w+", function(err, fd) {

    var filestats = fs.fstatSync(fd);
  });

};

Region.prototype.writeChunk = function writeChunk(block, x, y, z)
{

};

Region.prototype.readChunk = function readChunk(block, x, y, z)
{

};

module.exports = Region;