var fs = require('fs');
var open = require('open-uri');
var Hitch = require('hitch');
var JSONLY = require('./jsonly');
var load = new Hitch();


var CRUD = new Class({

	Implements: Options,

	Extends: JSONLY,

	options: {
//		uri: false,
//		path: false,
//		endpoints: []
	},

	initialize: function(options, next){
		this.setOptions(options);
	},

	batch: function(collection) {
		var arr = this[collection].array;
		arr.each(function(item, index) {
			if (item.hasOwnProperty('category')) {
//				item.category_id = item.category;
				delete item.category;
			}

			if (item.hasOwnProperty('sub_id') && item.sub_id == 'delete') {
//				"sub":"delete"
//				if (item.sub !== 'delete') item.sub_id = item.sub;
				delete item.sub_id;
			}

			if (item.hasOwnProperty('brand')) {
//				item.brand_id = item.brand;
				delete item.brand;
			}
		});

		this.save(collection, console.log('done with batch'));
	},

	uuid: function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	},

	create: function(obj, next) {
		var collection = this.query.collection;
		if (!obj.hasOwnProperty('id')) obj['id'] = this.uuid();

		for (var key in obj) {
			if (obj[key] == undefined) delete obj[key];
		}

		this[collection].array.unshift(obj);
		console.log('\nCreating --> ' + obj);
		if (next) this.save(collection, next);
		return obj;
	},

	update: function(id, obj, next) {
		var collection = this.query.collection;
		var position = this[collection].sort[id];
		var item = this[collection].array[position];

		for (var key in obj) {
			if (obj[key] == undefined) delete item[key]
			else item[key] = obj[key];
		}

		this[collection].array[position] = item;
		console.log('\nUpdating --> ' + item);
		this.save(collection, next);
	},

	destroy: function(id, next) {
		var collection = this.query.collection;
		var position = this[collection].sort[id];
		this[collection].array.splice(position, 1);
		console.log('Destroying --> ' + id);
		this.save(collection, next);
	},

	save: function(collection, next) {
		var content = {};
		content[collection] = this[collection].array;
		fs.writeFileSync(this[collection].file, JSON.encode(content), 'utf8');
		this.index(collection, true);
		if (next) next();
	}

});


module.exports = CRUD;