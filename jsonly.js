

var request = require('superagent');
var Drill = require('drill');


var Jsonly = function(settings){
	this.cache = {};
	this.api = settings.api;
	this.endpoints = settings.endpoints;
	this.timeout = settings.timeout || 10000;
	this.retry = settings.retry || 15000;
	this.refresh(this.endpoints, settings.onComplete);
}


Jsonly.prototype = {

	extend: function(instance){
		for (prop in Drill.prototype) {
			if (Drill.prototype.hasOwnProperty(prop)) {
				this[prop] = instance[prop];
			}
		}
	},

	refresh: function(endpoints, next){
		var watching = endpoints.filter(function(endpoint, i){
			if (typeof endpoint == 'object') {
				if (new Drill(this.endpoints).findOne(endpoint)) return true;
				return false;
			} else {
				return this.endpoints.indexOf(endpoint) != -1;
			}
		}, this);

		this.count = watching.length;
		this.next = next || this.next;
		watching.forEach(this.fetch, this);
	},

	fetch: function(endpoint){
		var route = typeof endpoint == 'object' ? endpoint.endpoint : endpoint;
		var key = typeof endpoint == 'object' ? endpoint.key : endpoint;

		var url = this.api + route;
		var retry = setTimeout(this.fetch.bind(this), this.retry, endpoint);
		console.log('Requested:\t' + url);

		request.get(url).timeout(this.timeout)
			.on('error', function(error){
				console.log(error.timeout ? 'Timeout:\t' + url : error.message);
			})
			.end(function(response){
				console.log('Cached:\t\t' + url);
				clearTimeout(retry);
				this.cache[key] = response.body;
				this.count -= 1;
				if (!this.count) this.done();
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