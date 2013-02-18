
require('./inflector');


var query = function(match, value) {
	var matches = match.match(/\$(.+?)\((.+?)\)/);

	if (matches) {
		matches.shift();
		var fn = matches[0];
		var val = matches[1];

		switch(fn) {
			case 'contains':
				if (!value.contains(val)) return false;
			case 'like':
				if (!value.test(new RegExp(val, 'i'))) return false;
			default:
//				return false;
		}
	}

	return true;
};


var walk = function(matcher, obj) {

	for (var key in matcher) {
		if (!matcher.hasOwnProperty(key)) continue;

		var match = matcher[key];
		var value = obj[key];
		var type = typeOf(match);

		switch (type) {
			case 'object':
				if (!walk(match, value)) return false;

			case 'array':
				var len = match.length;
				while (len--) {
					if (!walk(match[len], value[len])) return false;
				}
				break;

			default:
				if (match.charAt(0) == '$' && value !== undefined) {
//				if (match.charAt(0) == '$' && typeof value == 'object' && value !== undefined) {
					console.log('CHECK IT FOR QUERY');
					if (!query(match, value)) return false;
				} else if (match !== value) {
					return false;
				}
		}
	}
	return true;
};


/*

var query = {};

query.or = function(){
var args = Array.prototype.slice.call(arguments),
len = args.length;
return function(value){
for (var i = 0; i < len; i++){
  var fn = args[i];
  if (typeof fn != 'function') continue;
  if (fn(value)) return true;
}
return false;
};
};

query.and = function(){
var args = Array.prototype.slice.call(arguments),
len = args.length;
return function(value){
for (var i = 0; i < len; i++){
  var fn = args[i];
  if (typeof fn != 'function') continue;
  if (!fn(value)) return false;
}
return true;
};
};

query.equals = function(expected){
return function(value){
return value == expected;
};
};

*/


module.exports = walk;