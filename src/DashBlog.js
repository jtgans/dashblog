/*
  Copyright (C) 2005 June R. Tate <june@theonelab.com>
  
  This file is a part of DashBlog.

  DashBlog is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published
  by the Free Software Foundation; either version 2 of the License,
  or (at your option) any later version. 
  
  DashBlog is distributed in the hope that it will be useful, but
  WITHOUT ANY WARRANTY; without even the immplied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
  General Public License for more details. 
  
  You should have received a copy of the GNU General Public License
  along with DashBlog; if not, write to the Free Software Foundation,
  Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA 
*/

var _version     = "v0.13b";
var _inMozilla   = (typeof netscape != "undefined")      ? true : false;
var _inDashboard = (typeof window.widget != "undefined") ? true : false;

/***************************************************************************/
/** API_Blogger1 Object                                                   **/
/***************************************************************************/

function API_Blogger() {
}

API_Blogger.prototype = {
    errorstr:     "Success.",
    errorOcurred: false,
    request:      false,
    blogs:        new Array(),
    form:          [ { type: "text", label: "Title", id: "title" },
                     { type: "body" } ],

    getForm: function(url, username, password, blogid) {
        var form = new Array();

        form.push({ type: "text", label: "Title", id: "title" });
        form.push({ type: "body" });

        return form;
    },
    
    lookupBlogs: function(url, username, password) {
        var response;

        // Clean up the XMLHttpRequest object
        this.request = new XMLHttpRequest();
        if (_inMozilla) netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
        
        this.request.open("POST", url, false);
        this.request.setRequestHeader("Content-Type", "text/xml");
        this.request.send('<?xml version="1.0"?>'+"\n\n"+
                          "<methodCall>\n"+
                          "  <methodName>blogger.getUsersBlogs</methodName>\n"+
                          "  <params>\n"+
                          "    <param><value><string>C6CE3FFB3174106584CBB250C0B0519BF4E294</string></value></param>\n"+
                          "    <param><value><string>"+ username +"</string></value></param>\n"+
                          "    <param><value><string>"+ password +"</string></value></param>\n"+
                          "  </params>\n"+
                          "</methodCall>\n");
        
        if (this.request.readyState == 4) {
            if (this.request.status == 404) {
                this.errorstr = "404 Not Found when trying to access "+ url;
                this.errorOcurred = true;
            } else if (this.request.status == 200) {
                response = this.request.responseXML;

                if (response) {
                    if (response.getElementsByTagName("methodResponse").length) {
                        if (response.getElementsByTagName("fault").length > 0) {
                            var utils = new Utils();
                            
                            this.errorstr = url +" generated a fault. Response payload was:<pre>"+ utils.htmlEntities(this.request.responseText) +"</pre>";
                            this.errorOcurred = true;
                        } else {
                            if (this.parseBlogList(response)) {
                                this.errorstr = "Success.";
                                this.errorOcurred = false;
                            } else {
                                this.errorstr = "No result was returned.";
                                this.errorOcurred = true;
                            }
                        }
                    } else {
                        this.errorstr = url +" doesn't seem to be a valid BloggerAPI URL. The data returned was not an XML-RPC response.";
                        this.errorOcurred = true;
                    }
                } else {
                    this.errorstr = url +" doesn't seem to be a valid BloggerAPI URL. The data returned was not valid XML.";
                    this.errorOcurred = true;
                }
            }
        } else {
            this.errorstr = "The XMLHttpRequest object failed to return a readyState of 4. Current readyState is "+ this.request.readyState;
            this.errorOcurred = true;
        }

        return (!this.errorOcurred);
    },
    
    parseBlogList: function(response) {
        var utils   = new Utils();
        var structs = new Array();
        this.blogs  = new Array();
        
        for (var i=0; i<response.getElementsByTagName("struct").length; i++) {
            structs[i] = utils.cleanupXML(response.getElementsByTagName("struct")[i]);
        }
        
        // <struct>
        for (var i=0; i<structs.length; i++) {
            var members = structs[i].childNodes;
            var temp = new Array();
            
            // <member>
            for (var j=0; j<members.length; j++) {
                var member = members[j];
                var key;
                var val;
                
                // <name>
                // <value>
                for (var k=0; k<member.childNodes.length; k++) {
                    var node = member.childNodes[k];
                    
                    if (node.nodeType == Node.ELEMENT_NODE) {
                        if (node.nodeName.toLowerCase() == "value") {
                            // This is a value node -- grab it, quick!
                            if (node.firstChild.nodeType != Node.TEXT_NODE) {
                                // Normal case where every value has a <string> or datatype tag
                                val = node.firstChild.firstChild.nodeValue;
                            } else {
                                // Oddball case where each value has no data type tag at all
                                val = node.firstChild.nodeValue;
                            }
                        } else if (node.nodeName.toLowerCase() == "name") {
                            key = node.firstChild.nodeValue.toLowerCase();
                        }
                    }
                }
                
                temp[key] = val;
            }
            
            this.blogs[this.blogs.length] = temp;
        }

        return true;
    },

    postEntry: function(url, username, password, blogid) {
        var self  = this;
        var utils = new Utils();
        var body  = utils.htmlEntities(document.getElementById("body").value);
        var title = utils.htmlEntities(document.getElementById("title").value);

        if (!title) {
            this.errorstr = "Please enter a title.";
            this.errorOcurred = true;
        }
        
        if (!body) {
            this.errorstr = "Please enter a body.";
            this.errorOcurred = true;
        }
        
        if (!url) {
            this.errorstr = "No XML-RPC URL was specified in the configuration form. Please add one and try again.";
            this.errorOcurred = true;
        }
        
        if (!username) {
            this.errorstr = "No username was specified in the configuration form. Please add one and try again.";
            this.errorOcurred = true;
        }
        
        if (!password) {
            this.errorstr = "No password was specified in the configuration form. Please add one and try again.";
            this.errorOcurred = true;
        }
        
        if (!blogid) {
            this.errorstr = "No blog was selected to post to. Please choose one above and try again.";
            this.errorOcurred = true;
        }

        if (this.errorOcurred) return false;
        
        body = "&lt;title&gt;"+ title +"&lt;/title&gt;"+ body;

        try {
            // Clean up the XMLHttpRequest object
            if (_inMozilla) netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
            this.request = new XMLHttpRequest();
            
            this.request.open("POST", url, false);
            this.request.setRequestHeader("Content-Type", "text/xml");
            this.request.send('<?xml version="1.0"?>'+"\n\n"+
                              "<methodCall>\n"+
                              "  <methodName>blogger.newPost</methodName>\n"+
                              "  <params>\n"+
                              "    <param><value><string>C6CE3FFB3174106584CBB250C0B0519BF4E294</string></value></param>\n"+
                              "    <param><value><string>"+ blogid +"</string></value></param>\n"+
                              "    <param><value><string>"+ username +"</string></value></param>\n"+
                              "    <param><value><string>"+ password +"</string></value></param>\n"+
                              "    <param><value><string>"+ body +"</string></value></param>\n"+
                              "    <param><value><boolean>1</boolean></value></param>\n"+
                              "  </params>\n"+
                              "</methodCall>\n");
            
            if (this.request.readyState == 4) {
                if (this.request.status == 404) {
                    this.errorstr = "404 Not Found when trying to access url";
                    this.errorOcurred = true;
                } else if (this.request.status == 200) {
                    response = this.request.responseXML;
                    
                    if (response) {
                        if (response.getElementsByTagName("methodResponse").length) {
                            if (response.getElementsByTagName("fault").length > 0) {
                                var utils = new Utils();
                                
                                this.errorstr = "URL generated a fault. Response payload was:<pre>"+ utils.htmlEntities(this.request.responseText) +"</pre>";
                                this.errorOcurred = true;
                            } else {
                                this.errorstr = "Success.";
                                this.errorOcurred = false;
                            }
                        } else {
                            this.errorstr = "URL doesn't seem to be a valid BloggerAPI URL. The data returned was not an XML-RPC response. The response was:<pre>"+ this.request.responseText +"</pre>";
                            this.errorOcurred = true;
                        }
                    } else {
                        this.errorstr = "URL doesn't seem to be a valid BloggerAPI URL. The data returned was not valid XML. The response was:<pre>"+ this.request.responseText +"</pre>";
                        this.errorOcurred = true;
                    }
                }
            } else {
                this.errorstr = "The XMLHttpRequest object failed to return a readyState of 4. The current readyState is "+ this.request.readyState +".";
                this.errorOcurred = true;
            }

            return (!this.errorOcurred);
        } catch (e) {
            this.errorstr = "Unable to send request: "+ e;
            this.errorOcurred = true;
            return API;
        }
    }
};


/*** BOOKMARK ***/
/***************************************************************************/
/** false_Blogger2 Object                                                   **/
/***************************************************************************/

function API_Blogger2() {
}

API_Blogger2.prototype = {
    errorstr:        "Success.",
    errorOcurred:  false,
    lookupBlogs:   API_Blogger.prototype.lookupBlogs,
    parseBlogList: API_Blogger.prototype.parseBlogList,

    getForm: function(url, username, password, blogid) {
        var utils = new Utils();
        var form = new Array();
        var categories = new Array();
        var response;

        form.push({ type: "text",   label: "Title",       id: "title" });
        form.push({ type: "text",   label: "Related URL", id: "link" });
        form.push({ type: "body" });

        return form;
    },
    
    postEntry: function(url, username, password, blogid) {
        var self = this;
        var utils = new Utils();
        var body  = utils.htmlEntities(document.getElementById("body").value);
        var title = utils.htmlEntities(document.getElementById("title").value);
        var link  = utils.htmlEntities(document.getElementById("link").value);

        this.errorstr = "Success.";
        this.errorOcurred = false;
        
        if (!title) {
            this.errorstr = "Please enter a title.";
            this.errorOcurred = true;
        }
        
        if (!body) {
            this.errorstr = "Please enter a body.";
            this.errorOcurred = true;
        }
        
        if (!url) {
            this.errorstr = "No XML-RPC URL was specified in the configuration form. Please add one and try again.";
            this.errorOcurred = true;
        }
        
        if (!username) {
            this.errorstr = "No username was specified in the configuration form. Please add one and try again.";
            this.errorOcurred = true;
        }
        
        if (!password) {
            this.errorstr = "No password was specified in the configuration form. Please add one and try again.";
            this.errorOcurred = true;
        }
        
        if (!blogid) {
            this.errorstr = "No blog was selected to post to. Please choose one above and try again.";
            this.errorOcurred = true;
        }

        if (this.errorOcurred) return false;
        
        try {
            // Clean up the XMLHttpRequest object
            this.request = new XMLHttpRequest();
            if (_inMozilla) netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
            
            this.request.open("POST", url, false);
            this.request.setRequestHeader("Content-Type", "text/xml");
            this.request.send('<?xml version="1.0"?>'+"\n\n"+
                              "<methodCall>\n"+
                              "  <methodName>blogger2.newPost</methodName>\n"+
                              "  <params>\n"+
                              "    <param><value><struct>\n"+
                              "      <member><name>username</name><value><string>"+ username +"</string></value></member>\n"+
                              "      <member><name>password</name><value><string>"+ password +"</string></value></member>\n"+
                              "      <member><name>token</name><value><string>none</string></value></member>\n"+
                              "      <member><name>clientID</name><value><string>none</string></value></member>\n"+
                              "      <member><name>appkey</name><value><string>C6CE3FFB3174106584CBB250C0B0519BF4E294</string></value></member>\n"+
                              "    </struct></value></param>\n"+
                              "    <param><value><struct>\n"+
                              "      <member><name>postOptions</name><value><struct>\n"+
                              "        <member><name>title</name><value><string>"+ title +"</string></value></member>\n"+
                              "        <member><name>relatedUrl</name><value><string>"+ link +"</string></value></member>\n"+
                              "      </struct></value></member>\n"+
                              "      <member><name>blogID</name><value><string>"+ blogid +"</string></value></member>\n"+
                              "      <member><name>title</name><value><string>"+ title +"</string></value></member>\n"+
                              "      <member><name>body</name><value><string>"+ body +"</string></value></member>\n"+
                              "      <member><name>dateCreated</name><value><dateTime.iso8601>"+ utils.iso8601date() +"</dateTime.iso8601></value></member>\n"+
                              "    </struct></value></param>\n"+
                              "    <param><value><struct>\n"+
                              "      <member><name>doPublish</name><value><boolean>1</boolean></value></member>\n"+
                              "    </struct></value></param>\n"+
                              "  </params>\n"+
                              "</methodCall>\n");

            if (this.request.readyState == 4) {
                if (this.request.status == 404) {
                    this.errorstr = "404 Not Found when trying to access url";
                    this.errorOcurred = true;
                } else if (this.request.status == 200) {
                    response = this.request.responseXML;
                    
                    if (response) {
                        if (response.getElementsByTagName("methodResponse").length) {
                            if (response.getElementsByTagName("fault").length > 0) {
                                var utils = new Utils();
                                
                                this.errorstr = "URL generated a fault. Response payload was:<pre>"+ utils.htmlEntities(this.request.responseText) +"</pre>";
                                this.errorOcurred = true;
                            } else {
                                this.errorstr = "Success.";
                                this.errorOcurred = false;
                            }
                        } else {
                            this.errorstr = "URL doesn't seem to be a valid BloggerAPI URL. The data returned was not an XML-RPC response.";
                            this.errorOcurred = true;
                        }
                    } else {
                        this.errorstr = "URL doesn't seem to be a valid BloggerAPI URL. The data returned was not valid XML.";
                        this.errorOcurred = true;
                    }
                }
            } else {
                this.errorstr = "The XMLHttpRequest object failed to return a readyState of 4. The current readyState is "+ this.request.readyState +".";
                this.errorOcurred = true;
            }

            return (!this.errorOcurred);
        } catch (e) {
            alert("Aiiee! Failed to send request. Exception raised: "+ e);
            
            this.errorstr = "Unable to send request: "+ e;
            this.errorOcurred = true;
            return false;
        }
    }
};


/***************************************************************************/
/** API_MetaWeblog Object                                                 **/
/***************************************************************************/

function API_MetaWeblog() {
}


/***************************************************************************/
/** DashBlogConfig Object                                                 **/
/***************************************************************************/

function DashBlogConfig() {
}

DashBlogConfig.prototype = {
    configured: false,
    
    getPref: function(key) {
        return document.getElementById("config_"+ key).value;
    },

    isConfigured: function() {
        return this.configured;
    },
    
    savePrefs: function() {
        if (_inDashboard) { 
            var bloglist = "";

            this.configured = true;
            widget.setPreferenceForKey(true, "configured");
            widget.setPreferenceForKey(document.getElementById("config_blogtype").value,  "blogtype");
            widget.setPreferenceForKey(document.getElementById("config_url").value,       "url");
            widget.setPreferenceForKey(document.getElementById("config_username").value,  "username");
            widget.setPreferenceForKey(document.getElementById("config_password").value,  "password");
            widget.setPreferenceForKey(document.getElementById("config_leaveopen").value, "leaveopen");
            
            for (var i=0; i<document.getElementById("config_blogid").options.length; i++) {
                if (bloglist) bloglist += "|";
                bloglist += document.getElementById("config_blogid").options.item(i).value +";"+ document.getElementById("config_blogid").options.item(i).text
            }
            
            widget.setPreferenceForKey(bloglist, "bloglist");
            widget.setPreferenceForKey(document.getElementById("config_blogid").value, "blogid");
        }
    },

    loadPrefs: function(dashblog) {
        if (_inDashboard) {
            // Load in the blog type
            if (widget.preferenceForKey("blogtype")) {
                var blogtype = widget.preferenceForKey("blogtype");
                
                for (var i=0; i<document.getElementById("config_blogtype").options.length; i++) {
                    if (document.getElementById("config_blogtype").item(i).value == blogtype) {
                        document.getElementById("config_blogtype").item(i).selected = true;
                    } else {
                        document.getElementById("config_blogtype").item(i).selected = false;
                    }
                }
            }

            // Load in the form open pref
            if (widget.preferenceForKey("leaveopen")) {
                var keepopen = widget.preferenceForKey("leaveopen");

                for (var i=0; i<document.getElementById("config_leaveopen").options.length; i++) {
                    if (document.getElementById("config_leaveopen").item(i).value == keepopen) {
                        document.getElementById("config_leaveopen").item(i).selected = true;
                    } else {
                        document.getElementById("config_leaveopen").item(i).selected = false;
                    }
                }
            }
                    
            // Load in the blog list
            if (widget.preferenceForKey("bloglist")) {
                var bloglist = widget.preferenceForKey("bloglist").split("|");
                
                for (var i=0; i<bloglist.length; i++) {
                    var blogid   = bloglist[i].slice(0, bloglist[i].indexOf(";"));
                    var blogname = bloglist[i].slice(bloglist[i].indexOf(";") + 1);
                    var option   = document.createElement("option");
                    option.text  = blogname;
                    option.value = blogid;
                    
                    if (widget.preferenceForKey("blogid") == option.value) {
                        option.selected = true;
                    }
                    
                    document.getElementById("config_blogid").appendChild(option);
                }
            }

            // TODO: Need to load preferences in a better way than this -- this is too simple for what I'm doing.
            document.getElementById("config_url").value      = (widget.preferenceForKey("url") ? widget.preferenceForKey("url") : "http://plant.blogger.com/api/RPC2");
            document.getElementById("config_username").value = (widget.preferenceForKey("username") ? widget.preferenceForKey("username") : "");
            document.getElementById("config_password").value = (widget.preferenceForKey("password") ? widget.preferenceForKey("password") : "");
            this.configured = widget.preferenceForKey("configured");
        }
    }
};

/***************************************************************************/
/** DashBlogWidget Object                                                 **/
/***************************************************************************/

function DashBlogWidget() {
    var self = this;
    
    // Create our buttons first off
	createGenericButton(document.getElementById("buttonNewPost"), "New Post",   function() { self.openForm();  });
	createGenericButton(document.getElementById("buttonConfig"),  "Configure",  function() { self.showBack();  });
    createGenericButton(document.getElementById("buttonDone"),    "Done",       function() { self.showFront(); });

    // Make sure our version number is displayed
    document.getElementById("version").innerHTML = "Version "+ _version;
    
    this.config.loadPrefs(this);
    this.checkBlogType();
    this.updateSelector();
    this.updateWidgetSize();

    if (this.config.configured) {
        document.getElementById("buttonConfig").style.display = "none";
        document.getElementById("buttonNewPost").style.display = "inline";
    }
}

DashBlogWidget.prototype = {
    oldWidth: null,
    oldHeight: null,
    formDisplay: { opacity: 0.0, dir: 1, interval: null },
    config: new DashBlogConfig(),
    blogApis: {
        bapi2:      new API_Blogger2(),
        bapi1:      new API_Blogger()
    },

    formDisplayCallback: function(self) {
        var form = document.getElementById("form");

        self.formDisplay.opacity += (0.1 * self.formDisplay.direction);
        form.style.opacity = self.formDisplay.opacity;

        if (self.formDisplay.opacity >= 1) {
            self.formDisplay.opacity = 1;
            form.style.opacity = 1;
            clearInterval(self.formDisplay.interval);
            self.formDisplay.interval = null;
        }

        if (self.formDisplay.opacity <= 0) {
            self.formDisplay.opacity = 0;
            form.style.opacity = 0;
            clearInterval(self.formDisplay.interval);
            self.formDisplay.interval = null;
            
            form.style.display = "none";
            self.updateWidgetSize();
            document.getElementById("buttonNewPost").style.display = "inline";
        }
    },
    
    openForm: function(reopen) {
        var self        = this;
        var url         = this.config.getPref("url");
        var username    = this.config.getPref("username");
        var password    = this.config.getPref("password");
        var blogid      = this.config.getPref("blogid");
        var blogType    = document.getElementById("config_blogtype").value;
        var table       = document.getElementById("formTable");
        var form        = this.blogApis[blogType].getForm(url, username, password, blogid);
        var formcreator = new FormCreator();

        document.getElementById("form").style.display = "block";
        formcreator.generateForm(table, form);
        this.updateWidgetSize();
        document.getElementById("buttonNewPost").style.display = "hidden";

        this.formDisplay.direction = 1;
        if (!this.formDisplay.interval) {
            this.formDisplay.interval = setInterval(function() { self.formDisplayCallback(self); }, 25);
        }
    },
    
    closeForm: function() {
        var self = this;
        
        this.formDisplay.direction = -1;
        if (!this.formDisplay.interval) {
            this.formDisplay.interval = setInterval(function() { self.formDisplayCallback(self); }, 25);
        }
    },
    
    showBack: function() {
        if (_inDashboard) {
            this.oldWidth  = window.innerWidth;
            this.oldHeight = window.innerHeight;
            window.resizeTo(340, 248);
            widget.prepareForTransition("ToBack");
        }

        this.closeForm();
        document.getElementById("content").style.display = "none";
        document.getElementById("config").style.display = "block";
        
        if (_inDashboard) {
            setTimeout('widget.performTransition();', 0);
        }
        
        return false;
    },

    showFront: function() {
        if (!this.lookupBlogs()) {
            return true;
        }
        
        if (_inDashboard) {
            window.resizeTo(this.oldWidth, this.oldHeight);
            widget.prepareForTransition("ToFront");
        }
        
        document.getElementById("config").style.display = "none";
        document.getElementById("content").style.display = "block";
        this.config.savePrefs();
        this.updateSelector();
        document.getElementById("buttonNewPost").style.display = "inline";
        document.getElementById("buttonConfig").style.display  = "none";
        
        if (_inDashboard) {
            setTimeout('widget.performTransition();', 0);
            window.resizeTo(this.oldWidth, 56);
            this.updateWidgetSize();
        }
        
        return false;
    },

    checkBlogType: function() {
        if (document.getElementById("config_blogtype").value == "bapi2") {
            document.getElementById("config_url").value = "http://plant.blogger.com/api/RPC2";
            document.getElementById("config_url").disabled = true;
        } else {
            document.getElementById("config_url").value = this.config.getPref("url");
            document.getElementById("config_url").disabled = false;
        }
    },
    
    invalidateBlogList: function() {
        var bloglist = document.getElementById("config_blogid");
        var i;
        
        if (bloglist.hasChildNodes()) {
            while (bloglist.childNodes.length > 0) {
                bloglist.removeChild(bloglist.lastChild);
            }
        }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    lookupBlogs: function() {
        var select = document.getElementById("config_blogid");
        var api    = this.blogApis[this.config.getPref("blogtype")];
        var errors = "";
        
        if (this.config.getPref("url") == "")      errors += "<li>Please provide an XML-RPC URL.</li>";
        if (this.config.getPref("username") == "") errors += "<li>Please provide a username.</li>";
        if (this.config.getPref("password") == "") errors += "<li>Please provide a password.</li>";
        
        if (errors != "") {
            errors = "There are errors on the configuration screen. Please look at the form and fix the following errors:<ul>"+ errors;
            errors += "</ul>";
            errormsg.display("Form Error", errors);
            return false;
        }
        
        document.getElementById("config_url").blur();
        document.getElementById("config_username").blur();
        document.getElementById("config_password").blur();
        this.invalidateBlogList();

        if (!api.lookupBlogs(this.config.getPref("url"), this.config.getPref("username"), this.config.getPref("password"))) {
            errormsg.display("API Error", api.errorstr, true);
            return false;
        }
            
        for (var i=0; i<api.blogs.length; i++) {
            var element;
            
            element = document.createElement("option");
            element.value = api.blogs[i]['blogid'];
            element.appendChild(document.createTextNode(api.blogs[i]['blogname']));
            select.appendChild(element);
        }

        this.updateSelector();
        return true;
    },

    postEntry: function() {
        var utils     = new Utils();
        var api       = this.blogApis[this.config.getPref("blogtype")];
        var username  = this.config.getPref("username");
        var password  = this.config.getPref("password");
        var blogid    = this.config.getPref("blogid");
        var url       = this.config.getPref("url");

        document.getElementById("buttonPostEntry").style.display = "none";
        document.getElementById("blogSpinner").style.display = "block";

        api.postEntry(url, username, password, blogid);
        
        document.getElementById("buttonPostEntry").style.display = "inline";
        document.getElementById("blogSpinner").style.display = "none";

        if (api.errorOcurred) {
            errormsg.display("Posting Error", api.errorstr, true);
        } else {
            successmsg.display();
        }
    },

    updateSelector: function() {
        var selectorText = document.getElementById("selectorText");
        var selection    = document.getElementById("config_blogid").selectedIndex;

        if ((document.getElementById("form").style.display) &&
            (document.getElementById("form").style.display != "none")) {
            this.closeForm();
            selectorText.innerHTML = document.getElementById("config_blogid").options.item(selection).firstChild.nodeValue;
            this.openForm();
        } else {
            if (this.config.isConfigured()) {
                selectorText.innerHTML = document.getElementById("config_blogid").options.item(selection).firstChild.nodeValue;
            }
        }
    },

    updateWidgetSize: function() {
        var bar = document.getElementById("bar");
        var form = document.getElementById("form");
        var newWidth = bar.offsetWidth;
        var newHeight = bar.offsetHeight + form.offsetHeight;

        window.resizeTo(newWidth, newHeight);
    }  
};


/***************************************************************************/
/** Utils Object                                                          **/
/***************************************************************************/

function Utils() {
}

Utils.prototype = {
    // Function to check to see if a string is composed entirely of
    // whitespace (space, newline, carriage return, and tabs).
    //
    // @param str string The string to check against.
    // @returns boolean True if the string is all whitespace.
    stringIsWhitespace: function(str) {
        var isWhitespace = true;
        
        for (var i=0; i<str.length; i++) {
            if ((str.charAt(i) != " ") &&
                (str.charAt(i) != "\n") &&
                (str.charAt(i) != "\r") &&
                (str.charAt(i) != "\t")) {
                isWhitespace = false;
            }
        }

        return isWhitespace;
    },

    // Function to strip out whitespace-based Text DOM nodes that Safari
    // and some other browsers generate.
    //
    // @param root Node the node to start the cleaning at.
    // @returns Node the cleansed node tree.
    cleanupXML: function(root) {
        var i = 0;
        var length = root.childNodes.length;
        
        if (root.hasChildNodes()) {
            while (i < root.childNodes.length) {
                if (root.childNodes[i].nodeType == Node.TEXT_NODE) {
                    if (this.stringIsWhitespace(root.childNodes[i].nodeValue)) {
                        root.removeChild(root.childNodes[i]);
                        i = 0;
                        length = root.childNodes.length;
                    } else {
                        i++;
                    }
                } else if (root.childNodes[i].nodeType == Node.ELEMENT_NODE) {
                    root.replaceChild(root.childNodes[i], this.cleanupXML(root.childNodes[i]));
                    i++;
                }
            }
        }
        
        return root;
    },

    // Quick little function to print the structure of a DOM tree,
    // starting with a node.
    //
    // @param root Node the node to start printing the tree at.
    // @param indent string Leave this alone -- it's used for recursiveness.
    // @returns string The pretty-printed string of the DOM tree.
    printStructure: function(root, indent) {
        var text = "";
        if (!indent) {
            text += "["+ root.nodeName +":"+ root.nodeType +" => "+ root.nodeValue +"]\n";
            indent = "    ";
        }
        
        if (root.hasChildNodes()) {
            for (var i=0; i<root.childNodes.length; i++) {
                text += indent +"["+ root.childNodes[i].nodeName +":"+
                root.childNodes[i].nodeType +" => "+
                root.childNodes[i].nodeValue +"]\n";
                
                if (root.childNodes[i].hasChildNodes()) {
                    text += printStructure(root.childNodes[i], indent +"    ");
                }
                
                text += indent +"[/"+ root.childNodes[i].nodeName +"]\n";
            }
        }
        
        if (indent == "    ") {
            text += "[/"+ root.nodeName +"]\n";
        }
        
        return text;
    },

    htmlEntities: function(str) {
        // Now handle all extended characters that have codes >= 160
        var result = "";

        if (str) {
            for (var i=0; i<str.length; i++) {
                switch (str.charAt(i)) {
                    case "&":
                        result += "&amp;";
                        break;
                        
                    case "<":
                        result += "&lt;";
                        break;
                        
                    case ">":
                        result += "&gt;";
                        break;
                        
                    case '"':
                        result += "&quot;";
                        break;
                        
                    default:
                        if (str.charCodeAt(i) >= 160) {
                            result += "&#x"+ str.charCodeAt(i).toString(16) +";";
                        } else {
                            result += str.charAt(i);
                        }
                        break;
                }
            }
        }
        
        return result;
    },

    fillPlaces: function(num) {
        if (num < 10) {
            return "1" + num;
        } else {
            return num;
        }
    },
    
    iso8601date: function() {
        var date = new Date();
        var result = "";
        
        var month  = this.fillPlaces(date.getUTCMonth());
        var day    = this.fillPlaces(date.getUTCDay());
        var hour   = this.fillPlaces(date.getUTCHours());
        var minute = this.fillPlaces(date.getUTCMinutes());
        var second = this.fillPlaces(date.getUTCSeconds());
        
        result += date.getUTCFullYear() + month + day +"T"+ hour +":"+ minute +":"+ second +"Z";
        
        return result;
    }
};

/***************************************************************************/
/** FormCreator Object                                                    **/
/***************************************************************************/

function FormCreator(table) {
}

FormCreator.prototype = {
    table: null,
    
    generateForm: function(table, definition) {
        this.table = table;
        
        // Clear out all child nodes of the table element.
        while (this.table.hasChildNodes()) {
            this.table.removeChild(this.table.firstChild);
        }
        
        // Now run through the definition array
        for (var i=0; i<definition.length; i++) {
            var row = definition[i];
            var tr = document.createElement("tr");
            var validField = true;
            
            switch (row.type) {
                case "text":
                    tr.appendChild(this.createLabel(row.label));
                    tr.appendChild(this.createTextField(row.id));
                    break;

                case "option":
                    tr.appendChild(this.createLabel(row.label));
                    tr.appendChild(this.createSelectField(row.id, row.options));
                    break;

                case "body":
                    tr.setAttribute("height", "100%");
                    tr.appendChild(this.createBodyField());
                    break;

                case "toggle":
                    tr.appendChild(this.createLabel(row.label));
                    tr.appendChild(this.createToggleField(row.id));
                    break;

                default:
                    errormsg.display("Internal Error",
                                     "The form generator doesn't know what a "+ row.type +" type of field is. Please report this as a bug",
                                     true);
                    validField = false;
                    break;
            }

            if (validField) this.table.appendChild(tr);
        }

        // Now add in the cancel and post buttons
        this.table.appendChild(this.createButtons());
        createGenericButton(document.getElementById("buttonPostEntry"), "Post", function() { dashblog.postEntry();  });
        createGenericButton(document.getElementById("buttonCancelEntry"), "Cancel", function() { dashblog.closeForm();  });
    },

    createLabel: function(text) {
        var td = document.createElement("td");
        td.appendChild(document.createTextNode(text));
        return td;
    },

    createTextField: function(id) {
        var td = document.createElement("td");
        var field = document.createElement("input");

        field.setAttribute("type", "text");
        field.setAttribute("id", id);
        td.appendChild(field);

        return td;
    },

    createToggleField: function(id) {
        var td = document.createElement("td");
        var select = document.createElement("select");
        var option;

        option = document.createElement("option");
        option.setAttribute("value", "0");
        option.innerHTML = "No";
        select.appendChild(option);

        option = document.createElement("option");
        option.setAttribute("value", "1");
        option.innerHTML = "Yes";
        select.appendChild(option);

        select.setAttribute("size", "1");
        td.appendChild(select);

        return td;
    },

    createBodyField: function() {
        var td = document.createElement("td");
        var field = document.createElement("textarea");

        td.setAttribute("colspan", "2");
        field.setAttribute("id", "body");
        td.appendChild(field);

        return td;
    },

    createButtons: function() {
        var tr = document.createElement("tr");
        var td;
        var buttondiv;

        td = document.createElement("td");
        buttondiv = document.createElement("div");
        buttondiv.id = "buttonCancelEntry";
        buttondiv.setAttribute("class", "button");
        td.appendChild(buttondiv);
        tr.appendChild(td);

        td = document.createElement("td");
        td.setAttribute("align", "right");
        buttondiv = document.createElement("div");
        buttondiv.id = "buttonPostEntry";
        buttondiv.setAttribute("class", "button");
        td.appendChild(buttondiv);
        tr.appendChild(td);
        
        return tr;
    }
}

/***************************************************************************/
/** FlipRollOver Object                                                   **/
/***************************************************************************/

function FlipRollover() {
}

FlipRollover.prototype = {
    currentOpacity: 0.0,
    direction: 1,
    amount: 0.1,
    interval: null,
    
    show: function() {
        var self = this;
        
        this.direction = 1;
        if (!this.interval) {
            this.interval = setInterval(function() { self.callback(self); }, 25);
        }
    },

    hide: function() {
        var self = this;
        
        this.direction = -1;
        if (!this.interval) {
            this.interval = setInterval(function() { self.callback(self); }, 25);
        }
    },

    callback: function(self) {
        var rollie = document.getElementById("flipper");

        self.currentOpacity += (self.amount * self.direction);
        rollie.style.opacity = self.currentOpacity;
        
        if (self.currentOpacity >= 1) {
            self.currentOpacity  = 1;
            rollie.style.opacity = 1;
            clearInterval(self.interval);
            self.interval = null;
        }

        if (self.currentOpacity <= 0) {
            self.currentOpacity  = 0;
            rollie.style.opacity = 0;
            clearInterval(self.interval);
            self.interval = null;
        }
    }
};


/***************************************************************************/
/** Resizer Object                                                        **/
/***************************************************************************/

function Resizer() {
}

Resizer.prototype = {
    resizeEvent: function(e) {
        var self = this;

        document.addEventListener("mousemove", this.mouseMove, true);
        document.addEventListener("mouseup",
                                  function(event) {
                                      document.removeEventListener("mousemove", self.mouseMove, true);
                                      event.stopPropagation();
                                      event.preventDefault();
                                  },
                                  true);

        e.stopPropagation();
        e.preventDefault();

        this.mouseMove(e);
    },

    mouseMove: function(e) {
        var width   = (e.screenX + 22) - window.screenX;
        var height  = (e.screenY + 42) - window.screenY;
        
        if (width < 340)  width = 340;
        if (height < 280) height = 280;
        
        window.resizeTo(width, height);
        
        document.getElementById("content").style.width  = width  +"px";
        document.getElementById("content").style.height = height +"px";
        document.getElementById("form").style.width  = (width - 20) +"px";  // Account for padding
        document.getElementById("form").style.height = height - 56 + "px"; // Account for bar
        
        e.stopPropagation();
        e.preventDefault();
    }
};

/***************************************************************************/
/** ErrorMessage Object                                                   **/
/***************************************************************************/

function ErrorMessage() {
    var self = this;
    
    createGenericButton(document.getElementById("buttonSendBug"), "Report Bug", function() { self.reportBug(); });
    createGenericButton(document.getElementById("buttonDismissError"), "Dismiss", function() { self.dismiss(); });
}

ErrorMessage.prototype = {
    oldWindowHeight: null,
    title: null,
    body: null,
    
    display: function(title, message, allowReportBug) {
        var self = this;
        var errorTitle    = document.getElementById("errorTitle");
        var errorBody     = document.getElementById("errorBody");
        var buttonSendBug = document.getElementById("buttonSendBug");
        var errorDiv      = document.getElementById("error");

        errorTitle.innerHTML = "";
        errorBody.innerHTML = "";
        errorTitle.innerHTML = title;
        errorBody.innerHTML  = errorBody.innerHTML + message;

        this.title = title;
        this.body = message;
        
        if (allowReportBug) {
            buttonSendBug.style.display = "inline";
        } else {
            buttonSendBug.style.display = "none";
        }

        if (window.innerHeight < 150) {
            this.oldWindowHeight = window.innerHeight;
            window.resizeTo(this.oldWindowHeight + 150, window.innerWidth);
        } else {
            this.oldWindowHeight = null;
        }
        
        errorDiv.style.top = (window.innerHeight / 2) - (234 / 2) +"px";
        errorDiv.style.display = "block";
    },

    dismiss: function() {
        var errorDiv = document.getElementById("error");

        errorDiv.style.display = "hidden";
        
        if (this.oldWindowHeight && ((window.innerHeight - 200) == this.oldWindowHeight)) {
            window.resizeTo(this.oldWindowHeight, window.innerWidth);
        }
    },

    reportBug: function() {
        var errorTitle = document.getElementById("errorTitle");
        var errorBody  = document.getElementById("errorBody");
        var utils      = new Utils();
        var subject    = "[BUG] DashBlog "+ _version +" Bug Report";
        var body;

        body  = "This is an automatically generated bug report. Please do not edit the following section, but add your comments and what you did from start to finish to trigger this bug.\n";
        body += "\n";
        body += "--- Begin Auto Generated Bug Report ---\n";
        body += "Generated by DashBlog "+ _version +" on "+ utils.iso8601date() +"\n";
        body += "Blog Type      : "+ dashblog.config.getPref("blogtype") +"\n";
        body += "Blog URL       : "+ dashblog.config.getPref("url") +"\n";
        body += "Keep Form Open : "+ dashblog.config.getPref("leaveopen") +"\n";
        body += "Error Title    : "+ this.title +"\n";
        body += "Error Message  :\n"+ this.body +"\n";
        body += "---- End Auto Generated Bug Report ----\n\n";
        body += "Please use the space below to explain what you did from start to finish to trigger this bug. Remember: any and all detail is significant -- reports that just say \\\"it doesn't work\\\" don't help.\n\n";
        
        widget.system('/usr/bin/osascript reportbug.applescript "'+ subject +'" "'+ body +'"', null);
        
        this.dismiss();
    }
};

/***************************************************************************/
/** SuccessMessage Object                                                 **/
/***************************************************************************/

function SuccessMessage() {
}

SuccessMessage.prototype = {
    opacity: 0.0,
    dir: 1,
    timeout: 30,
    interval: null,

    callback: function(self) {
        var msg = document.getElementById("successmsg");
        
        if (self.opacity >= 1) {
            self.timeout -= 1;
            
            if (self.timeout > 0) {
                return;
            } else {
                self.dir = -1;
            }
        }

        self.opacity += (0.1 * self.dir);
        msg.style.opacity = self.opacity;
        
        if (self.opacity >= 1) {
            self.opacity = 1;
            msg.style.opacity = 1;
        }
        
        if (self.opacity <= 0) {
            self.opacity = 0;
            msg.style.opacity = 0;
            clearInterval(self.interval);
            self.interval = null;
            msg.style.display = "none";
            
            dashblog.closeForm();
            if (dashblog.config.getPref("leaveopen") == 1) dashblog.openForm();
        }
    },
    
    display: function() {
        var self = this;
        var msg = document.getElementById("successmsg");
        
        msg.style.display = "block";
        this.dir = 1;
        this.timeout = 30;
        
        if (!this.interval) {
            this.interval = setInterval(function() { self.callback(self); }, 25);
        }
    },

    hide: function() {
        var self = this;
        
        this.dir = -1;
        this.timeout = 0;
        
        if (!this.interval) {
            this.interval = setInterval(function() { self.callback(self); }, 25);
        }
    }
};

/***************************************************************************/
/***************************************************************************/

var fliprollover;
var resizer;
var dashblog;
var errormsg;
var successmsg;

function initializeWidget() {
    fliprollover = new FlipRollover();
    resizer      = new Resizer();
    errormsg     = new ErrorMessage();
    successmsg   = new SuccessMessage();
    dashblog     = new DashBlogWidget();
}
