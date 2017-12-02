Module.register("MMM-SL",{
  // Default module config.
  defaults: {
    apiBase: "http://api.sl.se/api2/",
    realTimeEndpoint: "realtimedeparturesV4.json",
    timewindow: 10,
    convertTimeToMinutes: false,
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
    Log.log(this.name + " is starting!");
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
    Log.log("lastUpdated: "+this.lastUpdated);

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
      if ( a.StopAreaName > b.StopAreaName) { return 1; }
      if ( b.StopAreaName > a.StopAreaName) { return -1; }

      // samma hållplats -> kolla på destinationen
      if ( a.Destination > b.Destination) { return 1; }
      if ( b.Destination > a.Destination) { return -1; }

      // Parse DisplayTime String to make comparable objects
      // "Nu" should be highest
      // Single digit 'minutes remaining' higher than double digit
      // 'minutes remaining' (always?) higher than 'specific times'
      // Single digit 'specific times' higher than double digit
      var x = -1;
      var y = -1;
      if ( a.DisplayTime.localeCompare("Nu") == 0 ) { x = 0; }
      else if ( /\b\d\smin/.test(a.DisplayTime) ) { x = 1; }
      else if ( /\b\d{2}\smin/.test(a.DisplayTime) ) { x = 2; }
      else if ( /\b\d{1}.\d{2}/.test(a.DisplayTime) ) { x = 3; }
      else if ( /\b\d{2}.\d{2}/.test(a.DisplayTime) ) { x = 4; }

      if ( b.DisplayTime.localeCompare("Nu") == 0 ) { y = 0; }
      else if ( /\b\d\smin/.test(b.DisplayTime) ) { y = 1; }
      else if ( /\b\d{2}\smin/.test(b.DisplayTime) ) { y = 2; }
      else if ( /\b\d{1}.\d{2}/.test(b.DisplayTime) ) { y = 3; }
      else if ( /\b\d{2}.\d{2}/.test(b.DisplayTime) ) { y = 4; }

      // samma hållplats+destination -> kolla på tiden
      if ( x > y ) { return 1; }
      if ( y > x ) { return -1; }

      // Båda avgångstiderna har samma format, då kan vi jämföra dem
      return a.DisplayTime.localeCompare(b.DisplayTime);

      return 0;
    });
    for (var i = 0; i < this.realTimeDataNew.length; i++) {
      var departure = this.realTimeDataNew[i];

      var row = document.createElement("tr");
      table.appendChild(row);

      if ( stopName.localeCompare(departure.StopAreaName) !== 0) {
        var stopNameCell = document.createElement("td");
        var walkTime = "";
        if ( this.config.debug === true ) {
          var time = this.getWalkTime(departure.SiteId);
          if ( time > 0) walkTime = " ("+time +")"
          stopNameCell.colSpan=3;
        } else {
          stopNameCell.colSpan=4;
        }
        stopNameCell.innerHTML = departure.StopAreaName+walkTime;

        stopNameCell.className = "align-right bright stop-area-name";
        row.appendChild(stopNameCell);

        stopName = departure.StopAreaName;

        if ( this.config.debug === true ) {
          var siteIdCell = document.createElement("td");
          siteIdCell.innerHTML = departure.SiteId;
          siteIdCell.className = "align-right dimmed light xsmall";
          //stopNameCell.colSpan=1;
          row.appendChild(siteIdCell);

          // var walkTimeCell = document.createElement("td");
          // walkTimeCell.innerHTML = this.getWalkTime(departure.SiteId);
          // walkTimeCell.className = "align-right dimmed light xsmall";
          // //stopNameCell.colSpan=1;
          // row.appendChild(walkTimeCell);
        }
        row = document.createElement("tr");
        table.appendChild(row);
      }

      var iconCell = document.createElement("td");
      iconCell.className = "";
      row.appendChild(iconCell);

      var icon = document.createElement("span");
      icon.className = "fa " + departure.Icon;
      iconCell.appendChild(icon);

      var lineNumberCell = document.createElement("td");
      lineNumberCell.innerHTML = "&nbsp;" + departure.LineNumber;
      lineNumberCell.className = "align-right bright line-number";
      row.appendChild(lineNumberCell);

      var destinationCell = document.createElement("td");
      destinationCell.innerHTML = "&nbsp;" + departure.Destination;
      destinationCell.className = "align-right destination";
      row.appendChild(destinationCell);

      var displayTimeCell = document.createElement("td");
      displayTimeCell.innerHTML = "&nbsp;" + departure.DisplayTime;
      displayTimeCell.className = "align-right display-time";
      row.appendChild(displayTimeCell);

      if ( this.config.debug === true ) {
        var DirectionCell = document.createElement("td");
        DirectionCell.innerHTML = "&nbsp;" + departure.JourneyDirection;
        DirectionCell.className = "align-right dimmed light xsmall display-direction";
        row.appendChild(DirectionCell);
      }
      // if (this.config.fade && this.config.fadePoint < 1) {
      // 	if (this.config.fadePoint < 0) {
      // 		this.config.fadePoint = 0;
      // 	}
      // 	var startingPoint = this.departure.length * this.config.fadePoint;
      // 	var steps = this.departure.length - startingPoint;
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
    else if (notification === "DECREMENT_SL") {
      Log.info("received DECREMENT_SL");
      Log.info(payload);
      this.decrementTimers(payload);
    }
  },

  decrementTimers: function() {
    Log.log(this.name + " attempting to decrement timers");
    for ( var i=this.realTimeDataNew.length-1; i>=0; i-- ) {
      Log.log(this.name + " attempting to decrement timers for element " + i);
      if ( this.realTimeDataNew[i].DisplayTime.localeCompare("Nu") === 0) {
        this.realTimeDataNew[i].DisplayTime = "Nyss";
      }
      else if ( this.realTimeDataNew[i].DisplayTime.localeCompare("Nyss") === 0) {
        this.realTimeDataNew.splice(i,1);
      }
      else if (/\b\d{1,2}\smin/.test(this.realTimeDataNew[i].DisplayTime)) {
        var time = parseInt(this.realTimeDataNew[i].DisplayTime) - 1;
        if (time === 0) {
          this.realTimeDataNew[i].DisplayTime = "Nu";
        }
        else {
          this.realTimeDataNew[i].DisplayTime = "" + time + " min";
        }
      }
    }

    this.show(this.config.animationSpeed, {lockString:this.identifier});
    this.loaded = true;
    this.updateDom(this.config.animationSpeed);
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
    Log.info("Departure times received " + notification);
    if (notification === "SL_REALTIME_DATA") {
      Log.info("received SL_REALTIME_DATA");
      Log.info(payload);
      //self.processRealTimeInfo(JSON.parse(payload));
      self.processRealTimeInfo(payload);
    }
  },

  getWalkTime: function(id) {
    var walkTime = 0;
    for (var i = 0; i < this.config.siteids.length; i++) {
      var siteId = this.config.siteids[i];
      var aSiteId = siteId.id;
      if ( id === aSiteId && siteId.walkTime !== null && typeof siteId.walkTime !== 'undefined') {
        walkTime = siteId.walkTime;
        break;
      }
    }
    //Log.log("walkTime: "+walkTime)
    return walkTime;
  },

  getDirection: function(id) {
    var Direction = 0;
    for (var i = 0; i < this.config.siteids.length; i++) {
      var siteId = this.config.siteids[i];
      var aSiteId = siteId.id;
      if ( id === aSiteId && siteId.dir !== null && typeof siteId.dir !== 'undefined') {
        Direction = siteId.dir;
        break;
      }
    }
    //Log.log("Direction: "+Direction)
    return Direction;
  },

  /* processRealTimeInfo(data)
  * Uses the received data to set the various values.
  *
  * argument data object.
  */
  processRealTimeInfo: function(data) {
    Log.log("Updating departure times");
    if ( data.result.StatusCode !== 0) {
      // TODO: Error code handling. i.e. Show error message either on mirror or atleast log.
    } else {
      moment.locale(config.language);
      var ResponseData = data.result.ResponseData;
      this.lastUpdated = ResponseData.LatestUpdate;
      var types = [ResponseData.Metros, ResponseData.Buses, ResponseData.Trains, ResponseData.Trams, ResponseData.Ships];
      for (var i = 0; i < types.length; i++) {
        var aType = types[i];

        for (var j = 0; j < aType.length; j++) {
          var departure = aType[j];
          var walkTime = this.getWalkTime(data.id)
          var num = parseInt(departure.DisplayTime.replace(/\D/g,''));
          Log.log("NuM: "+num);
          //if ( walkTime > 0 &&  /\b\d+\smin/.departure.DisplayTime.match(/^\d+$/) && departure.DisplayTime < walkTime)
          if ( walkTime > 0 && (num === "" || isNaN(num)) || num < walkTime)
          {
            Log.log(departure.StopAreaName + " " +departure.DisplayTime +" has less time than configured walkTime "+walkTime +" ignoring");
            continue;
          }
          var direction = parseInt(this.getDirection(data.id));
          var departureDirection = parseInt(departure.JourneyDirection);
          if ( direction != 0 && direction !== departureDirection)
          {
            Log.log(departure.StopAreaName + " " +departure.DisplayTime +" " + departure.Destination + " wrong direction "+departureDirection +" ignoring");
            continue;
          }

          var timeToDeparture = departure.DisplayTime;
          if ( this.config.convertTimeToMinutes ) {
            var timeRegexp = /^\d{1,2}:\d{1,2}$/;
            var isTime = timeRegexp.test(departure.DisplayTime);

            if ( isTime ) {
              var m = moment(departure.DisplayTime, "HH:mm");
              var now = moment();
              var d = moment.duration(m.diff(now, 'minutes'));
              Log.log("diff: "+d);
              timeToDeparture = d +" min";
            }
          }

          this.realTimeDataNew.push({
            SiteId: data.id,
            Icon: this.config.iconTable[departure.TransportMode],
            Destination: departure.Destination,
            LineNumber: departure.LineNumber,
            StopAreaName: departure.StopAreaName,
            DisplayTime: timeToDeparture,
            ExpectedDateTime: departure.ExpectedDateTime,
            TimeTabledDateTime: departure.TimeTabledDateTime,
            JourneyDirection: departure.JourneyDirection,
          });
        }
      }
    }

    this.show(this.config.animationSpeed, {lockString:this.identifier});
    this.loaded = true;
    this.updateDom(this.config.animationSpeed);
  },

  getScripts: function() {
	   return [
		     'moment.js',
	   ]
  }
});
