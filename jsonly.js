

var superagent = require('superagent');
var Drill = require('drill');


var Jsonly = function(settings){
    this.cache = settings.data || {};
    this.api = settings.api;
    this.endpoints = this.build(settings.endpoints);
    this.token = settings.token || false;
    this.timeout = settings.timeout || 10000;
    this.retry = settings.retry || 15000;
    this.refresh(this.endpoints, settings.onComplete);
    this.extend(new Drill(this.cache));
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
        var request = superagent.get(url).type('json').timeout(this.timeout);
        if (this.token) request.set('Authorization', 'Bearer ' + this.token);

        request.end(function(err, res){
            if (err) {
                console.log('Jsonly ' + err.status + ':' + url);
                console.log(err);
            } else {
                console.log('Jsonly cached: ' + url);
                clearTimeout(retry);
                this.cache[endpoint.key] = res.body;
                this.count -= 1;
                if (!this.count) this.done();
            }
        }.bind(this));

        console.log('Jsonly requested: ' + url);
    },

    done: function(){
        console.log('Jsonly endpoints are cached.');
        var instance = new Drill(this.cache);
        this.extend(instance);
        if (this.next) this.next();
    }
};


module.exports = function(settings){
    return new Jsonly(settings);
}
