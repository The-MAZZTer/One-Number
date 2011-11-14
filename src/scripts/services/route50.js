function Route50(id) {
	this.defaultBadgeColor = { r: 255, g: 0, b: 0, a: 255 };
	Service.apply(this, arguments);
	
  this.url = "route50.net/notifications";
  this.feedurl = "route50.net/ajax?_ajax=1";
}

Route50.inherits(Service);

Route50.displayname = "Route 50";
Route50.imagelist = {
	error: "images/browser_action/route50-err.png",
	loggedout: "images/browser_action/route50-err.png",
	nounread: "images/browser_action/route50-err.png",
	normal: "images/browser_action/route50.png"
};

Route50.prototype.initSettings = function() {
	this.__proto__.constructor.superClass_.initSettings.call(this);
}

Route50.prototype.getFeedUrl = function() {
  return "http://" + this.feedurl;
}

Route50.prototype.getUrl = function() {
  return "http://" + this.url;
}

Route50.prototype.parseXHR = function() {
  if (!this.xhr.responseText) {
    this.log("responseText not found.");
    
    return Service.ErrorTypes.responsenotfound;
  }
    
  var data = JSON.parse(this.xhr.responseText);

  settings.set(this.uid, "loggedin", data.loggedin);
  settings.set(this.uid, "unread", data.notifications + data.mail + data.bugs);
  
  this.preview = "";
  if(data.mail > 0) this.preview += "<strong>Mail</strong> - " + data.mail;
  if(data.notifications > 0)
  {
    if (this.mail > 0) this.preview += ", ";
	this.preview += "<strong>Notifications</strong> - " + data.notifications;
  }
  if(data.bugs > 0)
  {
    if (this.mail > 0 || this.notifications > 0) this.preview += ", ";
    this.preview += "<strong>Bugs</strong> - " + data.bugs;
  }
  this.log("logged in : " + settings.get(this.uid, "unread") + " unread.");
    
  return Service.ErrorTypes.ok;
}

Route50.prototype.isURLReusable = function(url) {
  return url.startsWith(this.url);
}

Route50.prototype.getLoginUrl = function() {
  return "http://route50.net/login";
}