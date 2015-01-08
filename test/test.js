'use strict';

var fs = require('fs');
var assert = require('assert');
var dbcPath = './test/ItemClass.dbc';

var DBC = require('../dbc');
var Reader = require('../reader');

describe('reader', function () {
	var buffer, reader;

	beforeEach(function () {
		buffer = fs.readFileSync(dbcPath);
		reader = new Reader(buffer);
	});

	it('should get columns length', function () {
		assert.equal(reader.getColumnsLength(), buffer.readUInt32LE(Reader.positions.columnsLength));
	});

	it('should get records length', function () {
		assert.equal(reader.getRecordsLength(), buffer.readUInt32LE(Reader.positions.recordsLength));
	});

	it('should get record length', function () {
		assert.equal(reader.getRecordLength(), buffer.readUInt32LE(Reader.positions.recordLength));
	});

	it('should get strings block start', function () {
		assert.equal(reader.getStringsBlockStart(), buffer.length - buffer.readUInt32LE(16));
	});

	it('should get records block', function () {
		assert.equal(reader.getRecordsBlock() instanceof Buffer, true);
	});
});

describe('dbc', function () {
	it('should read the dbc', function (done) {
		var dbc = new DBC(dbcPath);

		dbc.read().then(function (r) {
			assert.equal(typeof r, 'object')
			done()
		}, function (err) {
			console.log(err)
		});
	});

	it('should convert to csv', function (done) {
		var dbc = new DBC('./test/ItemClass.dbc');

		dbc.toCSV().then(function (r) {
			var csv = r.split(',');

			assert.equal(csv[0], 'id')
			assert.equal(csv[1], 'class')
			assert.equal(csv[2], 'field_3')
			assert.equal(csv[3], 'field_4')
			assert.equal(csv[4], 'field_5')

			done()
		}, function (err) {
			console.log(err)
		});
	});
});