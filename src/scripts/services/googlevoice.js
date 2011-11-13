function GoogleVoice(id) {
	this.defaultBadgeColor = { r: 0, g: 255, b: 0, a: 255 };
	Service.apply(this, arguments);
	
  this.url = "www.google.com/voice/";
  this.feedurl = this.url + "inbox/recent/";
	this.loadedEnoughFeed = [/<title>([ -~]+)<\/title>/i, 
		/<json>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/json>/i];
}

GoogleVoice.inherits(Service);

GoogleVoice.displayname = chrome.i18n.getMessage(GoogleVoice.name.
	toLowerCase() + "_displayname");
GoogleVoice.imagelist = {
	error: "images/browser_action/gvoice-err.png",
	loggedout: "images/browser_action/gvoice-err.png",
	nounread: "images/browser_action/gvoice-err.png",
	normal: "images/browser_action/gvoice.png"
};

GoogleVoice.prototype.getUrl = function() {
  var url = updater.getProtocol() + "://" + this.url;
  if (this.getShowAll()) {
    url += "#history";
  }
  return url;
}

GoogleVoice.prototype.initSettings = function() {
	this.__proto__.constructor.superClass_.initSettings.call(this);

	settings.addSetting(this.uid, "showAll", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: false,
		text: "options_gvshowall"
	});
}

GoogleVoice.prototype.getShowAll = function() {
	return settings.get(this.uid, "showAll");
}

GoogleVoice.prototype.getFeedUrl = function() {
  var x = updater.getProtocol() + "://" + this.feedurl;
  if (this.getShowAll()) {
    x += "all/";
  }
  return x;
}

GoogleVoice.prototype.parseXHR = function() {
  if (!this.xhr.responseText) {
    this.log("responseText not found.");
    
    return Service.ErrorTypes.responsenotfound;
  }
	
  var titleText = this.xhr.responseText.match(/id="Passwd"/i);
  if (titleText) {
    this.log("Logged out.");
    
    settings.set(this.uid, "loggedin", false);
    return Service.ErrorTypes.ok;
  }
  
  var jsonText = this.xhr.responseText.match(
    /<json>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/json>/i);
      
  if (!jsonText) {
    this.log("Can't find JSON.");
    
    return Service.ErrorTypes.responsenotparsable;
  }
  
  var gvoicejson = JSON.parse(jsonText[1]);
  if (!gvoicejson) {
    this.log("JSON parse error.");
    
    return Service.ErrorTypes.responsenotparsable;
  } else {
    if (this.getShowAll()) {
      settings.set(this.uid, "unread", gvoicejson.unreadCounts.all);
    } else {
      settings.set(this.uid, "unread", gvoicejson.unreadCounts.inbox);
    }
    settings.set(this.uid, "loggedin", true);
    
    this.log("logged in : " + settings.get(this.uid, "unread") + " unread.");
      
    this.preview = "";
    if (gvoicejson.messages) {
      for (var i in gvoicejson.messages) {
        if (gvoicejson.messages[i].isRead) {
          continue;
        }
        
        this.preview = "<span class=\"title\">" + gvoicejson.messages[i].
          displayNumber + "</span> - " + gvoicejson.messages[i].
          relativeStartTime;
        break;
      }
    }
  }
	
	return Service.ErrorTypes.ok
}

GoogleVoice.prototype.getLoginUrl = function() {
  return updater.getProtocol() + "://www.google.com/accounts/Login";
}

GoogleVoice.prototype.isURLReusable = function(url) {
  if (!url.startsWith(this.url)) {
    return false;
  }
  
	if (url.contains("?")) {
		return false;
	}
	
  if (!url.contains("#")) {
    return true;
  }
  
  var anchor = url.substr(url.indexOf("#") + 1);
  return anchor == "" || anchor == "inbox";
}
