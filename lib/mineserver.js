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

var Client = require('./client');
var Protocol = require('./protocol');

var Mineserver = function Mineserver(config) {
  events.EventEmitter.call(this);

  // Client info
  this.clients = [];
  this.onlineClients = 0;
  this.MaxClients = 50;

  // Server info
  this.config = config;
  this.socket = null;
  // 20 byte server ID
  this.serverID = crypto.randomBytes(10).toString('hex');
  console.log("Server ID: "+this.serverID);

  // Protocol info
  this.protocolName = "1.7.5";
  this.protocolVersion = 4;

};
util.inherits(Mineserver, events.EventEmitter);


Mineserver.prototype.init = function init() {

  var port = this.config.port;
  this.socket = net.createServer(this.connection_open.bind(this));
  this.socket.listen(port, function() {
    console.log('Server listening on port '+port);
  });
};

Mineserver.prototype.connection_open = function connection_open(c) {

  var client = new Client();
  this.clients.push(client);

  client.socket = c;

  this.emit("client:connect", client);

  c.pipe(new Protocol()).pipe(client);

  function connClosed() {
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