'use strict';

var Q = require('q');
var fs = require('fs');
var map = require('map-stream');
var path = require('path');
var vinyl = require('vinyl-fs');
var Schema = require(path.join(__dirname, 'schema'));
var Reader = require(path.join(__dirname, 'reader'));

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
	var match = path.match(/([A-z]{0,})(?:.(dbc|db2))$/);
	return match[1] || match[0];
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

DBC.prototype.hasSchema = function () {
	return fs.existsSync(this.schemaPath);
};

DBC.prototype.getSchema = function () {
	var schemaName = this.schemaName;
	var schemaPath = this.schemaPath = path.join(__dirname, 'schemas', schemaName + '.json');
	var schema;

	schema = this.hasSchema() ? require(schemaPath) : [];

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

DBC.prototype.translate = function (buffer) {
	var schema = this.getSchema();
	var reader = new Reader(buffer);
	var columns = this.hasSchema() ? schema.getColumns() : reader.getColumns();
	var dbc = this;
	var rows;

	this.signature = reader.getSignature();
	this.magicNumber = reader.getMagicNumber();

	if(this.signature !== 'WDBC' && this.signature !== 'WDB2') {
		throw new Error('DBC \'' + path + '\' has an invalid signature and is therefore not valid');
	}

	if(this.magicNumber !== 1128416343 && this.magicNumber !== 843203671) {
    throw new Error("File isn't valid DBC (missing magic number)");
	}

	this.columns = reader.getColumnsLength();
	this.records = reader.getRecordsLength();
	this.recordSize = reader.getRecordLength();

	var recordsBlock = reader.getRecordsBlock();
	var stringsBlockStart = reader.getStringsBlockStart();

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

		columns.forEach(function (key, index) {
			var value;
			var type = key.type;
			var rowName = key.name || 'field_' + (index + 1);

			if(type === 'int') {
				value = record.readInt32LE(pointer);
			} else if (type === 'uint') {
				value = record.readUInt32LE(pointer);
			} else if (type === 'byte') {
				value = record.readInt8(pointer);
			} else if (type === 'string') {
				value = reader.getString(record.readInt32LE(pointer));
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