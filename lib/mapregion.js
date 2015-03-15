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
const VERSION_DEFLATE = 2;



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

Region.prototype.getTimestamp = function(x,z) {
  return this.timestamps[(x + z * 32)];
};

Region.prototype.setTimestamp = function(x,z, value) {
  var tempBuffer = new Buffer(4);
  this.timestamps[(x + z * 32)] = value;
  tempBuffer.writeUInt32BE(value, 0);
  fs.writeSync(this.fd, tempBuffer, 0, 4, (SECTOR_BYTES+(x + z * 32)*4)>>>0);
};

Region.prototype.setOffset = function(x,z, value) {
  var tempBuffer = new Buffer(4);
  this.offsets[(x + z * 32)] = value;
  tempBuffer.writeUInt32BE(value, 0);
  fs.writeSync(this.fd, tempBuffer, 0, 4, ((x + z * 32)*4)>>>0);
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

  var filemode = "r+";
  if(!fs.existsSync(path.join(mapdir, "region","r." + this.X + "." + this.Z + ".mca"))) filemode = "w+";
  fs.open( path.join(mapdir, "region", "r." + this.X + "." + this.Z + ".mca"), filemode, function(err, fd) {

    if(err) {
      cb(false);
      return;
    }
    this.fd = fd;
    var filestats = fs.fstatSync(fd);
    this.fileSize = filestats.size;

    // Is this a new file
    if (this.fileSize < SECTOR_BYTES) {
      var tempBuffer = new Buffer(8);
      tempBuffer.fill(0);
      for (var i = 0; i < SECTOR_INTS; i++)
      {
        fs.writeSync(fd, tempBuffer, 0, 8, i*8);
      }

      this.fileSize = 2*SECTOR_BYTES;
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

Region.prototype.writeChunk = function writeChunk(dataIn, x, z, cb)
{
  x = x & 31;
  z = z & 31;

  var data = zlib.deflateSync(dataIn);

  var offset = this.getOffset(x, z);
  var sectorNumber = offset >> 8;
  var sectorsAllocated = offset & 0xFF;
  var sectorsNeeded = Math.floor((data.length + CHUNK_HEADER_SIZE) / SECTOR_BYTES + 1);

  // maximum chunk size is 1MB
  if (sectorsNeeded >= 256)
  {
    cb(false);
    return;
  }

  //Current space is large enought
  if (sectorNumber != 0 && sectorsAllocated == sectorsNeeded)
  {
    // Chunk header
    var tempBuf = new Buffer(5);
    tempBuf.writeUInt32BE(data.length+1, 0, true);
    tempBuf[4] = VERSION_DEFLATE;
    fs.writeSync(this.fd,tempBuf, 0, 5, sectorNumber * SECTOR_BYTES);

    fs.writeSync(this.fd,data, 0, data.length, sectorNumber * SECTOR_BYTES + CHUNK_HEADER_SIZE);
  }
  //Need more space!
  else
  {
    //Free current sectors
    for (var i = 0; i < sectorsAllocated; i++)
    {
      this[sectorNumber + i] = true;
    }

    //Search for first free sector
    var runStart = -1;
    for (var i = 2; i < this.sectorFree.length; i++)
    {
      if (this.sectorFree[i])
      {
        runStart = i;
        break;
      }
    }
    var runLength = 0;

    //Start searching for a free sector
    if (runStart != -1)
    {
      for (var i = runStart; i < this.sectorFree.length; i++)
      {
        //Not first?
        if (runLength != 0)
        {
          if (this.sectorFree[i])
            runLength++;
          else
            runLength = 0;
        }
        //Reset on first
        else if (this.sectorFree[i])
        {
          runStart = i;
          runLength = 1;
        }

        //We have the space
        if (runLength >= sectorsNeeded)
        {
          break;
        }
      }
    }

    //Did we find the space we need?
    if (runLength >= sectorsNeeded)
    {
      sectorNumber = runStart;

      //Reserve space
      for (var i = 0; i < sectorsNeeded; i++)
      {
        this.sectorFree[sectorNumber + i] = false;
      }
      // Chunk header
      var tempBuf = new Buffer(5);
      tempBuf.writeUInt32BE(data.length+1, 0, true);
      tempBuf[4] = VERSION_DEFLATE;
      fs.writeSync(this.fd,tempBuf, 0, 5, sectorNumber * SECTOR_BYTES);

      //Write data
      fs.writeSync(this.fd,data, 0, data.length, sectorNumber * SECTOR_BYTES + CHUNK_HEADER_SIZE);
    }
    //If no space, grow file
    else
    {
      sectorNumber = this.sectorFree.length;
      var zerobytes = new Buffer(SECTOR_BYTES*sectorsNeeded);
      fs.writeSync(this.fd,zerobytes, 0, zerobytes.length, this.sectorFree.length * SECTOR_BYTES);

      // Expand sectorFree array and allocate this chunk
      var newSectorFree = new Array(sectorsNeeded);
      for(var i = 0; i < this.sectorFree.length; i++) {
        newSectorFree[i] = this.sectorFree[i];
      }
      this.sectorFree = newSectorFree;

      for (var i = 0; i < sectorsNeeded; i++)
      {
        this.sectorFree[sectorNumber + i] = false;
      }

      // Chunk header
      var tempBuf = new Buffer(5);
      tempBuf.writeUInt32BE(data.length+1, 0, true);
      tempBuf[4] = VERSION_DEFLATE;
      fs.writeSync(this.fd,tempBuf, 0, 5, sectorNumber * SECTOR_BYTES);

      //Write chunk data
      fs.writeSync(this.fd,data, 0, data.length, sectorNumber * SECTOR_BYTES + CHUNK_HEADER_SIZE);
    }
  }

  this.setOffset(x, z, (sectorNumber << 8) | sectorsNeeded);
  this.setTimestamp(x, z, Math.floor(new Date() / 1000));

  cb(true);
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