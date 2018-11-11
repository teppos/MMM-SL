var NodeHelper = require("node_helper");
var request = require("request");

module.exports = NodeHelper.create({
  config: {
    debug: false
  },

  log: function(...args) {
    if(this.config.debug && typeof(console) !== 'undefined') {
      console.log(this.name + ":", ...args);
    }
  },

  start: function() {
    this.log("Started!");
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    this.log(notification);

    if(notification === "GET_REALTIME_SL") {
      this.config = payload;

      if(!this.config.debug) {
        this.config.debug = false;
      }

      this.log("Lets get some SL realtime data");

      for (var i = 0; i < this.config.siteids.length; i++) {
        var siteId = this.config.siteids[i];
        var apiUrl = this.config.apiBase + this.config.realTimeEndpoint + this.getParams(siteId);

        this.makeRequest(siteId.id, apiUrl);
      }
    }
    else if (notification === "DECREMENT_SL") {
      this.log("Lets decrement the SL data");

      this.sendSocketNotification("SL_DECREMENT_TIMERS");
    }
  },

  makeRequest: function(siteId, apiUrl) {
    var self = this;

    request({
      url: apiUrl,
      method: "GET"
    }, function(error, response, body) {

      if (!error && response.statusCode == 200) {
        var id = siteId;
        var newBody = JSON.parse(body);
        var tmp = {
          id : id,
          result : newBody
        };

        self.log(id + ": ", tmp);

        self.sendSocketNotification("SL_REALTIME_DATA",tmp);
      } else {
        self.log(error);
      }
    });
  },

  getParams: function(siteId) {
    //?key=<DIN API NYCKEL>&siteid=<SITEID>&timewindow=<TIMEWINDOW>
    var params = "?key=" + this.config.realtimeappid + "&siteid=" + siteId.id;

    if( siteId.type !== undefined) {
      for (var i = 0; i < this.config.types.length; i++) {
        var type = this.config.types[i];

        if ( siteId.type.includes(type) ) {
          params+="&"+type+"=true";
        } else {
          params+="&"+type+"=false";
        }
      }
    }

    /*
    * Timewindow between 1 - 60 minutes
    */
    if( siteId.timewindow !== undefined && siteId.timewindow > 0 && siteId.timewindow < 60) {
      params += "&timewindow=" + siteId.timewindow;
    } else {
      params += "&timewindow=" + (((this.config.timewindow < 1) || (this.config.timewindow > 60)) ? 15 : this.config.timewindow);
    }

    this.log("params: "+params);

    return params;
  }
});
