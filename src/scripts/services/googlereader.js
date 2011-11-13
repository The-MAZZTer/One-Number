function GoogleReader(id) {
	this.defaultBadgeColor = { r: 255, g: 127, b: 0, a: 255 };
	Service.apply(this, arguments);
	
  this.url = "www.google.com/reader/view/#stream";
  this.feedurl = "www.google.com/reader/api/0/unread-count?output=json&" + 
    "client=OneNumber";
  this.subscriptionsurl =
		"www.google.com/reader/api/0/subscription/list?output=json&" +
		"client=OneNumber";
}

GoogleReader.inherits(Service);

GoogleReader.displayname = chrome.i18n.getMessage(GoogleReader.name.
	toLowerCase() + "_displayname");
GoogleReader.imagelist = {
	error: "images/browser_action/greader-err.png",
	loggedout: "images/browser_action/greader-err.png",
	nounread: "images/browser_action/greader-err.png",
	normal: "images/browser_action/greader.png"
};

GoogleReader.prototype.initSettings = function() {
	this.__proto__.constructor.superClass_.initSettings.call(this);

	settings.addSetting(this.uid, "feeds", {
		type: Settings.SettingTypes.GReaderFeeds,
		defaultValue: [],
		header: "options_grfeedlist"
	});
}

GoogleReader.prototype.parseXHR = function() {
  if (!this.xhr.responseText) {
    this.log("responseText not found.");
    
    return Service.ErrorTypes.responsenotfound;
  }
	
  var titleText = this.xhr.responseText.
		match(/<title>[ -~]*401[ -~]*<\/title>/i);
  if (titleText) {
    this.log("Logged out.");
    settings.set(this.uid, "loggedin", false);
    return Service.ErrorTypes.ok;
  }
    
  var greaderjson = JSON.parse(this.xhr.responseText);
  if (!greaderjson) {
    this.log("JSON parse error.");
    return Service.ErrorTypes.responsenotparsable;
  }
    
  var count = 0;
  this.preview = "";
  var max = 0;
	
	var feeds = settings.get(this.uid, "feeds");
    
  for (var i in greaderjson.unreadcounts) {
    var feed = greaderjson.unreadcounts[i];
    if (!feed.id) {
      continue;
    }
      
    var rlabel = /^user\/[0-9]+\/label\/([ -~]+)$/.exec(feed.id);
    var rfeed = /^feed\/([ -~]+)$/.exec(feed.id);
      
    if (!(feeds.length) &&
			/^user\/[0-9]+\/state\/com\.google\/reading-list$/.test(feed.id)) {
			
      count = feed.count;
    } else if (rlabel != null) {
      if ((!(feeds.length) || feeds.contains(feed.id)) && feed.count > max) {
        this.preview = "<span class=\"title\">" + rlabel[1] + "</span> - " +
          feed.count + " ";
        max = feed.count;
      }
			if (feeds.contains(feed.id)) {
				count += feed.count;
			}
    } else if (rfeed != null) {
      if ((!(feeds.length) || feeds.contains(feed.id)) && feed.count > max) {
        this.preview = "<span class=\"title\">" + rfeed[1] + "</span> - " +
          feed.count + " ";
        max = feed.count;
      }
			if (feeds.contains(feed.id)) {
				count += feed.count;
			}
    }
    
		if (feeds.length == 1) {
			this.preview = "";
		}
  }
    
  settings.set(this.uid, "loggedin", true);
  settings.set(this.uid, "unread", count);
  
  this.log("logged in : " + settings.get(this.uid, "unread") + " unread.");
    
  return Service.ErrorTypes.ok;
}

GoogleReader.prototype.isURLReusable = function(url) {
  return url.startsWith(this.url) &&
		url.endsWith("%2fstate%2fcom.google%2freading-list");
}

GoogleReader.prototype.getLoginUrl = function() {
  return updater.getProtocol() + "://www.google.com/accounts/Login";
}

GoogleReader.prototype.getFeedsLabels = function(callback) {
  var xhr = new XMLHttpRequest();  
  xhr.onreadystatechange = function() {
		if (this.timer) {
			this.timer.stop();
			this.timer = null;
		}
	
		if (this.readyState < 4) {
			this.timer = new Timer(this, "ontimeout", undefined, updater.
				getTimeout() * 1000);
			this.timer.start();
			
			return;
		}
		
		if (this.status == 0 || !this.responseText) {
			callback(Service.ErrorTypes.responsenotfound);
			return;
		}
		
		var json = JSON.parse(this.responseText);
		if (!json) {
			callback(Service.ErrorTypes.responsenotparsable);
			return;
		}
		
		var ret = {
			labels: {},
			feeds: {}
		};
		for (var i = 0; i < json.subscriptions.length; i++) {
			var id = json.subscriptions[i].id;
			ret.feeds[id] = {
				title: json.subscriptions[i].title,
				labels: {}
			};
			
			for (var j = 0; j < json.subscriptions[i].categories.length; j++) {
				var lid = json.subscriptions[i].categories[j].id;
				if (!(lid in ret.labels)) {
					ret.labels[lid] = {
						title: json.subscriptions[i].categories[j].label,
						feeds: {}
					};
				}
				ret.feeds[id].labels[lid] = ret.labels[lid];
				ret.labels[lid].feeds[id] = ret.feeds[id];
			}
		}
		callback(Service.ErrorTypes.ok, ret);
	};
	xhr.ontimeout = function() {
		callback(Service.ErrorTypes.timeout);
	};
  xhr.open("GET", updater.getProtocol() + "://" + this.subscriptionsurl, true);
  xhr.send();	
}