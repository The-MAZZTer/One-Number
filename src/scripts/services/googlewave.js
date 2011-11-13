function GoogleWave(id) {
	this.defaultBadgeColor = { r: 0, g: 0, b: 255, a: 255 };
	Service.apply(this, arguments);
	
  this.url = "wave.google.com/";
  this.feedurl = this.url + "wave/";
	this.loadedEnoughFeed = [/<title>([ -~]+)<\/title>/i,
		/var json = (\{"r":"\^d1".*});/];
}

GoogleWave.inherits(Service);

GoogleWave.displayname = chrome.i18n.getMessage(GoogleWave.name.
	toLowerCase() + "_displayname");
GoogleWave.imagelist = {
	error: "images/browser_action/gwave-err.png",
	loggedout: "images/browser_action/gwave-err.png",
	nounread: "images/browser_action/gwave-err.png",
	normal: "images/browser_action/gwave.png"
};

GoogleWave.prototype.initSettings = function() {
	this.__proto__.constructor.superClass_.initSettings.call(this);

	settings.addSetting(this.uid, "appsDomain", {
		type: Settings.SettingTypes.Text,
		defaultValue: "",
		text: "options_gwappsdomain"
	});
	settings.addSetting(this.uid, "minimizeNav", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: false,
		text: "options_gwminnav"
	});
	settings.addSetting(this.uid, "minimizeContact", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: false,
		text: "options_gwmincontact"
	});
	settings.addSetting(this.uid, "minimizeSearch", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: false,
		text: "options_gwminsearch"
	});
}

GoogleWave.prototype.getUrl = function() {
  var link = updater.getProtocol() + "://" + this.url;
  
  var x = settings.get(this.uid, "appsDomain");
  if (x != "") {
    link += "a/" + x + "/";
  }

  var minimizeNav = settings.get(this.uid, "minimizeNav");
  var minimizeContact = settings.get(this.uid, "minimizeContact");
  var minimizeSearch = settings.get(this.uid, "minimizeSearch");
  
  if (minimizeNav || minimizeContact || minimizeSearch) {
    link += "#";
    
    if (minimizeNav) {
      link += "minimized:nav";
      if (minimizeContact || minimizeSearch) {
        link += ",";
      }
    }
    if (minimizeContact) {
      link += "minimized:contact";
      if (minimizeSearch) {
        link += ",";
      }
    }
    if (minimizeSearch) {
      link += "minimized:search";
    }
  }
  
  return link;
}

GoogleWave.prototype.getFeedUrl = function() {
  var x = settings.get(this.uid, "appsDomain");
  if (x == "") {
    return updater.getProtocol() + "://" + this.feedurl;
  }

  return updater.getProtocol() + "://" + this.url + "a/" + x + "/wave/";
}

GoogleWave.prototype.parseXHR = function() {
  if (!this.xhr.responseText) {
    this.log(": responseText not found.");
    
    return Service.ErrorTypes.responsenotfound;
  }
    
  var titleText = this.xhr.responseText.match(/id="Passwd"/i);
  if (titleText) {
    this.log("Logged out.");
    
    settings.set(this.uid, "loggedin", false);
    return Service.ErrorTypes.ok;
  }
  
  var jsonText = this.xhr.responseText.match(/var json = (\{"r":"\^d1".*});/);
  if (!jsonText) {
    this.log("Can't find JSON.");
  
    return Service.ErrorTypes.responsenotparsable;
  }
  
  var jsonObject = JSON.parse(jsonText[1]);
  if (!jsonObject) {
    this.log("JSON parse error.");
     
    return Service.ErrorTypes.responsenotparsable;
  }
    
  var inboxWaves = jsonObject.p["1"];
  var count = 0;
  var wavelets = 0;
  this.preview = "";
  for (var i in inboxWaves) {
    if (!inboxWaves[i]["9"]) {
      continue;
    }
  
    if (this.preview == "" && inboxWaves[i]["9"]["1"] && inboxWaves[i]["7"] >
      0) {
      
      this.preview = "<span class=\"title\">" + inboxWaves[i]["9"]["1"].
        htmlspecialchars() + "</span> - " + chrome.i18n.
				getMessage("googlewave_unreadblips", inboxWaves[i]["7"]);
    }
    
    if (inboxWaves[i]["7"] > 0) {
      count += 1;
    }
  }
    
  settings.set(this.uid, "loggedin", true);
  settings.set(this.uid, "unread", count);
  
  this.log("logged in : " + settings.get(this.uid, "unread") + " unread.");
  
  return Service.ErrorTypes.ok;
}

GoogleWave.prototype.getLoginUrl = function() {
  return updater.getProtocol() + "://www.google.com/accounts/Login";
}

GoogleWave.prototype.isURLReusable = function(url) {
  if (!url.startsWith(this.url)) {
    return false;
  }
  
	return !url.contains(":wave:") && !url.contains(":search:");
}
