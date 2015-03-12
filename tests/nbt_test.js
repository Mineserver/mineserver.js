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
var fs = require('fs');
var NBT = require("../lib/nbt");

fs.readFile('hello_world.nbt', function (err, data) {
  if (err) throw err;
  var nbt_read = new NBT();
  var nbt_read_2 = new NBT();
  var nbt_write = new NBT();
  nbt_read.read(data, 0);
  nbt_read.debug(nbt_read.toplevel);
  console.warn(util.inspect(nbt_read.toplevel), showHidden=false, depth=2, colorize=true);
  nbt_write.write(nbt_read.toplevel);
  console.warn(util.inspect(nbt_write), showHidden=false, depth=2, colorize=true);

  nbt_read_2.read(nbt_write.dataBuffer, 0);
  console.warn(util.inspect(nbt_read_2.toplevel), showHidden=false, depth=2, colorize=true);
  var outbuf = new Buffer(nbt_write.bufferPos-1);
  nbt_write.dataBuffer.copy(outbuf, 0, 0, nbt_write.bufferPos-1);
  fs.writeFile('hello_world2.nbt', outbuf, function (err) {
    if (err) throw err;
  });
});
