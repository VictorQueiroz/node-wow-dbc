'use strict';

var Q = require('q');
var fs = require('fs');
var map = require('map-stream');
var path = require('path');
var vinyl = require('vinyl-fs');
var Schema = require(path.join(__dirname, 'schema'));
var MAGIC_NUMBER = 1128416343;

function readFile (filename, options) {
	var deferred = Q.defer();

	fs.readFile(filename, options, function (err, data) {
		if(err) {
			return deferred.reject(err);
		}

		deferred.resolve(data);
	});

	return deferred.promise;
}

function getSchemaName (path) {
	return path.match(/([A-z]{0,})(?:.dbc)$/)[1];
}

function toCSV (array) {
	var csv = '';
	var rows;
	var header = '';
	var lineBreak = "\n";
	var delimiter = ",";

	header = Object.keys(array[0]);

	array.unshift(header);

	csv = array.map(function (obj) {
	  return Object.keys(obj).map(function (key) {
	    return obj[key];
	  }).join(delimiter);
	}).join(lineBreak)

	return csv;
}

function DBC (path, schemaName) {
	this.path = path;

	if(!schemaName) {
		schemaName = this.getSchemaName(path);
	}

	this.schemaName = schemaName;
}

DBC.prototype.getSchemaName = function () {
	return getSchemaName(this.path);
};

exports.src = vinyl.src;

exports.map = function () {
	return map(function (file, cb) {
		var dbc = new DBC(file.path);

		cb(null, file);
	});
};

DBC.prototype.getSchema = function () {
	var schemaName = this.schemaName;
	var schema = require(path.join(__dirname, 'schemas', schemaName + '.json'));

	return new Schema(schema);
};

DBC.prototype.toJSON = function () {
	return this.read();
};

DBC.prototype.toCSV = function () {
	return this.read().then(function (rows) {
		return toCSV(rows);
	});
};

// Put all the buffer strings in an array.
DBC.prototype.parseStringBlock = function (buffer) {
	var pointer = 0;
	var currentString = '';
	var strings = [];

	for(var i=0; i<buffer.length; i++) {
		var byte = buffer[i];

		if(byte === 0) {
			strings[pointer - currentString.length] = currentString;
			currentString = '';
		} else {
			currentString += String.fromCharCode(byte);
		}

		pointer++;
	}

	return strings;
};

DBC.prototype.translate = function (buffer) {
	var schema = this.getSchema();
	var dbc = this;
	var rows;

	this.signature = buffer.toString('utf8', 0, 4);

	if(this.signature !== 'WDBC') {
		throw new Error('DBC \'' + path + '\' has an invalid signature and is therefore not valid');
	}

	if(buffer.readUInt32LE(0) !== MAGIC_NUMBER) {
    throw new Error("File isn't valid DBC (missing magic number: " + MAGIC_NUMBER + ")");
	}

	this.columns = buffer.readUInt32LE(8);
	this.records = buffer.readUInt32LE(4);
	this.recordSize = buffer.readUInt32LE(12);

	var recordsBlock;
	var stringsBlockPosition = buffer.length - buffer.readUInt32LE(16);
	var strings = this.parseStringBlock(buffer.slice(stringsBlockPosition));

	// Define the recordsBlock, which start at 20 and ends up at stringsBlock.
	recordsBlock = buffer.slice(20, stringsBlockPosition);

	this.rows = rows = [];

	for(var i=0; i<this.records; i++) {
		var row = {};

		// Break searching for the actual record
		// through the recordsBlock which contains
		// only the records and nothing more
		var from = i * this.recordSize;
		var to = (i + 1) * this.recordSize;
		var record = recordsBlock.slice(from, to);
		var pointer = 0;

		schema.getFields().forEach(function (key, index) {
			var value;
			var type = key.type;
			var rowName = key.name || 'field_' + (index + 1);

			if(type === 'int') {
				value = record.readInt32LE(pointer)
			} else if (type === 'uint') {
				value = record.readUInt32LE(pointer);
			} else if (type === 'byte') {
				value = record.readInt8(pointer);
			} else if (type === 'string') {
				value = strings[record.readInt32LE(pointer)];
			}

			row[rowName] = value;

			if(type === 'byte') {
				pointer += 1;
			} else if (type !== 'null' && type !== 'byte' && type !== 'localization') {
				pointer += 4;
			}
		});

		rows.push(row);
	}

	return rows;
};

DBC.prototype.read = function () {
	var dbc = this;

	return readFile(this.path).then(function () {
		return dbc.translate.apply(dbc, arguments);
	});
};

module.exports = DBC;