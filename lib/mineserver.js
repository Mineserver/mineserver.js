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
var events = require("events");
var net = require('net');
var crypto = require('crypto');
var BigInt = require('BigInt');
var MCBuffer = require('./mcbuffer');
var Client = require('./client');
var Protocol = require('./protocol');
var Map = require('./map');
var Mapgen = require('./mapgen');

var Mineserver = function Mineserver(config) {
  events.EventEmitter.call(this);

  this.map = new Map();
  this.mapgen = new Mapgen();

  // Time info
  this.worldTime = 0;
  this.timeOfDay = 0;

  // Client info
  this.clients = [];
  this.onlineClients = 0;
  this.MaxClients = 50;

  // Global entity ID
  this.EID = 1;

  // Server info
  this.config = config;
  this.socket = null;
  // 16-byte server ID
  this.serverID = crypto.randomBytes(8).toString('hex');
  this.serverID = "-";
  console.log("Server ID: "+this.serverID);

  // Protocol info
  this.protocolName = "1.8.3";
  this.protocolVersion = 47;

  // RSA KEY GENERATION
  this.rsa = {};
  this.rsa.e = BigInt.str2bigInt("65537",10,0);
  this.rsa.b = 512;

  console.log("Generating Prime q");
  while (1) {
    this.rsa.q = BigInt.randTruePrime(this.rsa.b);

    //the prime must not be congruent to 1 modulo e
    if (!BigInt.equalsInt(BigInt.mod(this.rsa.q,this.rsa.e),1))
      break;
  }
  console.log("Generating Prime p");
  while(1) {
    this.rsa.p = BigInt.randTruePrime(this.rsa.b);
    //primes must be distinct and not congruent to 1 modulo e
    if (!BigInt.equals(this.rsa.q,this.rsa.p) && !BigInt.equalsInt(BigInt.mod(this.rsa.p,this.rsa.e),1))
      break;
  }

  console.log("Primes generated!");
  this.rsa.n = BigInt.mult(this.rsa.q,this.rsa.p);
  this.rsa.phi = BigInt.mult(BigInt.addInt(this.rsa.q,-1),BigInt.addInt(this.rsa.p,-1));
  this.rsa.d = BigInt.inverseMod(this.rsa.e,this.rsa.phi);




  setInterval(function(){

    global.server.worldTime += 20;
    global.server.timeOfDay += 20;
    var len = global.server.clients.length;
    var onlineClients = 0;
    for(var i = 0; i < len; i++) {
      var client = global.server.clients[i];
      if (client.inGame) {
        onlineClients++;
        // Time update
        client.push(global.packet.timeUpdate(global.server.worldTime, global.server.timeOfDay));

        //Send keepalive packets
        client.push(new MCBuffer(new Buffer(0)).writeVarInt(0x00)
          .writeVarInt(((new Date).getTime() / 1000) & 0xffff).packetOut(128));
      }
    }
    global.server.onlineClients = onlineClients;
  }, 1000);

};
util.inherits(Mineserver, events.EventEmitter);

Mineserver.prototype.getEID = function getEID() {
  return this.EID++;
}

Mineserver.prototype.init = function () {

  var port = this.config.port;
  this.socket = net.createServer(this.connection_open.bind(this));
  this.socket.listen(port, function() {
    console.log('Server listening on port '+port);
  });
};

Mineserver.prototype.sendAllClients = function (packet, exclude) {
  for(var i = 0; i < this.clients.length; i++)
  {
    var client = this.clients[i];
    if(client.inGame && client.EID != exclude)
    {
      client.push(packet);
    }
  }

};

Mineserver.prototype.connection_open = function (c) {

  var client = new Client();
  this.clients.push(client);

  client.socket = c;

  this.emit("client:connect", client);

  c.pipe(client.encryptedIn).pipe(new Protocol({client: client, state:0})).pipe(client).pipe(client.encryptedOut).pipe(c);

  function connClosed() {
    client.despawn();
    this.emit("client:disconnect", client);
    var index = this.clients.indexOf(client);
    if (index !== -1) {
      this.clients.splice(index, 1);
      console.log("Client disconnected");
    }
  }

  c.on('close', connClosed.bind(this));
  c.on("error", connClosed.bind(this));


};


module.exports = Mineserver;