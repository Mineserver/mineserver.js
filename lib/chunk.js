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
var NBT = require('./nbt');

var Chunk = function Chunk() {

  this.X = 0;
  this.Z = 0;

  this.lastChange = 0;
  this.lastLightgen = 0;

  this.users = new Array();

  this.typeData = new Buffer(16*16*16*16*2);
  this.lightData = new Buffer(16*16*16*16 / 2);
  this.skylightData = new Buffer(16*16*16*16 / 2);
  this.biome = new Buffer(16*16);
  this.blockEntities = NBT_Item.list(10, new Array(), 0, "TileEntities");

  // For internal use, not saved
  this.heightMap = new Buffer(16*16);

};

/*
 Returns number of block entities with the same position
 */
Chunk.prototype.blockEntitiesCount = function(x, y, z)
{
  var count = 0;
  for(var i = 0; i < this.blockEntities.len; i++) {
    if(this.blockEntities.value[i].type == 10){
      if(this.blockEntities.value[i].findItem("id") && this.blockEntities.value[i].findItem("id").value == "Sign") {
        var blockX = this.blockEntities.value[i].findItem("x");
        var blockY = this.blockEntities.value[i].findItem("y");
        var blockZ = this.blockEntities.value[i].findItem("z");
        if(blockX && blockY && blockZ && blockX.value == x && blockY.value == y && blockZ.value == z) {
          count++
        }
      }
    }
  }
  return count;
}

/*
 Function to check that each block entity actually has the correct block in place
 */

Chunk.prototype.cleanBlockEntities = function()
{
  // Check for dead blocks
  for(var i = 0; i < this.blockEntities.len; i++) {
    if(this.blockEntities.value[i].type == 10){
      if(this.blockEntities.value[i].findItem("id")) {
        var blockX = this.blockEntities.value[i].findItem("x");
        var blockY = this.blockEntities.value[i].findItem("y");
        var blockZ = this.blockEntities.value[i].findItem("z");
        if(blockX && blockY && blockZ) {

          var found = false;
          if(blockY.value >= 0 && blockY.value < 256) {
            var block = this.getBlock((blockX.value & 15), blockY.value,(blockZ.value & 15));
            if(this.blockEntities.value[i].findItem("id").value == "Sign") {
              if(block.type == 63 || block.type == 68) { found = true; }
            } else { // Keep unknown for now
              found = true;
            }
          }

          if(!found) {
            this.blockEntities.value.splice(i, 1);
            this.blockEntities.len--;
            i--;
          }
        }
      }
    }
  }

  // Check for multiple block entities in one block
  for(var i = 0; i < this.blockEntities.len; i++) {
    if(this.blockEntities.value[i].type == 10){
      if(this.blockEntities.value[i].findItem("id")) {
        var blockX = this.blockEntities.value[i].findItem("x");
        var blockY = this.blockEntities.value[i].findItem("y");
        var blockZ = this.blockEntities.value[i].findItem("z");
        if(blockX && blockY && blockZ) {
          var count = this.blockEntitiesCount(blockX.value, blockY.value,blockZ.value);
          if(count > 1) {
            console.log("Removing block entity at "+blockX.value+","+blockY.value+","+blockZ.value);
            this.blockEntities.value.splice(i, 1);
            this.blockEntities.len--;
            i--;
          }
        }
      }
    }
  }
}

Chunk.prototype.deleteSign = function(x, y, z)
{
  for(var i = 0; i < this.blockEntities.len; i++) {
    if(this.blockEntities.value[i].type == 10){
      if(this.blockEntities.value[i].findItem("id") && this.blockEntities.value[i].findItem("id").value == "Sign") {
        var signX = this.blockEntities.value[i].findItem("x");
        var signY = this.blockEntities.value[i].findItem("y");
        var signZ = this.blockEntities.value[i].findItem("z");
        if(signX && signY && signZ && signX.value == x && signY.value == y && signZ.value == z) {
          this.blockEntities.value.splice(i, 1);
          this.blockEntities.len --;
          return true;
        }
      }
    }
  }
  return false;
};

Chunk.prototype.updateSign = function(x, y, z, line1, line2, line3, line4)
{

  // ToDo: The block has to be a sign to be updated
  //if(block.type == 63 || block.type == 68)
  {
    for(var i = 0; i < this.blockEntities.len; i++) {
      if(this.blockEntities.value[i].type == 10){
        if(this.blockEntities.value[i].findItem("id") && this.blockEntities.value[i].findItem("id").value == "Sign") {
          var signX = this.blockEntities.value[i].findItem("x");
          var signY = this.blockEntities.value[i].findItem("y");
          var signZ = this.blockEntities.value[i].findItem("z");
          if(signX && signY && signZ && signX.value == x && signY.value == y && signZ.value == z) {
            for(var signItem = 0; signItem < this.blockEntities.value[i].len; signItem++) {
              switch(this.blockEntities.value[i].value[signItem].name) {
                case "Text1":
                  this.blockEntities.value[i].value[signItem].value = line1;
                  break;
                case "Text2":
                  this.blockEntities.value[i].value[signItem].value = line2;
                  break;
                case "Text3":
                  this.blockEntities.value[i].value[signItem].value = line3;
                  break;
                case "Text4":
                  this.blockEntities.value[i].value[signItem].value = line4;
                  break;
                default:
                  break;
              }
            }
            return true;
          }
        }
      }
    }
    // Sign not found, add new
    var signId = NBT_Item.string("Sign", "id");
    var signX = NBT_Item.int(x, "x");
    var signY = NBT_Item.int(y, "y");
    var signZ = NBT_Item.int(z, "z");
    var signText1 = NBT_Item.string(line1, "Text1");
    var signText2 = NBT_Item.string(line2, "Text2");
    var signText3 = NBT_Item.string(line3, "Text3");
    var signText4 = NBT_Item.string(line4, "Text4");
    var Sign = NBT_Item.compound([signId, signX, signY, signZ, signText1, signText2, signText3, signText4],8,"");

    this.blockEntities.value[this.blockEntities.len] = Sign;
    this.blockEntities.len++;
    return true;
  }

  return false;
};

Chunk.prototype.getBlock = function getBlock(x, y, z)
{
  var blockPos = (x + y*16*16 + z*16)*2;
  var block = {};
  block.type = ((this.typeData[blockPos]&0xf0)>>4) | this.typeData[blockPos+1]<<4;

  block.meta = this.typeData[blockPos] & 0xf;

  return block;
};

Chunk.prototype.setBlock = function setBlock(block, x, y, z)
{
  var blockPos = (x + y*16*16 + z*16)*2;
  if(block.type !== undefined)
  {
    var meta = (block.meta === undefined)?0:block.meta;
    this.typeData[blockPos] = ((block.type & 0xf) <<4) | meta;
    this.typeData[blockPos+1]= block.type >>4;
    this.lastChange = Math.floor(new Date() / 1000);
    return true;
  }

  return false;
};

Chunk.prototype.getLight = function getLight(x, y, z)
{
  var blockPos = (x + y*16*16 + z*16)>>1;
  var light = {};
  light.sky = (x%2)?this.skylightData[blockPos]>>4:this.skylightData[blockPos]&0xf;
  light.block = (x%2)?this.lightData[blockPos]>>4:this.lightData[blockPos]&0xf;

  return light;
};

Chunk.prototype.setLight = function setLight(light, x, y, z)
{
  var blockPos = (x + y*16*16 + z*16)>>1;
  if(light.sky !== undefined)
  {
    var newLight = (x%2)?this.skylightData[blockPos]&0xf:this.skylightData[blockPos]&0xf0;
    newLight |= (x%2)?light.sky<<4:light.sky;
    this.skylightData[blockPos] = newLight;
  }
  if(light.block !== undefined) {
    var newLight = (x%2)?this.lightData[blockPos]&0xf:this.lightData[blockPos]&0xf0;
    newLight |= (x%2)?light.block<<4:light.block;
    this.lightData[blockPos] = newLight;
  }

  return true;
};

module.exports = Chunk;
