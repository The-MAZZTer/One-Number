function Service(id) {
	this.uid = id;
	this.url = null;
	this.feedurl = null;
	
	this.displayname = null;
	this.refreshing = false;
	this.oldunread = 0;
  this.preview = "";
  this.timer = null;
  this.tablist = [];
	this.logintablist = [];
  this.xhr = null;
  this.timeoutTimer = null;
	this.donexhr = false;
	this.timesUpdated = 0;
	if (!this.defaultBadgeColor) {
		this.defaultBadgeColor = { r: 127, g: 127, b: 127, a: 255 };
	}
	this.loadedEnoughFeed = [];
	
  var me = this;
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) { me.
    onTabUpdated(tabId, changeInfo.url); });
  chrome.tabs.onRemoved.addListener(function(tabId) { me.onTabRemoved(tabId); 
    });
		
	this.initSettings();
	
	chrome.windows.getAll({ populate: true }, function(windows) {
		for (var i = 0; i < windows.length; i++) {
			var tabs = windows[i].tabs;
			for (var j = 0; j < tabs.length; j++) {
				me.onTabUpdated(tabs[j].id, tabs[j].url);
			}
		}
	});
}

Service.displayname = "";
Service.imagelist = {
	error: "",
	loggedout: "",
	nounread: "",
	normal: ""
};

Service.ErrorTypes = {
	ok: 0,
	timeout: 1,
	responsenotfound: 2,
	responsenotparsable: 3
};

Service.prototype.doesTabHaveService = function(url) {
  return (url.startsWith("http://" + this.url) || url.startsWith("https://" +
		this.url));
}

Service.prototype.log = function(message) {
	log(this.__proto__.constructor.name + ": " + message);
}

Service.prototype.onTabUpdated = function(tabId, url) {
	if (!url) {
    var me = this;
    chrome.tabs.get(tabId, function(tab) {
      me.onTabUpdated(tabId, tab.url);
    });
    return;
  }
	
  if (this.doesTabHaveService(url)) {
    this.log("browsing  : " + url);
   
    if (!this.tablist.contains(tabId)) {
      this.tablist.push(tabId);
    }
   
    //this.update();
  } else if (this.tablist.contains(tabId)) {
    this.log("browsed away");
  
    this.tablist.remove(tabId);

		this.resetCheckTime();
    this.update();
  }
	
	if (url.toLowerCase().contains(this.getLoginUrl().toLowerCase())) {
    if (!this.logintablist.contains(tabId)) {
      this.logintablist.push(tabId);
    }
	} else if (this.logintablist.contains(tabId)) {
    this.logintablist.remove(tabId);

		this.resetCheckTime();
    this.update();
	}
}

Service.prototype.onTabRemoved = function(tabId) {
  if (this.tablist.contains(tabId)) {
		this.log("closed");
  
		this.tablist.remove(tabId);

		this.resetCheckTime();
		this.update();
  }
	
	if (this.logintablist.contains(tabId)) {
    this.logintablist.remove(tabId);

		this.resetCheckTime();
    this.update();
	}
}

Service.prototype.initSettings = function() {
	settings.addGroup(this.uid, {
		type: Settings.GroupTypes.Service,
		startCollapsed: false
	});
	
	settings.addSetting(this.uid, "service", {
		type: Settings.SettingTypes.Hidden,
		defaultValue: this.__proto__.constructor.name
	});

	settings.addSetting(this.uid, "displayName", {
		type: Settings.SettingTypes.Text,
		defaultValue: this.__proto__.constructor.displayname,
		text: "options_displayname"
	});
	
	settings.addSetting(this.uid, "error", {
		type: Settings.SettingTypes.Hidden,
		defaultValue: Service.ErrorTypes.ok
	});

	settings.addSetting(this.uid, "loggedin", {
		type: Settings.SettingTypes.Hidden,
		defaultValue: true
	});

	settings.addSetting(this.uid, "unread", {
		type: Settings.SettingTypes.Hidden,
		defaultValue: 0
	});

	settings.addSetting(this.uid, "lastCheckTime", {
		type: Settings.SettingTypes.Hidden,
		defaultValue: 0
	});

	settings.addSetting(this.uid, "useRefreshInterval", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: false,
		text: "options_userefreshinterval"
	});
	
	settings.addSetting(this.uid, "refreshInterval", {
		type: Settings.SettingTypes.Numeric,
		defaultValue: 300,
		minValue: 1,
		text: "before_refreshinterval",
		text2: "after_refreshinterval"
	});
	
	settings.addSetting(this.uid, "showOnBadge", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: true,
		text: "options_showonbadge"
	});

	settings.addSetting(this.uid, "badgeColor", {
		type: Settings.SettingTypes.Color,
		defaultValue: this.defaultBadgeColor,
		text: "options_badgecolor"
	});
}

Service.prototype.resetCheckTime = function() {
	settings.set(this.uid, "lastCheckTime", 0);
}

Service.prototype.getShowOnBadge = function() {
	return settings.get(this.uid, "showOnBadge");
}

Service.prototype.getLoggedIn = function() {
	return settings.get(this.uid, "loggedin");
}

Service.prototype.getUnreadCount = function() {
  if (settings.get(this.uid, "loggedin")) {
    return settings.get(this.uid, "unread");
  }
  return 0;
}

Service.prototype.hasNewMessages = function() {
	var unread = settings.get(this.uid, "unread");
	var ret = (unread > this.oldunread);
	this.oldunread = unread;
	return ret;
}

Service.prototype.getError = function() {
	return settings.get(this.uid, "error");
}

Service.prototype.getImageKey = function() {
  if (settings.get(this.uid, "error") != Service.ErrorTypes.ok) {
    return "error";
  }
  if (!settings.get(this.uid, "loggedin")) {
    return "loggedout";
  }
  if (!settings.get(this.uid, "unread")) {
    return "nounread";
  }
  return "normal";
}

Service.prototype.getImage = function() {
	return this.__proto__.constructor.imagelist[this.getImageKey()];
}

Service.prototype.getUrl = function() {
  return updater.getProtocol() + "://" + this.url;
}

Service.prototype.getPreview = function() {
  switch (settings.get(this.uid, "error")) {
    case Service.ErrorTypes.timeout:
      return chrome.i18n.getMessage("preview_timeout");
    case Service.ErrorTypes.responsenotfound:
    case Service.ErrorTypes.responsenotparsable:
      return chrome.i18n.getMessage("preview_response");
		default:
      if (!settings.get(this.uid, "loggedin")) {
        return chrome.i18n.getMessage("preview_login", this.uid + "");
      }
      return this.preview;
   }
}

Service.prototype.getColor = function() {
  return settings.get(this.uid, "badgeColor");
}

Service.prototype.getFeedUrl = function() {
  return updater.getProtocol() + "://" + this.feedurl;
}

Service.prototype.update = function() {      
  if (this.timer != null) {
    this.timer.stop();
    this.timer = null;
  }
	
	var checkTime = settings.get(this.uid, "lastCheckTime") +
		this.getUpdateInterval() * 1000;
	var now = (new Date()).valueOf();
	if (now < checkTime) {
		this.timer = new Timer(this, "update", undefined, checkTime - now);
		this.timer.start();
		return;
	}
  
  this.timeoutTimer = null;
	this.refreshing = true;
	this.oldunread = settings.get(this.uid, "unread");
  updater.update();

	this.donexhr = false;
  this.xhr = new XMLHttpRequest();  
  this.xhr.me = this;
  this.xhr.onreadystatechange = function() { this.me.onXHRReadyStateChange(); }
  this.xhr.open("GET", this.getFeedUrl(), true);
  this.xhr.send();
}

Service.prototype.dispose = function() {
  if (this.timer != null) {
    this.timer.stop();
    this.timer = null;
  }
  if (this.timeoutTimer != null) {
    this.timeoutTimer.stop();
    this.timeoutTimer = null;
  }
	this.donexhr = true;
  this.xhr.abort();
}

Service.prototype.canParseXHR = function() {
	if (!this.loadedEnoughFeed.length || !this.xhr.responseText) {
		return false;
	}

	for (var i = 0; i < this.loadedEnoughFeed.length; i++) {
		if (!this.xhr.responseText.match(this.loadedEnoughFeed[i])) {
			return false;
		}
	}
	
	return true;
}

Service.prototype.parseXHR = function() {}

Service.prototype.onXHRReadyStateChange = function() {
  if (this.timeoutTimer) {
    this.timeoutTimer.stop();
  }
    
	if (this.donexhr) {
		return;
	}

  this.log("readystate: " + this.xhr.readyState);
	try { this.log("status    : " + this.xhr.status); } catch (e) {}

	var parseable = this.canParseXHR();
	
  if (this.xhr.readyState < 4 && !parseable) {
    this.timeoutTimer = new Timer(this, "timeout", undefined, updater.
			getTimeout() * 1000);
    this.timeoutTimer.start();
    
    return;
  }
    
  if (this.xhr.status == 0 && !parseable) {
    settings.set(this.uid, "error", Service.ErrorTypes.responsenotfound);
    this.updateComplete();
    return;
  }
  
	settings.set(this.uid, "error", this.parseXHR());
	this.updateComplete();
}

Service.prototype.timeout = function() {
  this.log("Timeout.");
  
  settings.set(this.uid, "error", Service.ErrorTypes.timeout);
  this.updateComplete();
}

Service.prototype.updateComplete = function() {
	this.log("Update Complete.");
	
  settings.set(this.uid, "lastCheckTime", (new Date()).valueOf());
	this.donexhr = true;
  this.xhr.abort();
  this.xhr = null;
  if (this.timer != null) {
    this.timer.stop();
  }
  this.timer = new Timer(this, "update", undefined, this.
		getUpdateInterval() * 1000);
  this.timer.start();
	this.refreshing = false;
	this.timesUpdated++;
  updater.update();
}

Service.prototype.getUpdateInterval = function() {
	if (settings.get(this.uid, "useRefreshInterval")) {
		return settings.get(this.uid, "refreshInterval");
	} else {
		return updater.getUpdateInterval();
	}
}

Service.prototype.isURLReusable = function(url) {
  return url.startsWith(this.url);
}

Service.prototype.getDisplayName = function() {
	return settings.get(this.uid, "displayName");
}

Service.prototype.getLoginUrl = function() {
  return this.getUrl();
}

Service.prototype.getExtraUrl = function() {
	return null;
}