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
var Blocks = require("./blocks");

var Blockdata = new Blocks();

var Lighting = function Lighting() {

};


Lighting.generateLight = function generateLight(x, z, chunk) {


  console.log("generateLight "+x+","+z);

  var queue = [];

  // ToDo: get neighboring chunks
  /*
  var chunk_left   = getChunk(x-1, z, false);
  var chunk_right  = getChunk(x+1, z, false);
  var chunk_top    = getChunk(x, z+1, false);
  var chunk_bottom = getChunk(x, z-1, false);
  */

  // Zero all light
  chunk.skylightData.fill(0);
  chunk.lightData.fill(0);

  /*
   First process skylight and at the same time get heightmap
  */
  var light = 15;
  var maxHeight = 0;
  for (var block_x = 0; block_x < 16; block_x++) {
    for (var block_z = 0; block_z < 16; block_z++) {
      light = 15;
      var heightFound = false;
      var blockx_blockz = block_x + (block_z << 4);
      for (var block_y = 255; block_y >= 0; block_y--) {
        var index = (blockx_blockz + (block_y << 8))<<1;

        var blockType = ((chunk.typeData[index]&0xf0)>>4) | chunk.typeData[index+1]<<4;

        if(blockType != 0) {
          // set heightmap
          if(!heightFound) {
            heightFound = true;
            if(block_y > maxHeight) maxHeight = block_y;
            chunk.heightMap[blockx_blockz] = block_y;
          }
        }

        chunk.setLight({sky: light}, block_x, block_y, block_z);

        // Decrease light intensity
        light -= Blockdata.ID[blockType].stopLight;
        if (light < 1) block_y=0;
      }
    }
  }

  //console.log("Max height: "+maxHeight);

  // Loop through from maxheight to height for spreading
  for (var block_x = 0; block_x < 16; block_x++) {
    for (var block_z = 0; block_z < 16; block_z++) {
      light = 15;
      var heightFound = false;
      var blockx_blockz = block_x + (block_z << 4);
      for (var block_y = maxHeight; block_y >= 0; block_y--) {
        var index = (blockx_blockz + (block_y << 8))<<1;
        var blockType = ((chunk.typeData[index]&0xf0)>>4) | chunk.typeData[index+1]<<4;

        // Decrease light intensity
        light -= Blockdata.ID[blockType].stopLight;
        if (light < 0) light = 0;

        if(light > 1) {
          queue.push({x: block_x, y: block_y, z: block_z, type: "sky", light: light});
        }
        else block_y=0;
      }
    }
  }

  // Process block light
  for (var block_x = 0; block_x < 16; block_x++) {
    for (var block_z = 0; block_z < 16; block_z++) {
      light = 15;
      var heightFound = false;
      var blockx_blockz = block_x + (block_z << 4);
      for (var block_y = chunk.heightMap[blockx_blockz]; block_y >= 0; block_y--) {
        var index = (blockx_blockz + (block_y << 8))<<1;
        var blockType = ((chunk.typeData[index]&0xf0)>>4) | chunk.typeData[index+1]<<4;

        if(blockType != 0 && Blockdata.ID[blockType].emitLight) {
          light = Blockdata.ID[blockType].emitLight;
          chunk.setLight({block: light}, block_x, block_y, block_z);

          // Spread light if it has intensity more than 1
          if(light > 1) {
            queue.push({x: block_x, y: block_y, z: block_z, type: "block", light: light});
          }
        }
      }
    }
  }

  //console.log("Queue len: "+queue.length);

  this.spreadLight(queue, chunk);
  this.lastLightgen = Math.floor(new Date() / 1000);
};

Lighting.spreadLight = function spreadLight(queue, chunk) {

  while(queue.length > 0) {

    var block = queue.pop();
    // If no light, stop!
    if (block.light < 1) {
      return;
    }

    for (var direction = 0; direction < 6; direction++) {

      var x_toset = block.x;
      var y_toset = block.y;
      var z_toset = block.z;

      switch (direction) {
        case 0: x_toset++; break;
        case 1: x_toset--; break;
        case 2: y_toset++; break;
        case 3: y_toset--; break;
        case 4: z_toset++; break;
        case 5: z_toset--; break;
      }

      // ToDo: handle moving to neighboring chunks
      if(x_toset < 0 || x_toset > 15) continue;
      if(z_toset < 0 || z_toset > 15) continue;
      if(y_toset < 0 || y_toset > 255) continue;

      var currentBlock = chunk.getBlock(x_toset, y_toset, z_toset);
      var currentLight = chunk.getLight(x_toset, y_toset, z_toset);

      var newLight = block.light - 1;

      if (newLight > (block.type == "sky" ? currentLight.sky : currentLight.block)) {
        if (block.type == "sky") chunk.setLight({sky: newLight},x_toset, y_toset, z_toset);
        else if (block.type == "block") chunk.setLight({block: newLight},x_toset, y_toset, z_toset);

        if(newLight - Blockdata.ID[currentBlock.type].stopLight > 1) {
          queue.push({x: x_toset, y: y_toset, z: z_toset, type: block.type, light: newLight - Blockdata.ID[currentBlock.type].stopLight});
        }
      }
    }
  }
};

module.exports = Lighting;
