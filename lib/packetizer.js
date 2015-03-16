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
 Entity Equipment
 */
Packetizer.prototype.entityEquipment = function packet_0x04(EID, slot, item)
{
  if(item.ID != -1) {
    return new MCBuffer(new Buffer(0)).writeVarInt(0x04)
      .writeVarInt(EID)
      .writeInt16(slot)
      .writeInt16(item.ID)
      .writeUInt8(1)
      .writeInt16(item.meta)
      .writeUInt8(0)
      .packetOut(128);
  }

  return new MCBuffer(new Buffer(0)).writeVarInt(0x04)
    .writeVarInt(EID)
    .writeInt16(slot)
    .writeInt16(-1)
    .packetOut(128);
};


/*
 Animation
 */
Packetizer.prototype.animation = function packet_0x0b(EID, animation)
{
  // Block change
  return new MCBuffer(new Buffer(0)).writeVarInt(0x0b)
    .writeVarInt(EID)
    .writeUInt8(animation)
    .packetOut(128);
};


/*
  Spawn player
 */
Packetizer.prototype.spawnPlayer = function packet_0x0c(EID, UUID_buffer, X, Y, Z, yaw, pitch, name)
{

  return new MCBuffer(new Buffer(0)).writeVarInt(0x0c)
    .writeVarInt(EID) // Entity ID
    .concat(UUID_buffer)
    .writeInt32(Math.round(X*32.0))
    .writeInt32(Math.round(Y*32.0))
    .writeInt32(Math.round(Z*32.0))
    .writeUInt8(Math.floor(((yaw%360.0) / 360.0) * 256.0))
    .writeUInt8(Math.floor(((pitch%360.0) / 360.0) * 256.0))
    .writeUInt16(0) // Current item
    .writeUInt8((4<<5) | 2) // Metadata, type 4 = string, index 6 = name tag
    .writeUtf8(name)
    .writeUInt8((3<<5) | 6)// Metadata, type 3 = float, index 6 = health
    .writeFloat(50)
    .writeUInt8(0x7F) // Metadata
    .packetOut(128);
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
    .packetOut(128);
};

/*
 Game mode
 */
Packetizer.prototype.gameMode = function packet_0x2b(reason, value)
{
  return new MCBuffer(new Buffer(0)).writeVarInt(0x2b)
    .writeUInt8(reason)
    .writeFloat(value)
    .packetOut(128);
};

/*
 Update Sign
 */
Packetizer.prototype.updateSign = function packet_0x33(x, y, z, line1, line2, line3, line4)
{
  return new MCBuffer(new Buffer(0)).writeVarInt(0x33)
    .writePosition(x,y,z)
    .writeUtf8(line1)
    .writeUtf8(line2)
    .writeUtf8(line3)
    .writeUtf8(line4)
    .packetOut(128);
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
  .packetOut(128);
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
    .packetOut(128);
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
    .packetOut(128);
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
    .writeVarInt(newBlock).packetOut(128);
};

Packetizer.prototype.setCompression = function packet_0x46(threshold)
{
  return new MCBuffer(new Buffer(0)).writeVarInt(0x46)
    .writeVarInt(threshold).packetOut(0);
};

module.exports = Packetizer;