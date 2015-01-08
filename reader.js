'use strict';

var positions = {
	columnsLength: 8,
	recordsLength: 4,
	recordLength: 12,
	recordsBlockStart: 20,
	magicNumber: 0
};

function Reader (buffer) {
	if(!(buffer instanceof Buffer)) {
		throw new Error('\'buffer\' must be an instance of Buffer');
	}

	this.buffer = buffer;
	this.strings = this.getStrings();
}

Reader.positions = positions;

Reader.prototype.getColumns = function () {
	var columnsLength = this.getColumnsLength();
	var fields = [];

	for(var i=0; i<columnsLength; i++) {
		var field = {
			type: 'uint'
		};

		fields.push(field);
	}

	return fields;
};

Reader.prototype.getString = function (pointer) {
	return this.strings[pointer];
};

Reader.prototype.getStrings = function () {
	var buffer = this.getStringsBlock();
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

Reader.prototype.getSignature = function () {
	return this.buffer.toString('utf8', 0, 4)
};

Reader.prototype.getMagicNumber = function () {
	return this.buffer.readUInt32LE(positions.magicNumber);
};

Reader.prototype.getColumnsLength = function () {
	return this.buffer.readUInt32LE(positions.columnsLength);
};

Reader.prototype.getRecordsLength = function () {
	return this.buffer.readUInt32LE(positions.recordsLength);
};

// Get the size of each record.
Reader.prototype.getRecordLength = function () {
	return this.buffer.readUInt32LE(positions.recordLength);
};

// Get the position of where the block
// which contains only strings starts.
Reader.prototype.getStringsBlockStart = function () {
	return this.buffer.length - this.buffer.readUInt32LE(16);
};

Reader.prototype.getRecordsBlockStart = function () {
	return positions.recordsBlockStart;
};

	// Define the recordsBlock, which start at 20 and ends up at stringsBlock.
Reader.prototype.getRecordsBlock = function () {
	var stringsBlockStart = this.getStringsBlockStart();
	var recordsBlock = this.buffer.slice(this.getRecordsBlockStart(), stringsBlockStart);

	return recordsBlock;
};

Reader.prototype.getStringsBlock = function () {
	var stringsBlockStart = this.getStringsBlockStart();

	return this.buffer.slice(stringsBlockStart);
};

module.exports = Reader;