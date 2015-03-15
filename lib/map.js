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
var Region = require("./mapregion");
var Chunk = require("./chunk");
var NBT = require("./nbt");
var NBT_Item = require("./nbt_item");

// Some better chunk hash generator
function chunkHash(x,z)
{
  return x.toString()+"_"+ z.toString();
}


var Map = function Map() {

  this.chunkmap = new Array();


};

function NBT_to_chunk(nbt) {

  var chunk = new Chunk();
  //Clear the chunk
  chunk.typeData.fill(0x00);
  chunk.lightData.fill(0xff);
  chunk.skylightData.fill(0xff);
  chunk.biome.fill(0x00);

  var Level = nbt.value[0].value[0];

  var Sections = Level.findItem("Sections");
  for(var sect = 0; sect < Sections.len; sect++) {
    var chunkdata = Sections.value[sect];

    var blocks = chunkdata.findItem("Blocks").value;
    var skylight= chunkdata.findItem("SkyLight").value;
    var blocklight= chunkdata.findItem("BlockLight").value;
    var meta= chunkdata.findItem("Data").value;
    var Ypos= chunkdata.findItem("Y").value;

    for(var x = 0; x < 16; x++) {
      for(var z = 0; z < 16; z++) {
        for(var y = 0; y < 16; y++) {
          var blockPos = (x + y*16*16 + z*16);
          var blockMeta = meta[blockPos/2];
          if(x % 2) blockMeta >>= 4;
          else blockMeta &= 0xf;
          chunk.setBlock({ meta: blockMeta, type: blocks[blockPos]}, x, y+Ypos*16, z);
        }
      }
    }

    var lightPos = Ypos*16*16*16/2;
    skylight.copy(chunk.skylightData, lightPos, 0, skylight.length);
    blocklight.copy(chunk.lightData, lightPos, 0, blocklight.length);

    Level.findItem("Biomes").value.copy(chunk.biome, 0, 0, 256);

  }

  return chunk;
}

function chunk_blocks_to_section(chunk, section)
{
  var blockPos = section*16*16*16*2;
  var blocks = new Buffer(4096);
  var meta = new Buffer(2048);

  for(var i = 0; i < 4096; i++) {
    blocks[i] = ((chunk.typeData[blockPos+i*2+1]<<4) | (chunk.typeData[blockPos+i*2]>>4)) & 0xff;
    if(i % 2) meta[i>>1] = (meta[i>>1] & 0xf) | ((chunk.typeData[blockPos+i*2]&0xf) << 4);
    else meta[i>>1] = (meta[i>>1] & 0xf0) | (chunk.typeData[blockPos+i*2]&0xf);
  }

  return {blocks: blocks, meta: meta};
}

function chunk_to_NBT(chunk) {

  var nbt = new NBT();

   var sections_list = new Array(16);
  for(var Y = 0; Y < 16; Y ++) {
    var Section_Y = NBT_Item.byte(Y, "Y");
    var sectTemp = chunk_blocks_to_section(chunk, Y);
    var Section_Blocks = NBT_Item.byte_array(sectTemp.blocks,4096, "Blocks");
    var Section_Data = NBT_Item.byte_array(sectTemp.meta,2048, "Data");

    var Section_SkyLight = NBT_Item.byte_array(chunk.skylightData.slice(Y*16*16*16/2, Y*16*16*16/2+2048),2048, "SkyLight");
    var Section_BlockLight = NBT_Item.byte_array(chunk.lightData.slice(Y*16*16*16/2, Y*16*16*16/2+2048),2048, "BlockLight");

    var section = NBT_Item.compound([Section_Blocks,Section_Data,Section_Y,Section_SkyLight,Section_BlockLight],5, "");
    sections_list[Y] = section;
  }

  var heightmap = new Buffer(256);
  heightmap.fill(100);

  var Level_SectionList = NBT_Item.list(sections_list[0].type,sections_list,16,"Sections");
  var Level_Heightmap = NBT_Item.byte_array(heightmap, 256, "HeightMap");

  var Level_zPos = NBT_Item.int(chunk.Z, "zPos");
  var Level_xPos = NBT_Item.int(chunk.X, "xPos");
  var Level_Biomes = NBT_Item.byte_array(chunk.biome, 256, "Biomes");


  var Level = NBT_Item.compound([Level_SectionList,Level_Heightmap,Level_zPos,Level_xPos,Level_Biomes],5,"Level");

  nbt.toplevel = NBT_Item.compound([NBT_Item.compound([Level],1,"")],1,"");

  return nbt;
}

// Load or generate a chunk
Map.prototype.getChunk = function getChunk(x, z, generate, cb)
{

  var cbGenerate = function() {
    this.chunkmap[chunkHash(x,z)] = global.server.mapgen.generateChunk(x,z);
    cb(true, x, z, this.chunkmap[chunkHash(x,z)]);
  }.bind(this);

  if(this.chunkmap[chunkHash(x,z)] === undefined) {
    if(!generate) return 0;
    // TODO: load from the file
    var mapregion = new Region();
    mapregion.openFile("map",x>>5, z>>5, function(success) {
      if(!success) {
        cbGenerate();
        return;
      }

      mapregion.readChunk(x, z, function(success, data) {
        if(success) {
          var nbt_read = new NBT();
          nbt_read.read(data, 0);

          this.chunkmap[chunkHash(x,z)] = NBT_to_chunk(nbt_read.toplevel);
          this.chunkmap[chunkHash(x,z)].X = x;
          this.chunkmap[chunkHash(x,z)].Z = z;

          cb(true, x, z, this.chunkmap[chunkHash(x,z)]);

          return;
        }
        else {
          cbGenerate();
          return;
        }

      }.bind(this));
    }.bind(this));


  }
  else {
    cb(true, x, z, this.chunkmap[chunkHash(x,z)]);
  }

  return;
};

// get chunk data in the format client wants it
Map.prototype.getChunkData = function getChunkData(x, z, generate, blocklight, skylight, cb)
{
  this.getChunk(x,z, generate, function(success, x, z, chunk) {

    if(chunk === null) {
      cb(null);
      return 0;
    }

    //ToDo: push this to cache?
    var chunkLen = 16*16*16*2 + (blocklight?16*16*8:0) + (skylight?16*16*8:0);

    var chunkData = new Buffer(chunkLen*16 + 256);

    var curpos = 0;
    for(var chunkPart = 0; chunkPart < 16; chunkPart++ ) {
       for(var i = 0; i < 16*16*16*2; i++, curpos++) {
         chunkData[curpos] = chunk.typeData[16*16*16*2 * chunkPart + i];
       }
    }
    if(blocklight) {
      for(var chunkPart = 0; chunkPart < 16; chunkPart++ ) {
        for (var i = 0; i < 16 * 16 * 16 / 2; i++, curpos++) {
          chunkData[curpos] = chunk.lightData[16 * 16 * 8 * chunkPart + i];
        }
      }
    }
    if(skylight) {
      for(var chunkPart = 0; chunkPart < 16; chunkPart++ ) {
        for (var i = 0; i < 16 * 16 * 16 / 2; i++, curpos++) {
          chunkData[curpos] = chunk.skylightData[16 * 16 * 8 * chunkPart + i];
        }
      }
    }

    for(var i = 0; i < 256; i++) {
      chunkData[chunkLen * 16 + i] = chunk.biome[i];
    }

    cb(x, z, chunkData);
    return;
  });
};

// Return data for a block
Map.prototype.getBlock = function getBlock(x, y, z, cb)
{
  this.getChunk(x>>4,z>>4, false, function(success, chunkx, chunkz, chunk) {
    if (chunk === 0) return false;

    cb(chunk.getBlock(x & 15, y, z & 15));
  });
};

// Return data for a block
Map.prototype.setBlock = function setBlock(block, x, y, z)
{
  this.getChunk(x>>4,z>>4, false, function(success, chunkx, chunkz, chunk) {

    if(chunk === 0) return false;

    if(chunk.setBlock(block, x&15, y, z&15)){
      var meta = (block.meta === undefined)?0:block.meta;
      var blockID = (block.type << 4) | meta;
      global.server.sendAllClients(global.packet.blockChange(x, y, z,blockID), -1);
      return true;
    }
    return false;
  });
  return true;
};

// Load or generate a chunk
Map.prototype.saveAll = function (cb) {

  var keylist = new Array();
  var curKey = 0;
  var keyCount = 0;
  for (var key in this.chunkmap) {
    keylist[keyCount++] = key;
  }

  var theMap = this;
  function processNext() {
    if(curKey == keyCount) { cb(); return; }
    var key = keylist[curKey++];
     // Only save if changes have been made
     if(theMap.chunkmap[key].lastChange) {
       var mapregion = new Region();
       mapregion.openFile("map",theMap.chunkmap[key].X>>5, theMap.chunkmap[key].Z>>5, function(success) {
         if(!success) { processNext(); return; };
         var nbt = chunk_to_NBT(theMap.chunkmap[key]);
         nbt.write(nbt.toplevel);
         mapregion.writeChunk(nbt.dataBuffer, theMap.chunkmap[key].X, theMap.chunkmap[key].Z, function(success) {
           if(success) theMap.chunkmap[key].lastChange = 0;
           processNext();
         });
       });
     } else processNext();
  };
  processNext();

};


module.exports = Map;