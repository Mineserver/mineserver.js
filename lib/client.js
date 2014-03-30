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
  this._buffer = new Buffer(0);
  this.socket = null;
  this.state = 0;
  this.nick = "";
  this.SharedSecret = "";
  this.verifyToken = "";

  //AES
  this.encryptedIn = new PassThrough();
  this.encryptedOut = new PassThrough();

  //Init writable stream
  stream.Transform.call(this, {objectMode: true});
}
// http://nodejs.org/api/stream.html
util.inherits(Client, stream.Transform);

// Function to read stuff that is being written to this stream
Client.prototype._transform = function _transform(chunk, encoding, callback) {

  // Chunk contains full packet in object mode
  var packet = chunk;


  console.warn(util.inspect(packet));

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
          "max": global.server.MaxClients,"online": global.server.onlineClients,
          "sample": [
            {
              "name": "Fador",
              "id": "4566e69fc90748ee8d71d7ba5aa00d20"
            }
          ]
        },
        "description": {"text": global.server.config.serverName}
      };
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x00).writeUtf8(JSON.stringify(serverInfo)).packetOut());
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
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x01).writeUtf8(serverID).writeUInt16(publicKey.length).concat(publicKey).writeUInt16(this.verifyToken.length).concat(this.verifyToken).packetOut());

    }
    else if(packet.ID == 1)
    {

      var SharedSecretHex = packet.SharedSecret.toString('hex').toUpperCase();
      var verifyTokenHex = packet.verifyToken.toString('hex').toUpperCase();
      var SharedSecret = BigInt.str2bigInt(SharedSecretHex, 16, 0);
      var verifyToken  = BigInt.str2bigInt(verifyTokenHex, 16, 0);

      // Alternative way, slower
      //var verifyTokenDecrypted  = BigInt.powMod(verifyToken,global.server.rsa.d,global.server.rsa.n);
      //var SharedSecretDecrypted = BigInt.powMod(SharedSecret,global.server.rsa.d,global.server.rsa.n);

      var verifyTokenDecrypted = BigInt.bigInt2str(rsa_decrypt(verifyToken),16);
      var SharedSecretDecrypted = BigInt.bigInt2str(rsa_decrypt(SharedSecret),16);

      var VerifyToken_Padded   = new Buffer("0"+verifyTokenDecrypted, 'hex');
      var SharedSecret_Padded  = new Buffer("0"+SharedSecretDecrypted, 'hex');

      var VerifyToken = rsa_remove_padding_PKCS1(VerifyToken_Padded);

      //console.warn("VerifyToken: " + VerifyToken.toString('hex'));

      // Check that the token matches
      if(VerifyToken.toString('hex') != this.verifyToken.toString('hex'))
      {
        console.warn("Verify token mismatch!");
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

      // Login Success
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x02)
        .writeUtf8("Test_UUID")
        .writeUtf8("Fador")
        .packetOut());

      // Join Game
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x01)
        .writeInt32(12345) // Entity ID
        .writeUInt8(0) // Gamemode
        .writeUInt8(0) // Dimension
        .writeUInt8(1) // Difficulty
        .writeUInt8(global.server.MaxClients) // Max players
        .writeUtf8("default") //Level type
        .packetOut());

      // Spawn pos
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x05)
        .writeInt32(0).writeInt32(0).writeInt32(0)
        .packetOut());

      // Player abilities
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x39)
        .writeUInt8(0).writeFloat(0.0).writeFloat(0.0)
        .packetOut());
                   /*
      //Player Position And Look
      this.push(new MCBuffer(new Buffer(0)).writeUInt8(0x06)
        .writeDouble(0.0).writeDouble(100.0).writeDouble(101.62).writeDouble(0.0)
        .writeFloat(0.0).writeFloat(0.0).writeUInt8(1)
        .packetOut());
        */
      //console.warn("SharedSecret: " + this.SharedSecret.toString('hex'));
    }
  }
  return callback();
};

module.exports = Client;