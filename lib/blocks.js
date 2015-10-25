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

var Blocks = function Blocks() {
  this.ID = new Array(256);

  // Initialize block type array
  for(var i = 0; i < 256; i++) {
    this.ID[i] = {ID: i, stopLight: 16, emitLight: 0, health: 255};
  }

  this.ID[0x0A].emitLight = 15; // Lava
  this.ID[0x0B].emitLight = 15; // Stationary Lava
  this.ID[0x27].emitLight = 1;  // Brown mushroom
  this.ID[0x32].emitLight = 14; // Torch
  this.ID[0x33].emitLight = 15; // Fire
  this.ID[0x3E].emitLight = 14; // Lit furnace
  this.ID[0x4A].emitLight = 9;  // Redstone ore (Glowing)
  this.ID[0x4C].emitLight = 7;  // Redstone Torch (On)
  this.ID[0x59].emitLight = 15; // Lightstone
  this.ID[0x5A].emitLight = 11; // Portal
  this.ID[0x5B].emitLight = 15; // Jack-O-Lantern

  this.ID[0x00].stopLight = 0; // Empty
  this.ID[0x06].stopLight = 0; // Sapling
  this.ID[0x08].stopLight = 2; // Water
  this.ID[0x09].stopLight = 2; // Stationary water
  this.ID[0x12].stopLight = 2; // Leaves
  this.ID[0x14].stopLight = 0; // Glass
  this.ID[0x25].stopLight = 0; // Yellow flower
  this.ID[0x26].stopLight = 0; // Red rose
  this.ID[0x27].stopLight = 0; // Brown mushroom
  this.ID[0x28].stopLight = 0; // Red mushroom
  this.ID[0x32].stopLight = 0; // Torch
  this.ID[0x33].stopLight = 0; // Fire
  this.ID[0x34].stopLight = 0; // Mob spawner
  this.ID[0x35].stopLight = 0; // Wooden stairs
  this.ID[0x37].stopLight = 0; // Redstone wire
  this.ID[0x40].stopLight = 0; // Wooden door
  this.ID[0x41].stopLight = 0; // Ladder
  this.ID[0x42].stopLight = 0; // Minecart track
  this.ID[0x43].stopLight = 0; // Cobblestone stairs
  this.ID[0x47].stopLight = 0; // Iron door
  this.ID[0x4b].stopLight = 0; // Redstone Torch (Off)
  this.ID[0x4C].stopLight = 0; // Redstone Torch (On)
  this.ID[0x4e].stopLight = 0; // Snow
  this.ID[0x4f].stopLight = 2; // Ice
  this.ID[0x55].stopLight = 0; // Fence
  this.ID[0x5A].stopLight = 0; // Portal
  this.ID[0x5B].stopLight = 0; // Jack-O-Lantern
  this.ID[0x3f].stopLight = 0; // Sign post
  this.ID[0x44].stopLight = 0; // Wall sign
};

module.exports = Blocks;
