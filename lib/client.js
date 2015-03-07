/*
 Copyright (c) 2014, The Mineserver Project
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
var stream = require("stream");
var MCBuffer = require('./mcbuffer');
var BigInt = require('BigInt');
var Protocol = require('./protocol');
var crypto = require('crypto');
var uuid = require('node-uuid');
var Packetizer = require('./packetizer');


util.inherits(PassThrough, stream.Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  stream.Transform.call(this, {objectMode: true});
}
PassThrough.prototype._transform = function(chunk, encoding, done) {
  this.push(chunk);
  done();
};


function rsa_remove_padding_PKCS1(val)
{
  var output = new Buffer(0);
  var i = 0;
  for(; i < val.length; i++)
    if(val[i] == 0) break;
  i++;

  for(; i < val.length; i++)
  {
    var str = new Buffer(1);
    str[0] = val[i];
    output = Buffer.concat([output,str]);
  }

  return output;
}


function rsa_decrypt(c)
{
  var P = BigInt.powMod(BigInt.mod(c,global.server.rsa.p),BigInt.mod(global.server.rsa.d,BigInt.addInt(global.server.rsa.p,-1)),global.server.rsa.p);
  var Q = BigInt.powMod(BigInt.mod(c,global.server.rsa.q),BigInt.mod(global.server.rsa.d,BigInt.addInt(global.server.rsa.q,-1)),global.server.rsa.q);
  if (BigInt.greater(P,Q)) {
    var t=P; P=Q; Q=t;
    t=global.server.rsa.p; global.server.rsa.p=global.server.rsa.q; global.server.rsa.q=t;
  }
  return BigInt.add(BigInt.mult(BigInt.multMod(BigInt.sub(Q,P),BigInt.inverseMod(global.server.rsa.p,global.server.rsa.q),global.server.rsa.q),global.server.rsa.p),P);
}



var Client = function Client(options) {

  this.EID = global.server.getEID();
  this.UUID = uuid.v1();
  this.UUID = this.UUID.replace("-1", "-3");
  this.UUID_buffer = new Buffer(uuid.parse(this.UUID));

  this.nick = "";
  this.inGame = 0;

  this._buffer = new Buffer(0);
  this.socket = null;
  this.state = 0;
  this.SharedSecret = "";
  this.verifyToken = "";

  //AES
  this.encryptedIn = new PassThrough();
  this.encryptedOut = new PassThrough();

  // Position
  this.X = 0.0;
  this.Y = 0.0;
  this.Z = 0.0;
  this.yaw = 0.0;
  this.pitch = 0.0;

  //Init writable stream
  stream.Transform.call(this, {objectMode: true});
}
// http://nodejs.org/api/stream.html
util.inherits(Client, stream.Transform);

Client.prototype.despawn = function() {

  if(this.inGame)
  {
    // Player List Item remove
    var packetOut = new MCBuffer(new Buffer(0)).writeVarInt(0x38)
      .writeVarInt(4) // Action, 4 = remove
      .writeVarInt(1) // Number Of Players
      .concat(this.UUID_buffer)
      .packetOut();
    global.server.sendAllClients(packetOut, this.EID);

    // Destroy Entities
    var packetOut = new MCBuffer(new Buffer(0)).writeVarInt(0x13)
      .writeVarInt(1) // count
      .writeVarInt(this.EID) // Entity ID
      .packetOut();
    global.server.sendAllClients(packetOut, this.EID);
  }
}
Client.prototype.setPosition = function setPosition(X, Y, Z, yaw, pitch, onground, exclude)
{
  // Update local variables
  this.X = X;
  this.Y = Y;
  this.Z = Z;
  this.yaw = yaw;
  this.pitch = pitch;

  //Entity teleport
  var packetOut = new MCBuffer(new Buffer(0)).writeVarInt(0x18)
    .writeVarInt(this.EID)
    .writeInt32(Math.round(X*32.0))
    .writeInt32(Math.round(Y*32.0))
    .writeInt32(Math.round(Z*32.0))
    .writeUInt8(((Math.floor(yaw)%360) * 255) / 360)
    .writeUInt8(((Math.floor(pitch)%360) * 255) / 360)
    .writeUInt8(onground)
    .packetOut();
  global.server.sendAllClients(packetOut, exclude);

}

Client.prototype.setLook = function setLook(yaw, pitch, onground, exclude)
{
  // Update local variables
  this.yaw = yaw;
  this.pitch = pitch;

  //Entity teleport
  var packetOut = new MCBuffer(new Buffer(0)).writeVarInt(0x19)
    .writeVarInt(this.EID)
    .writeUInt8(((Math.floor(yaw)%360) * 255) / 360)
    .packetOut();
  global.server.sendAllClients(packetOut, exclude);
}

// Function to read stuff that is being written to this stream
Client.prototype._transform = function _transform(chunk, encoding, callback) {

  // Chunk contains full packet in object mode
  var packet = chunk;


  //console.warn(util.inspect(packet));

  //TODO: move this stuff away from Client
  //Output format:
  //[packetlen:varint, packetType:varint, packetData]

  if(this.state == 0)
  {
    // Handle packets
    if(packet.ID == 0)
    {
      this.state = packet.nextState;
    }
  }
  else if(this.state == 1)
  {
    // Handle packets
    if(packet.ID == 0)
    {
      var serverInfo =
      {"version": {"name": global.server.protocolName, "protocol": global.server.protocolVersion},
        "players": {
          "max": global.server.MaxClients,"online": global.server.onlineClients /*,

          "sample": [
            {
              "name": "Fador",
              "id": "4566e69fc7e748ee8d71d7ba5aa00d20"
            }
          ] */
        },
        "description": {"text": global.server.config.serverName}
      };
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x00).writeUtf8(JSON.stringify(serverInfo)).packetOut());
      console.log(JSON.stringify(serverInfo));
    }
    if(packet.ID == 0x01)
    {
      // Write response and close socket
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x01).writeUInt64(packet.time).packetOut());
      this.socket.end();
    }
  }
  else if(this.state == 2)
  {
    // Handle packets
    if(packet.ID == 0)
    {
      // Grab player nick
      this.nick = packet.nick;

      // Encryption Request
      console.log("Response: "+global.server.serverID);
      var serverID = global.server.serverID;

      //  SEQUENCE { SEQUENCE { OBJECTIDENTIFIER 1.2.840.113549.1.1.1 (rsaEncryption) NULL } BITSTRING
      var pub_temp = "30819f300d06092a864886f70d010101050003818d00308189";
          pub_temp += "02818100"; // int len 129
          pub_temp += BigInt.bigInt2str(global.server.rsa.n,16);
          pub_temp += "0203010001"; // e = 65537

      var publicKey = new Buffer(pub_temp, "hex");
      this.verifyToken = new Buffer(4);
      var hexString = "0123456789abcdef";
      for(var i = 0; i < 4; i++)
        this.verifyToken[i] = hexString[Math.floor(Math.random()*16.0)];

      console.warn("verifyToken: "+this.verifyToken.toString('hex'));
      //console.warn("Pubkey len: "+publicKey.length);
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x01).writeUtf8(serverID).writeVarInt(publicKey.length).concat(publicKey).writeVarInt(this.verifyToken.length).concat(this.verifyToken).packetOut());

    }
    else if(packet.ID == 1)
    {

      var SharedSecretHex = packet.SharedSecret.toString('hex').toUpperCase();
      var verifyTokenHex = packet.verifyToken.toString('hex').toUpperCase();
      var SharedSecret = BigInt.str2bigInt(SharedSecretHex, 16, 0);
      var verifyToken  = BigInt.str2bigInt(verifyTokenHex, 16, 0);

      // Alternative way, slower
      //var verifyTokenDecrypted  = BigInt.bigInt2str(BigInt.powMod(verifyToken,global.server.rsa.d,global.server.rsa.n),16);
      //var SharedSecretDecrypted = BigInt.bigInt2str(BigInt.powMod(SharedSecret,global.server.rsa.d,global.server.rsa.n),16);

      var verifyTokenDecrypted = BigInt.bigInt2str(rsa_decrypt(verifyToken),16);
      var SharedSecretDecrypted = BigInt.bigInt2str(rsa_decrypt(SharedSecret),16);

      //console.log("Verify: " + verifyTokenDecrypted + " Secret: " + SharedSecretDecrypted);

      var VerifyToken_Padded = new Buffer((verifyTokenDecrypted.length&1?"0":"")+ verifyTokenDecrypted, 'hex');
      var SharedSecret_Padded = new Buffer((SharedSecretDecrypted.length&1?"0":"")+SharedSecretDecrypted, 'hex');

      var VerifyToken = rsa_remove_padding_PKCS1(VerifyToken_Padded);

      //console.warn("VerifyToken: " + VerifyToken.toString('hex'));

      // Check that the token matches
      if(VerifyToken.toString('hex') != this.verifyToken.toString('hex'))
      {
        console.warn("Verify token mismatch: "+VerifyToken.toString('hex') +"!="+this.verifyToken.toString('hex'));
        this.socket.end();
        return;
      }
      this.SharedSecret = rsa_remove_padding_PKCS1(SharedSecret_Padded);

      // Unpipe existing pipes
      this.socket.unpipe(this.encryptedIn);
      this.unpipe(this.encryptedOut);
      this.encryptedOut.unpipe(this.socket);

      // Create stream ciphers
      this.encryptedIn = crypto.createDecipheriv('aes-128-cfb8',this.SharedSecret, this.SharedSecret);
      this.encryptedOut = crypto.createCipheriv('aes-128-cfb8',this.SharedSecret, this.SharedSecret);

      this.state ++;

      // Create new encrypted pipe chain
      this.socket.pipe(this.encryptedIn).pipe(new Protocol({state : this.state})).pipe(this).pipe(this.encryptedOut).pipe(this.socket);

      //TODO: authenticate user

      // Login Success
      this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x02)
        .writeUtf8(this.UUID)
        .writeUtf8(this.nick)
        .packetOut());

      // Join Game
      this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x01)
        .writeInt32(this.EID) // Entity ID
        .writeUInt8(0) // Gamemode
        .writeUInt8(0) // Dimension
        .writeUInt8(1) // Difficulty
        .writeUInt8(global.server.MaxClients) // Max players
        .writeUtf8("default") //Level type
        .writeUInt8(0) // Reduced Debug Info
        .packetOut());

      // Spawn pos
      this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x05)
        .writePosition(0, 101, 0)
        .packetOut());

      // Time update
      this.push(new Packetizer().timeUpdate(global.server.worldTime, global.server.timeOfDay));

      // Player abilities
      this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x39)
        .writeUInt8(5).writeFloat(0.5).writeFloat(1.0)
        .packetOut());

      // Player position and look
      this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x08)
        .writeDouble(0.0).writeDouble(101.0).writeDouble(0.0)
        .writeFloat(0.0).writeFloat(0.0).writeUInt8(0)
        .packetOut());

      this.setPosition(0.0, 200.0, 0.0, 0.0, 0.0, 0.0, -1);

      //Send MOTD
      if(global.server.config.MOTD !== undefined) {
        var messageOut =
        {
          "text": global.server.config.MOTD,
          "obfuscated": false
        };
        this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x02)
          .writeUtf8(JSON.stringify(messageOut)).writeUInt8(1).packetOut());
      }

      // Player List Item
      var packetOut = new MCBuffer(new Buffer(0)).writeVarInt(0x38)
        .writeVarInt(0) // Action, 0 = add
        .writeVarInt(1) // Number Of Players
        .concat(this.UUID_buffer)
        .writeUtf8(this.nick)
        .writeVarInt(0) // Properties
        .writeVarInt(1)  // Gamemode
        .writeVarInt(10)  // ping
        .writeUInt8(0)  // has displayname
        .packetOut();
      global.server.sendAllClients(packetOut, this.EID);


      // Spawn player
      var packetOut =  new MCBuffer(new Buffer(0)).writeVarInt(0x0c)
        .writeVarInt(this.EID) // Entity ID
        .concat(this.UUID_buffer)
        .writeInt32(Math.round(this.X*32.0))
        .writeInt32(Math.round(this.Y*32.0))
        .writeInt32(Math.round(this.Z*32.0))
        .writeUInt8(Math.floor(((this.yaw%360.0) / 360.0) * 256.0))
        .writeUInt8(Math.floor(((this.pitch%360.0) / 360.0) * 256.0))
        .writeUInt16(0) // Current item
        .writeUInt8((4<<5) | 2) // Metadata, type 4 = string, index 6 = name tag
        .writeUtf8(this.nick)
        .writeUInt8((3<<5) | 6)// Metadata, type 3 = float, index 6 = health
        .writeFloat(50)
        .writeUInt8(0x7F) // Metadata
        .packetOut();
      global.server.sendAllClients(packetOut, this.EID);

      for(var i = 0; i < global.server.clients.length; i++)
      {
        var client = global.server.clients[i];
        if(client.inGame && client.EID != this.EID)
        {

          this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x38)
            .writeVarInt(0) // Action, 0 = add
            .writeVarInt(1) // Number Of Players
            .concat(client.UUID_buffer)
            .writeUtf8(client.nick)
            .writeVarInt(0) // Properties
            .writeVarInt(1)  // Gamemode
            .writeVarInt(10)  // ping
            .writeUInt8(0)  // has displayname
            .packetOut());

          this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x0c)
            .writeVarInt(client.EID) // Entity ID
            .concat(client.UUID_buffer)
            .writeInt32(Math.round(client.X*32.0))
            .writeInt32(Math.round(client.Y*32.0))
            .writeInt32(Math.round(client.Z*32.0))
            .writeUInt8(Math.floor(((client.yaw%360.0) / 360.0) * 256.0))
            .writeUInt8(Math.floor(((client.pitch%360.0) / 360.0) * 256.0))
            .writeUInt16(0) // Current item
            .writeUInt8((4<<5) | 2) // Metadata, type 4 = string, index 6 = name tag
            .writeUtf8(client.nick)
            .writeUInt8((3<<5) | 6)// Metadata, type 3 = float, index 6 = health
            .writeFloat(50)        // Health
            .writeUInt8(0x7F) // Metadata
            .packetOut());

        }
      }

      this.inGame = 1;


      var chunk = global.server.map.getChunkData(0,0, true, true, true);

      this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x21)
        .writeInt32(0).writeInt32(0).writeUInt8(1)
        .writeUInt16(0xFFFF).writeVarInt(chunk.length)
        .concat(chunk).packetOut());

      //Player Position And Look
      this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x08)
        .writeDouble(0.0).writeDouble(101.0).writeDouble(0.0)
        .writeFloat(0.0).writeFloat(0.0).writeUInt8(0)
        .packetOut());

      // Chunk Data Packet
      for(var x = -2; x < 2; x++) {
        for(var z = -2; z < 2; z++) {
          if(!x && !z) continue;
          var chunk = global.server.map.getChunkData(x,z, true, true, true);
          this.push(new MCBuffer(new Buffer(0)).writeVarInt(0x21)
            .writeInt32(x).writeInt32(z).writeUInt8(1)
            .writeUInt16(0xFFFF).writeVarInt(chunk.length)
            .concat(chunk).packetOut());
        }
      }


    }
  }
  // Play state
  else if(this.state == 3)
  {
    // Handle packets

    // Keepalive answer
    if(packet.ID == 0)
    {

    }
    // Chat message
    if(packet.ID == 0x01)
    {

      var messageOut =
        {
          "text": "<"+this.nick+"> "+packet.message,
          "with": [
          this.nick
          ]
        };
      var packetOut = new MCBuffer(new Buffer(0)).writeVarInt(0x02)
        .writeUtf8(JSON.stringify(messageOut)).writeUInt8(0).packetOut();
      global.server.sendAllClients(packetOut, -1);
    }
    //Player position
    else if(packet.ID == 0x04)
    {
      this.setPosition(packet.X, packet.feetY, packet.Z, this.yaw, this.pitch, packet.onground, this.EID);
    }
    //Player look
    else if(packet.ID == 0x05)
    {
      this.setLook(packet.yaw, packet.pitch, packet.onground, this.EID);
    }
    //Player position and look
    else if(packet.ID == 0x06)
    {
      this.setPosition(packet.X, packet.feetY, packet.Z, packet.yaw, packet.pitch, packet.onground, this.EID);
    }
    // Player digging
    else if(packet.ID == 0x07)
    {
      console.warn(util.inspect(packet));
       if(packet.status == 2)
       {
         var block = { type: 0, meta: 0};
         global.server.map.setBlock(block, packet.location.x, packet.location.y, packet.location.z);
       }
    }
    // Player block placement
    else if(packet.ID == 0x08)
    {

    }
    // Player animation
    else if(packet.ID == 0x0a)
    {
      var packetOut = new Packetizer().animation(this.EID, 0); // 0 = swing arm
      global.server.sendAllClients(packetOut, this.EID);
    }

  }
  return callback();
};

module.exports = Client;