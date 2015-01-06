'use strict';

var Q = require('q');
var fs = require('fs');
var path = require('path');
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

function DBC (path, schemaName) {
	if(!schemaName) {
		throw new Error('You must define a schemaName before continue.');
	}

	this.path = path;
	this.schemaName = schemaName;
}

DBC.prototype.getSchema = function () {
	var schemaName = this.schemaName;
	var schema = require(path.join(__dirname, 'schemas', schemaName + '.json'));

	return new Schema(schema);
};

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

DBC.prototype.read = function () {
	var dbc = this;
	var schema = this.getSchema();

	this.signature = '';
	this.records = 0;
	this.fields = 0;
	this.recordSize = 0;

	return readFile(this.path).then(function (buffer) {
		dbc.signature = buffer.toString('utf8', 0, 4);

		if(dbc.signature !== 'WDBC') {
			throw new Error('DBC \'' + path + '\' has an invalid signature and is therefore not valid');
		}

		if(buffer.readUInt32LE(0) !== MAGIC_NUMBER) {
      throw new Error("File isn't valid DBC (missing magic number: " + MAGIC_NUMBER + ")");
		}

		dbc.fields = buffer.readUInt32LE(8);
		dbc.records = buffer.readUInt32LE(4);
		dbc.recordSize = buffer.readUInt32LE(12);

		var recordBlock;
		var recordData;
		var stringBlockPosition = buffer.length - buffer.readUInt32LE(16);
		var strings = dbc.parseStringBlock(buffer.slice(stringBlockPosition));

		recordBlock = buffer.slice(20, stringBlockPosition);

		var rows;

		dbc.rows = rows = [];

		for(var i=0; i<dbc.records; i++) {
			var row = {};
			recordData = recordBlock.slice(i * dbc.recordSize, (i + 1) * dbc.recordSize);
			var pointer = 0;

			schema.getFields().forEach(function (key, index) {
				var value;
				var type = key.type;
				var rowName = key.name || 'field_' + (index + 1);

				if(type === 'int') {
					value = recordData.readInt32LE(pointer)
				} else if (type === 'uint') {
					value = recordData.readUInt32LE(pointer);
				} else if (type === 'byte') {
					value = recordData.readInt8(pointer);
				} else if (type === 'string') {
					value = strings[recordData.readInt32LE(pointer)];
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

		return dbc.rows;
	});
};

module.exports = DBC;