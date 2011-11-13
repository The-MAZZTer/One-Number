// Misc functions that extend existing JavaScript classes

if (!(function() {}).inherits) {
	Function.prototype.inherits = function(parent) {
		this.superClass_ = parent.prototype;
		
		for (var i in parent.prototype) {
			if(this.prototype[i]) {
				continue;
			}
			this.prototype[i] = parent.prototype[i];
		}
	}
}

Array.prototype.indexOf = function(value) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == value) {
      return i;
    }
  }
  return -1;
}
Array.prototype.contains = function(value) {
  return this.indexOf(value) > -1;
}
Array.prototype.removeAt = function(index) {
  this.splice(index, 1);
}
Array.prototype.remove = function(value) {
  this.removeAt(this.indexOf(value));
}
Array.prototype.swapAt = function(index, index2) {
	if (index == index2) {
		return;
	}

	var temp = this[index2];
	this[index2] = this[index];
	this[index] = temp;
}
Array.prototype.clone = function() {
	return this.slice(0);
}

String.prototype.startsWith = function(text) {
  return this.substr(0, text.length) == text;
}
String.prototype.htmlspecialchars = function() {
  return this.replace("&", "&amp;").replace("<", "&lt;").replace(">",
    "&gt;");
}
String.prototype.htmlstriptags = function() {
  return this.replace(/<.*?>/g, "");
}
String.prototype.contains = function(value) {
  return this.indexOf(value) > -1;
}
String.prototype.endsWith = function(text) {
  return this.substr(0 - text.length, text.length) == text;
}
String.prototype.isNumeric = function() {
  return !isNaN(parseFloat(this)) && isFinite(this);
}

Math.avg = function() {
	var total = 0;
	for (var i = 0; i < arguments.length; i++) {
		total += arguments[i];
	}
	return total / arguments.length;
}