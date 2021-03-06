var BugzillaClient = function(options) {
  options = options || {};
  this.username = options.username;
  this.password = options.password;
  this.apiUrl = options.url || 
    (options.test ? "https://api-dev.bugzilla.mozilla.org/test/0.9/"
                  : "https://api-dev.bugzilla.mozilla.org/0.9/");
}

BugzillaClient.prototype = {
  getBug : function(id, callback) {
    this.APIRequest('/bug/' + id, 'GET', callback);  
  },
  
  searchBugs : function(params, callback) {
    this.APIRequest('/bug', 'GET', callback, 'bugs', undefined, params);
  },

  countBugs : function(params, callback) {
    this.APIRequest('/count', 'GET', callback, 'data', undefined, params);
  },

  updateBug : function(id, bug, callback) {
    this.APIRequest('/bug/' + id, 'PUT', callback, 'ok', bug);
  },

  createBug : function(bug, callback) {
    this.APIRequest('/bug', 'POST', callback, 'ref', bug);
  },
  
  bugComments : function(id, callback) {
    this.APIRequest('/bug/' + id + '/comment', 'GET', callback, 'comments');
  },
  
  addComment : function(id, comment, callback) {
    this.APIRequest('/bug/' + id + '/comment', 'POST', callback, 'ref', comment);
  },
  
  bugHistory : function(id, callback) {
    this.APIRequest('/bug/' + id + '/history', 'GET', callback, 'history');
  },

  bugFlags : function(id, callback) {
    this.APIRequest('/bug/' + id + '/flag', 'GET', callback, 'flags');
  },

  bugAttachments : function(id, callback) {
    this.APIRequest('/bug/' + id + '/attachment', 'GET', callback, 'attachments');
  },

  createAttachment : function(id, attachment, callback) {
    this.APIRequest('/bug/' + id + '/attachment', 'POST', callback, 'ref', attachment);
  },
  
  getAttachment : function(id, callback) {
    this.APIRequest('/attachment/' + id, 'GET', callback);
  },
  
  updateAttachment : function(id, attachment, callback) {
    this.APIRequest('/attachment/' + id, 'PUT', callback, 'ok', attachment);        
  },

  searchUsers : function(match, callback) {
    this.APIRequest('/user', 'GET', callback, 'users', undefined, {match: match});
  },

  getUser : function(id, callback) {
    this.APIRequest('/user/' + id, 'GET', callback);
  },
  
  getConfiguration : function(params, callback) {
    this.APIRequest('/configuration', 'GET', callback, undefined, undefined, params);
  },

  APIRequest : function(path, method, callback, field, body, params) {
    var url = this.apiUrl + path;
    if(this.username && this.password) {
      params = params || {};
      params.username = this.username;
      params.password = this.password;
    }
    if(params)
      url += "?" + this.urlEncode(params);
    body = JSON.stringify(body);
    
    try {
      XMLHttpRequest = require("xhr").XMLHttpRequest; // Addon SDK
    }
    catch(e) {}

    var that = this;
    if(typeof XMLHttpRequest != "undefined") {
      // in a browser
      var req = new XMLHttpRequest();
      req.open(method, url, true);
      req.setRequestHeader("Accept", "application/json")
      req.setRequestHeader("Content-type", "application/json");
      req.onreadystatechange = function (event) {
        if (req.readyState == 4) {
          that.handleResponse(null, req, callback, field);
        } 
      };
      req.send(body);
    }
    else {
      // node 'request' package
      require("request")({
          uri: url,
          method: method,
          body: body,
          headers: {'Content-type': 'application/json'}
        },
        function (err, resp, body) {
          that.handleResponse(err, {
              status: resp && resp.statusCode,
              responseText: body
            }, callback, field);
        }
      );
    }
  },
  
  handleResponse : function(err, response, callback, field) {
    var error, json;
    if(err)
      error = err;
    else if(response.status >= 300 || response.status < 200)
      error = "HTTP status " + response.status;
    else {
      try {
        json = JSON.parse(response.responseText);
      } catch(e) {
        error = "Response wasn't valid json: '" + response.responseText + "'";         
      }
    }
    if(json && json.error)
      error = json.error.message;
    var ret;
    if(!error) {
      ret = field ? json[field] : json;
      if(field == 'ref') {// creation returns API ref url with id of created object at end
        var match = ret.match(/(\d+)$/);
        ret = match ? parseInt(match[0]) : true;
      }
    }
    callback(error, ret);
  },
  
  urlEncode : function(params) {
    var url = [];
    for(var param in params)
      url.push(encodeURIComponent(param) + "=" +
        encodeURIComponent(params[param]));
    return url.join("&");
  }
}

exports.createClient = function(options) {
  return new BugzillaClient(options);
}