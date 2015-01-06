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
	console.log(rows)
}, function (err) {
	console.log(err);
});
```
