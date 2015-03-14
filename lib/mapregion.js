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
var zlib = require('zlib');

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
  this.fileSize = 0;
  this.fd;

  this.offsets = new Uint32Array(SECTOR_INTS);
  this.timestamps = new Uint32Array(SECTOR_INTS);
  this.sectorFree;
  this.sectors = 0;

};

Region.prototype.getOffset = function(x,z) {
  return this.offsets[(x + z * 32)];
};

Region.prototype.openFile = function openFile(mapdir, chunkX, chunkZ, cb)
{
  this.X = chunkX;
  this.Z = chunkZ;


  //ToDo: Async
  if(!fs.existsSync(mapdir)) {
    fs.mkdirSync(mapdir);
  }
  if(!fs.existsSync(path.join(mapdir, "region"))) {
    fs.mkdirSync(path.join(mapdir, "region"));
  }

  fs.open( path.join(mapdir, "region", "r." + this.X + "." + this.Z + ".mca"), "r+", function(err, fd) {

    if(err) {
      cb(false);
      return;
    }
    this.fd = fd;
    var filestats = fs.fstatSync(fd);
    this.fileSize = filestats.size;

    // Is this a new file
    if (this.fileSize < SECTOR_BYTES) {
      cb(false);
      return;
    }

    //If not multiple of 4096, expand
    if ((this.fileSize & 0xfff) != 0) {
      cb(false);
      return;
    }

    var sectors = this.fileSize / SECTOR_BYTES;
    this.sectors = sectors;

    this.sectorFree = new Array(sectors);
    for(var i = 0; i < sectors; i++)
      this.sectorFree[i] = true;

    // First sector contains offsets
    this.sectorFree[0] = false;
    // Second sector has timestamps
    this.sectorFree[1] = false;

    var tempBuffer = new Buffer(4);
    for (var i = 0; i < SECTOR_INTS; i++)
    {
      fs.readSync(fd, tempBuffer, 0, 4, i*4);
      this.offsets[i] = tempBuffer.readUInt32BE(0,true);

      // Mark sectors as used
      if (this.offsets[i] != 0 && (this.offsets[i] >> 8) + (this.offsets[i] & 0xFF) <= sectors)
      {
        for (var sectorNum = 0; sectorNum < (this.offsets[i] & 0xFF); sectorNum++)
        {
          this.sectorFree[(this.offsets[i] >> 8) + sectorNum] = false;
        }
      }
    }
    //Read timestamps
    for (var i = 0; i < SECTOR_INTS; ++i)
    {
      fs.readSync(fd, tempBuffer, 0, 4, SECTOR_BYTES + i*4);
      this.timestamps[i] = tempBuffer.readUInt32BE(0,true);
    }
    cb(true);
  }.bind(this));

};

Region.prototype.writeChunk = function writeChunk(data, x, z)
{

};

Region.prototype.readChunk = function readChunk(x, z, cb)
{
  x = x & 31;
  z = z & 31;
  var offset = this.getOffset(x, z);

  if (offset == 0)
  {
    cb(false, null);
    return;
  }
  var sectorNumber = offset >> 8;
  var numSectors = offset & 0xFF;

  if (sectorNumber + numSectors > this.sectors)
  {
    cb(false, null);
    return;
  }
  var tempBuffer = new Buffer(4);
  fs.readSync(this.fd, tempBuffer, 0, 4, sectorNumber * SECTOR_BYTES);
  var chunklen = tempBuffer.readUInt32BE(0,true);
  if (chunklen > SECTOR_BYTES * numSectors)
  {
    cb(false, null);
    return;
  }

  fs.readSync(this.fd, tempBuffer, 0, 1, sectorNumber * SECTOR_BYTES + 4);
  var version = tempBuffer[0]; // VERSION_GZIP = 1, VERSION_DEFLATE = 2

  //console.log("Version: "+version);

  var chunkbuffer = new Buffer(chunklen-1);
  fs.read(this.fd, chunkbuffer, 0, chunklen-1, sectorNumber * SECTOR_BYTES + 5, function(err, bytesRead, buffer) {
    //console.log("read: "+bytesRead + " buflen: "+buffer.length);
    zlib.inflate(buffer, function(err, buffer) {
      if(err) {
        console.log(err);
        cb(false, null);
        return;
      }
      //console.log("Uncompressed: " + buffer.length);
      cb(true, buffer);

    });
  }.bind(this));

};

module.exports = Region;