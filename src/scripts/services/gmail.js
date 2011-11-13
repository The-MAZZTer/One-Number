function Gmail(id) {
	this.defaultBadgeColor = { r: 255, g: 0, b: 0, a: 255 };
	Service.apply(this, arguments);
	
  this.url = "mail.google.com/";
  this.feedurl = this.url + "mail/feed/atom/";
}

Gmail.inherits(Service);

Gmail.displayname = chrome.i18n.getMessage(Gmail.name.toLowerCase() +
	"_displayname");
Gmail.imagelist = {
	error: "images/browser_action/gmail-err.png",
	loggedout: "images/browser_action/gmail-err.png",
	nounread: "images/browser_action/gmail-err.png",
	normal: "images/browser_action/gmail.png"
};

Gmail.prototype.nsResolver = function (prefix) {
  if (prefix == "atom") {
    return "http://purl.org/atom/ns#";
  } else {
    return null;
  }
}

Gmail.prototype.getUrl = function() {
  var url = updater.getProtocol() + "://" + this.url;
  var x = settings.get(this.uid, "appsDomain");
  if (x != "") {
    url += "a/" + x + "/";
  }
  return url;
}

Gmail.prototype.initSettings = function() {
	this.__proto__.constructor.superClass_.initSettings.call(this);

	settings.addSetting(this.uid, "label", {
		type: Settings.SettingTypes.List,
		defaultValue: "",
		options: {
			"": "options_gmlabel_inbox",
			"important": "options_gmlabel_priorityinbox",
			"unread": "options_gmlabel_all"
		},
		header: "options_gmlabel"
	});
	
	settings.addSetting(this.uid, "showextra", {
		type: Settings.SettingTypes.Boolean,
		defaultValue: true,
		text: "options_gmshowextra"
	});

	settings.addSetting(this.uid, "appsDomain", {
		type: Settings.SettingTypes.Text,
		defaultValue: "",
		text: "options_gmappsdomain"
	});

	settings.addSetting(this.uid, "username", {
		type: Settings.SettingTypes.Text,
		defaultValue: "",
		header: "options_gmaltcredentialshelp",
		text: "options_gmusername"
	});

	settings.addSetting(this.uid, "password", {
		type: Settings.SettingTypes.Password,
		defaultValue: "",
		text: "options_gmpassword"
	});
}

Gmail.prototype.getFeedUrl = function() {
  var x = updater.getProtocol() + "://";

	var username = settings.get(this.uid, "username");
	if (username != "") {
		x += username + ":" + settings.get(this.uid, "password") + "@";
	}
	
  if (settings.get(this.uid, "appsDomain") == "") {
    x += this.feedurl;
  } else {
    x += this.url + "a/" + settings.get(this.uid, "appsDomain") + "/feed/atom/";
  }

	var label = settings.get(this.uid, "label");
	if (label != "") {
    x += label + "/";
  }

  return x;
}

Gmail.prototype.parseXHR = function() {
	if (this.xhr.status === 401) {
		settings.set(this.uid, "loggedin", false);
		this.log("Logged out.");
		return Service.ErrorTypes.ok;
	} else if (this.xhr.status !== 200) {
		this.log("Unexpected XHR status " + this.xhr.status + ".");
		return Service.ErrorTypes.responsenotparsable;
	}

  if (!this.xhr.responseXML) {
    this.log("responseXML not found.");

    return Service.ErrorTypes.responsenotfound;
  }
	
	var nodeIterator = this.xhr.responseXML.evaluate("/atom:feed/atom:fullcount",
    this.xhr.responseXML, this.nsResolver, XPathResult.ANY_TYPE, null);
    
  var node = nodeIterator.iterateNext();
  if (node) {
    settings.set(this.uid, "unread", parseInt(node.textContent));
    settings.set(this.uid, "loggedin", true);
    
    this.log("logged in : " + settings.get(this.uid, "unread") + " unread.");
    
    nodeIterator = this.xhr.responseXML.evaluate(
      "/atom:feed/atom:entry[1]/atom:author/atom:name", this.xhr.responseXML,
      this.nsResolver, XPathResult.ANY_TYPE, null);
    node = nodeIterator.iterateNext();
    var name = "";
    if (node) {
      this.log("Reading name.");
      
      name = node.textContent.htmlspecialchars();
    }
      
    if (name == "") {
      nodeIterator = this.xhr.responseXML.evaluate(
        "/atom:feed/atom:entry[1]/atom:author/atom:email", this.xhr.responseXML,
        this.nsResolver, XPathResult.ANY_TYPE, null);
      node = nodeIterator.iterateNext();
      if (node) {
        this.log("Reading email.");
        
        name = node.textContent.htmlspecialchars();
      }
    }
      
    nodeIterator = this.xhr.responseXML.evaluate(
      "/atom:feed/atom:entry[1]/atom:title", this.xhr.responseXML, this.
      nsResolver, XPathResult.ANY_TYPE, null);
    node = nodeIterator.iterateNext();
    var title = "";
    if (node) {
      this.log("Reading title.");
      
      title = node.textContent.htmlspecialchars();
    }

    nodeIterator = this.xhr.responseXML.evaluate(
      "/atom:feed/atom:entry[1]/atom:summary", this.xhr.responseXML, this.
      nsResolver, XPathResult.ANY_TYPE, null);
    node = nodeIterator.iterateNext();
    var summary = "";
    if (node) {
      this.log("Reading summary.");
      
      summary = node.textContent.htmlspecialchars();
    }
      
    this.preview = "";
    if (title != "" || name != "") {
      this.preview = "<span class=\"title\">";
        
      if (name != ""){
        this.preview += name;
        if (title != "") {
          this.preview += " - ";
        }
      }
      if (title != "") {
        this.preview += title;
      }
      this.preview += "</span>";
    }
    if (summary != "") {
      if (this.preview != "") {
        this.preview += " - ";
      }
      this.preview += summary;
    }
  } else {
    this.log("XML XPath error, checking for logged out state.");
    
    nodeIterator = this.xhr.responseXML.evaluate("//*[@id=\"Passwd\"]",
      this.xhr.responseXML, null, XPathResult.ANY_TYPE, null);
    node = nodeIterator.iterateNext();
    if (node) {
      settings.set(this.uid, "loggedin", false);
      this.log("Logged out.");
    } else {
      this.log("XML XPath error.");
			return Service.ErrorTypes.responsenotparsable;
    }
  }
    
  return Service.ErrorTypes.ok;
}

Gmail.prototype.isURLReusable = function(url) {
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
  return anchor == "" || anchor == "inbox" || anchor == "all" ||
		anchor == "mbox";
}

Gmail.prototype.getLoginUrl = function() {
  return updater.getProtocol() + "://www.google.com/accounts/Login";
}

Gmail.prototype.getExtraUrl = function() {
  var url = updater.getProtocol() + "://" + this.url;
  var x = settings.get(this.uid, "appsDomain");
  if (x != "") {
    url += "a/" + x + "/#compose";
  } else {
    url += "mail/?view=cm&fs=1&tf=1";
  }
  return url;
}
