

var fs = require('fs');
var open = require('open-uri');
var Hitch = require('hitch');
require('./inflector');
var walk = require('./find');
var load = new Hitch();



var JSONLY = new Class({

	Implements: Options,

	options: {
		uri: false,
		path: false,
		endpoints: []
	},

	cache: {},
	query: {},

	initialize: function(options, next){
		this.setOptions(options);
		this.endpoint = (this.options.path === false) ? this.options.uri : this.options.path;
		this.refresh(this.options.endpoints, next);
	},

	refresh: function(endpoints, next){
		var watching = endpoints.filter(function(endpoint){
			return this.options.endpoints.contains(endpoint);
		}.bind(this));
		
		watching.forEach(function(endpoint, index){
			load.chain(this.store.bind(this, endpoint));
		}.bind(this));

		load.chain(this.done.pass(next, this));
		load.next();
	},

	store: function(endpoint){
		console.log('Caching "' + endpoint + '" endpoint');

		var uri = this.endpoint + endpoint + '.json';

		if (this.options.uri) {
			open(uri, function(err, json){
				if (err) throw err;
				this.cache[endpoint] = json;
				load.next();
			}.bind(this));

		} else {
			var file = this.options.path + endpoint + '.json';
			
			console.log('file path ' + file);

			fs.readFile(file, 'utf8', function(err, json){
				if (err) throw err;
				this.cache[endpoint] = JSON.decode(json);
				load.next();
			}.bind(this));

			fs.unwatchFile(file);

			fs.watchFile(file, function(curr, prev){
				if (curr.mtime.getTime() - prev.mtime.getTime()) {
					this.store(file, endpoint);
				}
			}.bind(this));
		}
	},

	done: function(next){
		console.log('All endpoints are loaded and cached');
		console.log('Adding arrays on index types');

		this.options.endpoints.forEach(function(endpoint, e){
//			var endpoint = this.cache[endpoint].meta.type;
//			var type = endpoint.meta.type;
//			var data = endpoint[type];
			if (this.cache[endpoint].meta.type == 'index') {
				console.log('"' + endpoint + '" needs a collection property');
				this.cache[endpoint].collection = [];

				for (var id in this.cache[endpoint].index) {
					var obj = this.cache[endpoint].index[id];
					this.cache[endpoint].collection.push(obj);
				}
			}
		}, this);

		if (next) next();
	},

	get: function(endpoint){
		if (endpoint.split('.').length > 1) {
			var keys = endpoint.split('.');
//			var obj = this.cache[key[0]];
			return this.getProperty(this.cache, keys);
		}
		var type = this.cache[endpoint].meta.type;
		return this.cache[endpoint][type];
	},

	in: function(endpoint){
		this.query = {};
		this.query.endpoint = endpoint;
		return this;
	},

	where: function(match){
		this.query.where = match;
//		if (typeof match == 'string') this.query.key = match;
		return this;
	},

	like: function(key, value){
		var match = {};
		match[key] = '$like('+ value +')';
		this.query.where = match;
		return this;
	},

	order: function(key, direction){
		this.query.order = { key: key, direction: direction || 'asc' };
		return this;
	},

	limit: function(arr, count){
		return arr.slice(0, count.toInt());
	},

	getProperty: function(obj, keys){
	    var prop = obj;
	    for (var i = 0; i < keys.length; i++) prop = prop[keys[i]];
	    return prop;
	},

	orderBy: function(arr, key, way){
		var keys = key.split('.');
		
		arr.sort(function compare(a, b){
			var a_prop = this.getProperty(a, keys);
			var b_prop = this.getProperty(b, keys);
		
			switch (way) {
				case 'dec':
					if (a_prop > b_prop) return -1;
					if (a_prop < b_prop) return 1;
					return 0;
				case 'asc':
				default:
					if (a_prop < b_prop) return -1;
					if (a_prop > b_prop) return 1;
					return 0;
			}
		}.bind(this));

		return arr;
	},

	match: function(obj, matcher){
		for (var prop in obj) {
			var value = obj[prop];
			if (walk(matcher, value)) return value;
		}
		return false;
	},

	matchAll: function(obj, matcher){
		var arr = [];

		for (var prop in obj) {
			var value = obj[prop];
			if (walk(matcher, value)) arr.push(value);
		}

		return arr;
	},

	getMatches: function(limit){
		var terms = this.query.where || false;
		var endpoint = this.cache[this.query.endpoint];
		var type = endpoint.meta.type;
		var data = endpoint[type];

		if (!terms) 						return data
		else if (typeof limit == 'string')	return data[terms]
//		else if (limit === 1) 				return collection.match(terms)
//		else 								return collection.matchAll(terms);
		else if (limit === 1) 				return this.match(data, terms)
		else 								return this.matchAll(data, terms);
		return false;
	},

	findById: function(id){
		var endpoint = this.cache[this.query.endpoint];
		var type = endpoint.meta.type;
		var item = type === 'collection' ? endpoint[type].match({id: id}) : endpoint[type][id];
//		var item = this.getMatches(id);
		return Object.clone(item);
//		return this.populate(item);
//		return this.populate(item);
	},

	findOne: function(id){
		var item = this.getMatches(1);
		return Object.clone(item);
//		return this.populate(item);
	},

	findMany: function(limit){
		var endpoint = this.cache[this.query.endpoint];
		var type = endpoint.meta.type;
		var items = endpoint[type];
		var is_array = Array.isArray(items);
		return is_array ? Array.clone(items) : Object.clone(items);
//		return this.populateAll(items);
//		return Object.clone(items);
	},

	find: function(limit){
		var matches = this.getMatches(limit);
		var is_array = Array.isArray(matches);

		if (this.query.populate) {
			// loop through and create a new array from index thats loaded
			matches = is_array ? this.populateAll(matches) : this.populate(matches);
		}

		if (this.query.order) {
			matches = this.orderBy(matches, this.query.order.key, this.query.order.direction);
		}
		if (is_array && limit) matches = this.limit(matches, limit);
		
		return matches;
	},

	populate: function(item){
		if (!item) return false;
	
		var obj = Object.clone(item);

		Object.each(obj, function(value, key){
			if (key.test(/_id/g)) {
				var new_key = key.replace('_id', '');
				var collection = new_key.pluralize();
				if (this.cache[collection] == undefined) return;
				var nested_obj = this.in(collection).findById(value);
				obj[new_key] = this.populate(nested_obj);
			}
		}.bind(this));

		return obj;
	},

	populateAll: function(data){
		if (Array.isArray(data)) {
			return data.map(function(item){
				return this.populate(item);
			}.bind(this));
		} else {
			var doc = Object.clone(data);

			for (var prop in doc) {
				doc[prop] = this.populate(doc[prop]);
//					if (doc.hasOwnProperty(prop)) doc[prop] = this.populate(doc[prop]);
			}

			return doc;
		}
		

//			return arr.map(function(obj){
//				return this.populate(obj);
//			}.bind(this));
	}

});


module.exports = JSONLY;