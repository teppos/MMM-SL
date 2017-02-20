Module.register("MMM-SL",{
  // Default module config.
  defaults: {
    apiBase: "http://api.sl.se/api2/",
    realTimeEndpoint: "realtimedeparturesV4.json",
    timewindow: 10,

    types: ["metro", "bus", "train", "tram", "ship"],
    preventInterval: 30000,
    iconTable: {
      "METRO": "fa-subway",
      "TRAM": "fa-subway",
      "BUS": "fa-bus",
      "SHIP": "fa-ship",
      "TRAIN": "fa-train",
    },
  },

  // Define required scripts.
  getStyles: function() {
    return ["font-awesome.css"];
  },

  start: function() {
    Log.log(this.name + ' is starting!');
    this.updateTimer = null;
    this.loaded = false;
    this.lastUpdated = null;

    this.realTimeDataNew=[];
    this.resetData();
    this.ableToUpdate=true;
    this.getRealTime();
  },

  // Override dom generator.
  getDom: function() {
    Log.log('lastUpdated: '+this.lastUpdated);

    var wrapper = document.createElement("div");

    if (this.config.realtimeappid === "" || this.config.realtimeappid === "YOUR_SL_REALTIME_API_KEY") {
      wrapper.innerHTML = "Please set the correct sl <i>realtimeappid</i> in the config for module: " + this.name + ".";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (!this.loaded) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    var table = document.createElement("table");
    table.className = "small";
    var lastUpdatedRow = document.createElement("tr");
    table.appendChild(lastUpdatedRow);

    var lastUpdatedCell = document.createElement("td");
    lastUpdatedCell.innerHTML = "Last updated: "+this.lastUpdated;
    lastUpdatedCell.className = "dimmed light xsmall lastupdated";
    lastUpdatedCell.colSpan=4;
    lastUpdatedRow.appendChild(lastUpdatedCell);

    var stopName = "";

    this.realTimeDataNew.sort(function(a,b) {
      if ( a.StopAreaName > b.StopAreaName) return 1;
      if ( b.StopAreaName > a.StopAreaName) return -1;

      // samma hållplats -> kolla på destinationen
      if ( a.Destination > b.Destination) return 1;
      if ( b.Destination > a.Destination) return -1;

      return 0;
    });
    for (var i = 0; i < this.realTimeDataNew.length; i++) {
      var forecast = this.realTimeDataNew[i];

      var row = document.createElement("tr");
      table.appendChild(row);

      if ( stopName.localeCompare(forecast.StopAreaName) !== 0) {
        var stopNameCell = document.createElement("td");
        stopNameCell.innerHTML = forecast.StopAreaName;
        stopNameCell.className = "align-right bright stop-area-name";
        stopNameCell.colSpan=4;
        row.appendChild(stopNameCell);

        row = document.createElement("tr");
        table.appendChild(row);
        stopName = forecast.StopAreaName;
      }

      var iconCell = document.createElement("td");
      iconCell.className = "";
      row.appendChild(iconCell);

      var icon = document.createElement("span");
      icon.className = "fa " + forecast.Icon;
      iconCell.appendChild(icon);

      var lineNumberCell = document.createElement("td");
      lineNumberCell.innerHTML = forecast.LineNumber;
      lineNumberCell.className = "align-right bright line-number";
      row.appendChild(lineNumberCell);

      var destinationCell = document.createElement("td");
      destinationCell.innerHTML = forecast.Destination;
      destinationCell.className = "align-right destination";
      row.appendChild(destinationCell);

      var displayTimeCell = document.createElement("td");
      displayTimeCell.innerHTML = forecast.DisplayTime;
      displayTimeCell.className = "align-right display-time";
      row.appendChild(displayTimeCell);

      // if (this.config.fade && this.config.fadePoint < 1) {
      // 	if (this.config.fadePoint < 0) {
      // 		this.config.fadePoint = 0;
      // 	}
      // 	var startingPoint = this.forecast.length * this.config.fadePoint;
      // 	var steps = this.forecast.length - startingPoint;
      // 	if (f >= startingPoint) {
      // 		var currentStep = f - startingPoint;
      // 		row.style.opacity = 1 - (1 / steps * currentStep);
      // 	}
      // }
    }

    return table;
  },

  resetData: function() {
    this.realTimeDataNew=[];
    this.loaded = false;
  },

  getNewDateString: function(date) {
    var datestring = date.getFullYear()+"-"+("0"+(date.getMonth()+1)).slice(-2)+"-"+("0" + date.getDate()).slice(-2)+" "+
    ("0" + date.getHours()).slice(-2)+":"+("0" + date.getMinutes()).slice(-2)+ ":"+("0" + date.getSeconds()).slice(-2);
    Log.info("new DateString: "+datestring);
    return datestring;
  },

  notificationReceived: function(notification, payload, sender) {
    if ( notification.localeCompare(this.config.updateNotification) === 0 && this.ableToUpdate) {
      this.ableToUpdate=false;
      this.getRealTime();
      this.preventUpdate();
      Log.log(this.name + " further updates are prevented");
    }
  },

  preventUpdate: function(delay) {
    var nextLoad = this.config.preventInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }
    var self = this;
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(function() {
      self.ableToUpdate=true;
       Log.log(self.name + " is able to update again");
    }, nextLoad);
  },

  getRealTime: function() {
    Log.info("mmm-sl: Getting times.");
    this.resetData();
    this.sendSocketNotification("GET_REALTIME_SL",this.config);
  },

  socketNotificationReceived: function(notification, payload) {
    var self = this;
    Log.info('Wunderground received ' + notification);
    if (notification === 'SL_REALTIME_DATA') {
      Log.info('received SL_REALTIME_DATA');
      Log.info(payload);
      self.processRealTimeInfo(JSON.parse(payload));
    }
  },

  /* processRealTimeInfo(data)
  * Uses the received data to set the various values.
  *
  * argument data object - Weather information received form openweather.org.
  */
  processRealTimeInfo: function(data) {
    Log.log('Updating Real time info');
    if ( data.StatusCode !== 0) {
      // TODO: Error code handling. i.e. Show error message either on mirror or atleast log.
    } else {
      this.lastUpdated = data.ResponseData.LatestUpdate;
      var types = [data.ResponseData.Metros, data.ResponseData.Buses, data.ResponseData.Trains, data.ResponseData.Trams, data.ResponseData.Ships];
      for (var i = 0; i < types.length; i++) {
        var aType = types[i];

        for (var j = 0; j < aType.length; j++) {
          var forecast = aType[j];
          this.realTimeDataNew.push({
            Icon: this.config.iconTable[forecast.TransportMode],
            Destination: forecast.Destination,
            LineNumber: forecast.LineNumber,
            StopAreaName: forecast.StopAreaName,
            DisplayTime: forecast.DisplayTime,
          });
        }
      }
    }

    this.show(this.config.animationSpeed, {lockString:this.identifier});
    this.loaded = true;
    this.updateDom(this.config.animationSpeed);
  },
});
