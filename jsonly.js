

var request = require('request');
var Drill = require('drill');


var Jsonly = function(settings){
	this.cache = {};
	this.api = settings.api;
	this.endpoints = this.build(settings.endpoints);
	this.token = settings.token || false;
	this.timeout = settings.timeout || 10000;
	this.retry = settings.retry || 15000;
	this.refresh(this.endpoints, settings.onComplete);
}


Jsonly.prototype = {

	build: function(endpoints){
		if (typeof endpoints[0] == 'object') return endpoints;
		return endpoints.map(function(endpoint){
			return {
				endpoint: endpoint,
				key: endpoint
			};
		});
	},

	extend: function(instance){
		for (prop in Drill.prototype) {
			if (Drill.prototype.hasOwnProperty(prop)) {
				this[prop] = instance[prop];
			}
		}
	},

	refresh: function(endpoints, next){
		var watching = endpoints.map(function(endpoint){
			if (typeof endpoint == 'object') {
				return new Drill(this.endpoints).findOne(endpoint);
			} else {
				return new Drill(this.endpoints).findOne({endpoint: endpoint});
			}
		}, this).filter(function(endpoint){
			return endpoint;
		});

		this.count = watching.length;
		this.next = next || this.next;
		watching.forEach(this.fetch, this);
	},

	fetch: function(endpoint){
		var url = this.api + endpoint.endpoint;
		var retry = setTimeout(this.fetch.bind(this), this.retry, endpoint);
		console.log('Requested:\t' + url);

		var options = {
			url: url,
			timeout: this.timeout,
			json: true
		};

		if (this.token) {
			options.headers = {
				'Authorization': 'Bearer ' + this.token
			}
		}

		request(options, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log('Cached:\t\t' + url);
				clearTimeout(retry);
				this.cache[endpoint.key] = body;
				this.count -= 1;
				if (!this.count) this.done();
			} else {
				console.log(error);
			}
		}.bind(this));
	},

	done: function(){
		console.log('All requested endpoints are cached');
		var instance = new Drill(this.cache);
		this.extend(instance);
		if (this.next) this.next();
	}

};


module.exports = function(settings){
	return new Jsonly(settings);
}