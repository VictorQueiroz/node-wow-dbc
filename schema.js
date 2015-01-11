'use strict';

function Schema (schema) {
	var self = this;

	if(schema && typeof schema === 'object') {
		Object.keys(schema).forEach(function (key) {
			self[key] = schema[key];
		});
	}

	return this;
}

Schema.prototype.getColumns = function () {
	var self = this;
	var fields = [];

	Object.keys(this).forEach(function (key) {
		var field = self[key];

		fields.push(field);
	});

	return fields;
};

module.exports = Schema;