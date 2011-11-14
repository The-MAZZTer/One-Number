function Facebook(id) {
	this.defaultBadgeColor = { r: 59, g: 89, b: 152, a: 255 };
	Service.apply(this, arguments);
	
  this.url = "www.facebook.com/notifications";
  this.feedurl = "www.facebook.com/desktop_notifications/counts.php";
}

Facebook.inherits(Service);

Facebook.displayname = "Facebook";
Facebook.imagelist = {
	error: "images/browser_action/Facebook-err.png",
	loggedout: "images/browser_action/Facebook-err.png",
	nounread: "images/browser_action/Facebook-err.png",
	normal: "images/browser_action/Facebook.png"
};

Facebook.prototype.initSettings = function() {
	this.__proto__.constructor.superClass_.initSettings.call(this);
}

Facebook.prototype.parseXHR = function() {
  if (!this.xhr.responseText) {
    this.log("responseText not found.");
    
    return Service.ErrorTypes.responsenotfound;
  }
    
  var data = JSON.parse(this.xhr.responseText);

  if(this.xhr.status == 302) settings.set(this.uid, "loggedin", false);
  else
  {
  
	settings.set(this.uid, "loggedin", true);
	settings.set(this.uid, "unread", data.inbox.unread + data.notifications.num_unread);
  
	this.preview = "";
	if(data.inbox.unread > 0) this.preview += "<strong>Mail</strong> - " + data.inbox.unread;
	if(data.notifications.num_unread > 0)
	{
		if (this.mail > 0) this.preview += ", ";
		this.preview += "<strong>Notifications</strong> - " + data.notifications.num_unread;
	}
	this.log("logged in : " + settings.get(this.uid, "unread") + " unread.");
  }
  return Service.ErrorTypes.ok;
}

Facebook.prototype.isURLReusable = function(url) {
  return url.startsWith(this.url);
}

Facebook.prototype.getLoginUrl = function() {
  return "http://facebook.com/login";
}