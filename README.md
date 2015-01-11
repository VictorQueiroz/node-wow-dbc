# node-wow-dbc

## Installation (npm)
```
npm install --save node-wow-dbc
```

## Usage
```js
var DBC = require('node-wow-dbc');

var dbc = new DBC('dbc/ItemClass.dbc', 'ItemClass');

dbc.read().then(function (rows) {
	console.log(rows);
}, function (err) {
	console.log(err);
});

dbc.toCSV().then(function (csv) {
	console.log(csv);
});
```

## FAQ
- Can I make it work with TBC, Cataclysm and WotLK?
Yes, you can, the only thing you should change is the Schema of the DBC, if you want strings.

## Usage (Example 2)
```
var DBC = require('node-wow-dbc');

DBC.src(['dbc/**/*.dbc', '../dbc.bak/**/*.dbc'])
	.pipe(DBC.map(function (rows) {
		//
	}));
```