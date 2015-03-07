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

var MCBuffer = require('./mcbuffer');

var Packetizer = function Packetizer() {

}


/*
 Animation
 */
Packetizer.prototype.animation = function packet_0x0b(EID, animation)
{
  // Block change
  return new MCBuffer(new Buffer(0)).writeVarInt(0x0b)
    .writeVarInt(EID)
    .writeUInt8(animation)
    .packetOut();
};



/*
 Entity teleport
 */
Packetizer.prototype.entityTeleport = function packet_0x18(EID, X, Y, Z, yaw, pitch, onground)
{
  return new MCBuffer(new Buffer(0)).writeVarInt(0x18)
    .writeVarInt(EID)
    .writeInt32(Math.round(X*32.0))
    .writeInt32(Math.round(Y*32.0))
    .writeInt32(Math.round(Z*32.0))
    .writeUInt8(((Math.floor(yaw)%360) * 255) / 360)
    .writeUInt8(((Math.floor(pitch)%360) * 255) / 360)
    .writeUInt8(onground)
    .packetOut();
};


/*
 Player list item
 */
Packetizer.prototype.playerListAddSingle = function packet_0x38_add(UUID_buffer, name, gamemode, ping)
{
  return new MCBuffer(new Buffer(0)).writeVarInt(0x38)
  .writeVarInt(0) // Action, 0 = add
  .writeVarInt(1) // Number Of Players
  .concat(UUID_buffer)
  .writeUtf8(name)
  .writeVarInt(0) // Properties
  .writeVarInt(gamemode)  // Gamemode
  .writeVarInt(ping)  // ping
  .writeUInt8(0)  // has displayname
  .packetOut();
};

/*
 Player list item
 */
Packetizer.prototype.playerListRemoveSingle = function packet_0x38_remove(UUID_buffer)
{
  return new MCBuffer(new Buffer(0)).writeVarInt(0x38)
    .writeVarInt(4) // Action, 4 = remove
    .writeVarInt(1) // Number Of Players
    .concat(UUID_buffer)
    .packetOut();
};



/*
 Time update
 */
Packetizer.prototype.timeUpdate = function packet_0x03(worldAge, timeOfDay)
{
  return new MCBuffer(new Buffer(0)).writeVarInt(0x03)
    .writeUInt32(0)
    .writeUInt32(worldAge)
    .writeUInt32(0)
    .writeUInt32(timeOfDay)
    .packetOut();
};

/*
Block change packet (0x23)
 blockX, blockY, blockZ: int32
 newBlock: int16 (12bit block ID + 4bit meta)
 */
Packetizer.prototype.blockChange = function packet_0x23(blockX, blockY, blockZ, newBlock)
{
  // Block change
  return new MCBuffer(new Buffer(0)).writeVarInt(0x23)
    .writePosition(blockX, blockY, blockZ)
    .writeVarInt(newBlock).packetOut();
};

module.exports = Packetizer;