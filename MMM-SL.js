/* global Log, Module, moment */
Module.register("MMM-SL", {
  // Default module config.
  defaults: {
    debug: false,
    header: "SL Departures",
    apiBase: "http://api.sl.se/api2/",
    realTimeEndpoint: "realtimedeparturesV4.json",
    timewindow: 10,
    sorting: "time",
    updateNotification: "UPDATE_SL",
    convertTimeToMinutes: false,
    showRecentlyPassed: true,
    showLastUpdatedAlways: false,
    lastUpdatedInTitle: false,
    pirEventCheck: true,
    types: ["metro", "bus", "train", "tram", "ship"],
    preventInterval: 50,
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
    return ["font-awesome.css", this.file("css/mmm-sl.css")];
  },

  start: function() {
    Log.log(this.name + " is starting!");
    this.loaded = false;
    this.lastUpdated = null;
    this.resetData();
    this.getRealTime();
  },

  getScripts: function() {
    return [
      "moment.js",
    ]
  },

  getHeader: function() {
    if ((this.config.debug === true || this.config.showLastUpdatedAlways) && this.config.lastUpdatedInTitle) {
      let time = moment(this.lastUpdated).format("HH:mm:ss")

      return "<span class='bright'>" + this.data.header + "</span> <span class='dimmed'><span class='fa fa-refresh'></span> " + time + "</span>";
    } else {
      return "<span class='bright'>" + this.data.header + "</span>";
    }
  },

  // Override dom generator.
  getDom: function() {
    if (this.config.debug) {
      Log.log("lastUpdated: " + this.lastUpdated);
      Log.log("vehicleStops: ", this.vehicleStops);
    }
    let wrapper = document.createElement("div");

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

    let table = document.createElement("table");
    table.className = "small";
    let lastUpdatedRow = document.createElement("tr");

    if ((this.config.debug === true || this.config.showLastUpdatedAlways) && !this.config.lastUpdatedInTitle) {
      let lastUpdatedCell = document.createElement("td");
      lastUpdatedCell.innerHTML = "Last updated: " + this.lastUpdated;
      lastUpdatedCell.className = "dimmed light xsmall lastupdated";
      lastUpdatedCell.colSpan = 4;
      lastUpdatedRow.appendChild(lastUpdatedCell);
      table.appendChild(lastUpdatedRow);
    }
    let notFirst = false;
    for (let key in this.vehicleStops) {
      let departureArray = this.vehicleStops[key];

      if (notFirst) { //&&  this.config.sorting === 'directionTime'
        let row = this.createEmptyRow();
        table.appendChild(row);
      }
      //create Header
      let headerRow = document.createElement("tr");
      let stopNameCell = document.createElement("td");
      let walkTime = "";
      if (this.config.debug === true) {
        let time = this.getWalkTime(departureArray.SiteId);
        if (time > 0) {
          walkTime = " (" + time + ")";
        }
        stopNameCell.colSpan = 3;
      } else {
        stopNameCell.colSpan = 4;
      }
      stopNameCell.innerHTML = key + walkTime;

      stopNameCell.className = "align-right bright stop-area-name";
      headerRow.appendChild(stopNameCell);

      if (this.config.debug === true) {
        let siteIdCell = document.createElement("td");
        siteIdCell.innerHTML = departureArray.SiteId;
        siteIdCell.className = "align-right dimmed light xsmall";
        headerRow.appendChild(siteIdCell);
      }
      notFirst = true;
      table.appendChild(headerRow);

      //sort the departures
      this.sortDepartureArray(departureArray.departures);

      let direction = -1;
      let displayCount = 0;
      let displayCountMax = this.getDisplayCount(departureArray.SiteId);


      //departures for current stopName
      for (let i = 0; i < departureArray.departures.length; i++) {
        let departure = departureArray.departures[i];

        if (direction !== -1 && direction !== departure.JourneyDirection && this.config.sorting === "directionTime") {
          displayCount = 0;
          direction = departure.JourneyDirection;
          let emptyRow = this.createEmptyRow();
          table.appendChild(emptyRow);
        }

        displayCount++;
        if (displayCountMax > 0) {
          if (displayCount <= displayCountMax) {
            if (direction === -1) {
              direction = departure.JourneyDirection;
            }
            let departureRow = this.createDepartureRow(departure);
            table.appendChild(departureRow);
          }
        } else {
          if (direction === -1) {
            direction = departure.JourneyDirection;
          }
          let departureRow = this.createDepartureRow(departure);
          table.appendChild(departureRow);
        }
      }
    }
    return table;
  },

  sortDepartureArray: function(arrayToSort) {
    if (this.config.sorting === "directionTime") {
      arrayToSort.sort(this.expectedTimeDirectionSort);
    }
    // Time sort is the default sorting method
    arrayToSort.sort(this.expectedTimeSort);
  },

  createEmptyRow: function() {
    let row = document.createElement("tr");
    row.className = "empty-row";
    let td = document.createElement("td");
    td.colSpan = 4;
    //td.className = "empty-row";
    td.innerHTML = "&nbsp;";
    row.appendChild(td);
    return row;
  },

  createDepartureRow: function(departure) {
    let row = document.createElement("tr");

    let iconCell = document.createElement("td");
    iconCell.className = "";
    row.appendChild(iconCell);

    let icon = document.createElement("span");
    icon.className = "fa " + departure.Icon;
    iconCell.appendChild(icon);

    let lineNumberCell = document.createElement("td");
    lineNumberCell.innerHTML = "&nbsp;" + departure.LineNumber;
    lineNumberCell.className = "align-right bright line-number";
    row.appendChild(lineNumberCell);

    let destinationCell = document.createElement("td");
    destinationCell.innerHTML = "&nbsp;" + departure.Destination;
    destinationCell.className = "align-right destination";
    row.appendChild(destinationCell);

    let displayTimeCell = document.createElement("td");
    displayTimeCell.innerHTML = "&nbsp;" + departure.DisplayTime;
    displayTimeCell.className = "align-right display-time";
    row.appendChild(displayTimeCell);

    if (this.config.debug === true) {
      let DirectionCell = document.createElement("td");
      DirectionCell.innerHTML = "&nbsp;" + departure.JourneyDirection;
      DirectionCell.className = "align-right dimmed light xsmall display-direction";
      row.appendChild(DirectionCell);
    }
    return row;
  },

  expectedTimeSort: function(a, b) {
    if (a.StopAreaName > b.StopAreaName) {
      return 1;
    }
    if (b.StopAreaName > a.StopAreaName) {
      return -1;
    }

    let aDate = a.ExpectedDateTime === undefined || a.ExpectedDateTime === null ? "" : a.ExpectedDateTime.valueOf(a.ExpectedDateTime);
    let bDate = b.ExpectedDateTime === undefined || b.ExpectedDateTime === null ? "" : b.ExpectedDateTime.valueOf(b.ExpectedDateTime);

    return aDate.localeCompare(bDate);
  },

  expectedTimeDirectionSort: function(a, b) {
    if (a.StopAreaName > b.StopAreaName) {
      return 1;
    } else if (b.StopAreaName > a.StopAreaName) {
      return -1;
    }

    // samma hållplats -> kolla på destinationen
    if (a.JourneyDirection > b.JourneyDirection) {
      return 1;
    } else if (b.JourneyDirection > a.JourneyDirection) {
      return -1;
    }

    let aDate = a.ExpectedDateTime === undefined || a.ExpectedDateTime === null ? "" : a.ExpectedDateTime.valueOf(a.ExpectedDateTime);
    let bDate = b.ExpectedDateTime === undefined || b.ExpectedDateTime === null ? "" : b.ExpectedDateTime.valueOf(b.ExpectedDateTime);

    return aDate.localeCompare(bDate);
  },

  resetData: function() {
    this.vehicleStops = {};
    this.loaded = false;
  },

  getNewDateString: function(date) {
    let datestring = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) + " " +
      ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2);
    Log.info("new DateString: " + datestring);
    return datestring;
  },

  notificationReceived: function(notification, payload, sender) {
    if (notification.localeCompare(this.config.updateNotification) === 0) {
      this.updateTest();
    } else if (notification === "DECREMENT_SL") {
      Log.info("received DECREMENT_SL. Payload: ", payload);
      this.decrementTimers(payload);
    } else if (notification === "USER_PRESENCE") {
      Log.info("MMM-SL received USER_PRESENCE. Payload: ", payload);
      if (this.config.pirEventCheck === true) {
        this.updateTest();
      }
    }
  },

  updateTest: function() {
    if (this.ableToUpdate) {
      this.ableToUpdate = false;
      this.getRealTime();
      this.preventUpdate();
      Log.log(this.name + " further updates are prevented for " + this.config.preventInterval + "s");
    } else {
      let now = moment();
      let nextUpdate = moment(this.updateTime).add(this.config.preventInterval, "seconds");
      let d = moment.duration(nextUpdate.diff(now, "seconds"));
      Log.log(this.name + " next update possible in " + d + " seconds");
    }

  },

  decrementTimers: function() {
    Log.log(this.name + " attempting to decrement timers");
    Log.log("Show recentlyPassed: ", this.config.showRecentlyPassed);

    for (let key in this.vehicleStops) {
      let departureArray = this.vehicleStops[key];
      for (let i = departureArray.departures.length - 1; i >= 0; i--) {

        Log.log(this.name + " attempting to decrement timers for element " + i);
        if (departureArray.departures[i].DisplayTime.localeCompare("Nu") === 0) {
          departureArray.departures[i].DisplayTime = "Nyss";
          if (!this.config.showRecentlyPassed) {
            departureArray.departures.splice(i, 1);
          }
        } else if (departureArray.departures[i].DisplayTime.localeCompare("Nyss") === 0) {
          departureArray.departures.splice(i, 1);
        } else if (/\b\d{1,2}\smin/.test(departureArray.departures[i].DisplayTime)) {
          let time = parseInt(departureArray.departures[i].DisplayTime) - 1;
          if (time === 0) {
            departureArray.departures[i].DisplayTime = "Nu";
          } else {
            departureArray.departures[i].DisplayTime = "" + time + " min";
          }
        }
      }
    }

    this.show(this.config.animationSpeed, {lockString: this.identifier});
    this.loaded = true;
    this.updateDom(this.config.animationSpeed);
  },

  preventUpdate: function(delay) {

    let nextLoad = this.config.preventInterval * 1000;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay * 1000;
    }
    console.log("NextLoad in ms: ", nextLoad);
    let self = this;
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(function() {
      self.ableToUpdate = true;
      Log.log(self.name + " is able to update again");
    }, nextLoad);
    this.updateTime = moment();
  },

  getRealTime: function() {
    Log.info("mmm-sl: Getting departure times.");
    this.resetData();
    this.sendSocketNotification("GET_REALTIME_SL", this.config);
  },

  socketNotificationReceived: function(notification, payload) {
    let self = this;
    Log.info("Departure times received " + notification);
    if (notification === "SL_REALTIME_DATA") {
      Log.info("received SL_REALTIME_DATA. PayLoad: ", payload);
      self.processRealTimeInfo(payload);
    }
  },

  getWalkTime: function(id) {
    let walkTime = 0;
    for (let i = 0; i < this.config.siteids.length; i++) {
      let siteId = this.config.siteids[i];
      let aSiteId = siteId.id;
      if (id === aSiteId && siteId.walkTime !== null && typeof siteId.walkTime !== "undefined") {
        walkTime = siteId.walkTime;
        break;
      }
    }

    return walkTime;
  },

  getDirection: function(id) {
    let Direction = 0;
    for (let i = 0; i < this.config.siteids.length; i++) {
      let siteId = this.config.siteids[i];
      let aSiteId = siteId.id;
      if (id === aSiteId && siteId.direction !== null && typeof siteId.direction !== "undefined") {
        Direction = siteId.direction;
        break;
      }
    }

    return Direction;
  },

  getDisplayCount: function(id) {
    let displayCount = 0;
    for (let i = 0; i < this.config.siteids.length; i++) {
      let siteId = this.config.siteids[i];
      let aSiteId = siteId.id;
      if (id === aSiteId && siteId.displayCount !== null && typeof siteId.displayCount !== "undefined") {
        displayCount = siteId.displayCount;
        break;
      }
    }

    return displayCount;
  },

  /* processRealTimeInfo(data)
   * Uses the received data to set the various values.
   *
   * argument data object.
   */
  processRealTimeInfo: function(data) {
    Log.log("Updating departure times");

    if (data.result.StatusCode !== 0) {
      Log.log("data.result.StatusCode: ", data.result.StatusCode);
    }

    let ResponseData = data.result.ResponseData;
    this.lastUpdated = ResponseData.LatestUpdate;
    let types = [ResponseData.Metros, ResponseData.Buses, ResponseData.Trains, ResponseData.Trams, ResponseData.Ships];
    for (let i = 0; i < types.length; i++) {
      let aType = types[i];

      for (let j = 0; j < aType.length; j++) {
        let departure = aType[j];
        let walkTime = this.getWalkTime(data.id)
        let num = parseInt(departure.DisplayTime.replace(/\D/g, ""));

        if (walkTime > 0 && (num === "" || isNaN(num)) || num < walkTime) {
          Log.log(departure.StopAreaName + " " + departure.DisplayTime + " has less time than configured walkTime " + walkTime + " ignoring");
          continue;
        }
        let direction = parseInt(this.getDirection(data.id));
        let departureDirection = parseInt(departure.JourneyDirection);
        if (direction !== 0 && direction !== departureDirection) {
          Log.log(departure.StopAreaName + " " + departure.DisplayTime + " " + departure.Destination + " wrong direction " + departureDirection + " ignoring");
          continue;
        }

        let timeToDeparture = departure.DisplayTime;
        if (this.config.convertTimeToMinutes) {
          let timeRegexp = /^\d{1,2}:\d{1,2}$/;
          let isTime = timeRegexp.test(departure.DisplayTime);

          if (isTime) {
            let m = moment(departure.DisplayTime, "HH:mm");
            let now = moment();
            let d = moment.duration(m.diff(now, "minutes"));
            timeToDeparture = d + " min";
          }
        }
        let object = {
          SiteId: data.id,
          Icon: this.config.iconTable[departure.TransportMode],
          Destination: departure.Destination,
          LineNumber: departure.LineNumber,
          StopAreaName: departure.StopAreaName,
          DisplayTime: timeToDeparture,
          ExpectedDateTime: departure.ExpectedDateTime,
          TimeTabledDateTime: departure.TimeTabledDateTime,
          JourneyDirection: departure.JourneyDirection,
        };
        if (this.vehicleStops[`${departure.StopAreaName}`] === undefined) {
          this.vehicleStops[`${departure.StopAreaName}`] = {
            departures: [],
            SiteId: data.id
          };
        }

        this.vehicleStops[`${departure.StopAreaName}`].departures.push(object);
      }
    }

    this.show(this.config.animationSpeed, {lockString: this.identifier});
    this.loaded = true;
    this.updateDom(this.config.animationSpeed);
  },
});