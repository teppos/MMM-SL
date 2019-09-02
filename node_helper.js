var NodeHelper = require("node_helper");
var request = require("request");
module.exports = NodeHelper.create({

  start: function() {
    console.log(this.name + " is started!");
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if (notification === "GET_REALTIME_SL") {
      this.config = payload;
      console.log("Retrieving SL realtime data");

      for (var i = 0; i < this.config.siteids.length; i++) {
        var siteId = this.config.siteids[i];
        var apiUrl = this.config.apiBase + this.config.realTimeEndpoint + this.getParams(siteId);

        this.makeRequest(siteId.id, apiUrl);
      }
    } else if (notification === "DECREMENT_SL") {
      console.log("Decrementing SL time until departure");
      this.sendSocketNotification("SL_DECREMENT_TIMERS");
    }
  },

  makeRequest: function(siteId, apiUrl) {
    var self = this;
    request({
      url: apiUrl,
      method: "GET"
    }, function(error, response, body) {

      if (!error && response.statusCode === 200) {
        var id = siteId;
        var newBody = JSON.parse(body);
        var tmp = {
          id: id,
          result: newBody
        };
        // console.log(id+" " + self.name + ": ",tmp);
        self.sendSocketNotification("SL_REALTIME_DATA",tmp);
      } else {
        console.log(self.name + ": ", error);
      }
    });
  },

  getParams: function(siteId) {
    //?key=<DIN API NYCKEL>&siteid=<SITEID>&timewindow=<TIMEWINDOW>
    var params = "?";
    params += "key=" + this.config.realtimeappid;
    params += "&siteid=" + siteId.id;

    if (siteId.type !== undefined) {
      for (var i = 0; i < this.config.types.length; i++) {
        var type = this.config.types[i];
        if (siteId.type.includes(type)) {
          params += "&" + type + "=true";
        } else {
          params += "&" + type + "=false";
        }
      }
    }

    //Timewindow between 1 - 60 minutes
    if (siteId.timewindow !== undefined && siteId.timewindow > 0 && siteId.timewindow < 60) {
      params += "&timewindow=" + siteId.timewindow;
    } else {
      params += "&timewindow=" + (((this.config.timewindow < 1) || (this.config.timewindow > 60)) ? 15 : this.config.timewindow);
    }
    console.log("params: " + params);
    return params;
  },
});