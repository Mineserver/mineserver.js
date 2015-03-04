/**
 * Created with IntelliJ IDEA.
 * User: Fador
 * Date: 4.3.2015
 * Time: 22:06
 */

var util = require('util');

var Chunk = function Chunk() {

  this.X = 0;
  this.Y = 0;

  this.typeData = new Buffer(16*16*16*16*2);
  this.lightData = new Buffer(16*16*16*16 / 2);
  this.skylightData = new Buffer(16*16*16*16 / 2);
  this.biome = new Buffer(16*16);

};


module.exports = Chunk;