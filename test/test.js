'use strict';

var assert = require('assert');
var DBC = require('../dbc');

describe('dbc', function () {
	it('should read the dbc', function (done) {
		var dbc = new DBC('./test/ItemClass.dbc');

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
			assert.equal(csv[2], 'isWeapon')
			assert.equal(csv[3], 'name')

			done()
		}, function (err) {
			console.log(err)
		});
	});
});