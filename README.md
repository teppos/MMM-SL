# MMM-SL
This an extension for the [MagicMirror](https://github.com/MichMich/MagicMirror). It can fetch realtime information about public transport in Stockholm, and show departure times for the configured stops.
Updates can be triggered either by a PIR sensor, or by configuring intervals.

## Screenshots

<p float="left" align="middle">
  <img src="/screenshots/debug_time_sort.png?raw=true" width="250" alt="Chronological sorting, with debug output enabled"/>
  <img src="/screenshots/debug_directiontime_sort.png?raw=true" width="250" alt="Direction + chronological sort, with debug output enabled"/> 
</p>

## Installation
Navigate into your MagicMirror's `modules` folder and execute `git clone https://github.com/teppos/MMM-SL.git`. 
You can also download this repository as a zip file, and put the MMM-SL folder in your MagicMirror's modules folder manually. 

Depending on how you want to trigger the updates, you will need either [MMM-PIR-Sensor](https://github.com/paviro/MMM-PIR-Sensor) or
[MMM-ModuleScheduler](https://github.com/ianperrin/MMM-ModuleScheduler) installed as well. See [updating the data](#Updating-the-data).

## Configuration
### Configuring the module

To use this module, add it to the modules array in the `config/config.js` file:
```javascript
modules: [
  {
    module: "MMM-SL",
    config: {
          debug: true,
          realtimeappid: "YOUR_TRAFIKLAB_REALTIME_API_KEY",
          timewindow: "10",
          updateNotification: "UPDATE_SL",
          sorting: "time",
          convertTimeToMinutes: true,
          showRecentlyPassed: false,
          showLastUpdatedAlways: false,
          lastUpdatedInTitle: false,
          pirEventCheck: true,
          preventInterval: 30,
          siteids: [LIST OF SITEID OBJECTS HERE],
          // See "Configuration options" for more information.
    }
  }
]
```

#### Configuration options

The following properties can be configured:

| Option                 | Description                                         |
|:-----------------------|:----------------------------------------------------|
| **realtimeappid**      | The API key for the realtime data, which can be obtained at  [www.trafiklab.se](https://www.trafiklab.se/api/sl-realtidsinformation-4) |
| **timewindow**         | The time window which departures should be downloaded. In minutes from now. Min `1`. Max `60`. Default `10` |
| **siteids**            | List of siteId configuration objects. See explanation [below](#SiteId-configuration). |
| **updateNotification** | The notification to listen for. If received then will trigger update of departure times. |
| **debug** | Show debug information in view, like walking distance, siteid and direction for the different entries |
| **convertTimeToMinutes** | Instead of showing a departure time as 22:10, tries to convert it to amount of minutes left, like: 15 min |
| **showRecentlyPassed** | If you don't want to see those departures which just left, set this to false |
| **sorting** | possible values: **time**, **directionTime**. <br/> **time** sorts after departure time (ExpectedDateTime field from API.)<br/> **directionTime** sorts first after direction and then time. <br/> See screenshots. |
| **showLastUpdatedAlways** | set to true if you always want to display lastUpdated time |
| **lastUpdatedInTitle** | set to true if you want to display lastUpdated time in the title, otherwise it will be shown at the top |
| **pirEventCheck** | if `true` then module will update departureTime when get a `USER_PRESENCE` event which is sent eg. from [MMM-PIR-Sensor](https://github.com/paviro/MMM-PIR-Sensor) module. Will not update again for until `preventInterval` seconds has passed. Default: true |
| **preventInterval** | Number of seconds that have to pass after an update so that multiple update requests will not be sent. Default: 30 |

#### API key

The API is free but registration is required to obtain an API key. You can obtain it at [Trafiklab.se](https://trafiklab.se). You need to obtain a key to *SL realtidsinformation 4*.

Note: there is a limit on how many calls you can make per minute (30) and per month (10 000). 
If you have several stops you want to track, you can either make sure to adjust your timer to prevent updating too often, or to trigger the update either with a button or PIR sensor.
A few examples further down show how you can plan your requests correctly.

#### SiteId configuration

Easiest way to find a siteid for your stop is from sl.se. Search for your stop with 'Next stop'-feature. The siteId is the last number in the URL: ex T-centralen = `9001`.
Alternatively, you can go to [the SL Platsuppslag demo at Trafiklab.se](https://www.trafiklab.se/api/sl-platsuppslag/konsol). Enter the stop name, click the "Call API" button, and search the API response for the SiteId of your 
stop location.
A SiteId configuration must contains an `id`, which is the SL SiteId, and can contain several optional fields, which can be used to fine-tune which information is shown. 

```javascript
...
siteids: [
  {
    id: "9001", // Mandatory
    type: ["bus", "metro"], // Optional
    walkTime: 5, // Optional
    direction: 1, // Optional
    timewindow: 30, // Optional
    displayCount: 5 // Optional
  },
  ...
]
...
```

| Option                 | Description                                         |
|:-----------------------|:----------------------------------------------------|
| **id** | **Mandatory** siteid for the stop. <br/> Easiest way to find a siteid for your stop is from [sl.se](https://sl.se). Search for your stop with 'Next stop'-feature. The siteId is the last number in the URL: ex T-centralen = `9001`|
| **type** | **Optional** List of transportation. <br/> Can be any of `["metro", "bus", "train", "tram", "ship"]`. <br/> If type is not entered then all transportation types are shown. |
| **walkTime** | **Optional**  Walk time to stop in minutes. Filters out the entries which are less time than this |
| **direction** | **Optional** Direction, if only want to show entries in one direction. I.e. show only metro times in one direction. <br/> Use *debug* mode (see above) to see which direction îs which. |
| **timewindow** | **Optional** time window for this stop. if you want some other timewindow for just this stop. |
| **displayCount** | **Optional** How many entries is shown for this stop. <br/>If using **directionTime** sort, this is how many entries is shown for each direction. |

  **Example 1:** show only bus and metro departures from T-centralen

```javascript
siteids: [
  {
    id: "9001",
    type: ["bus", "metro"] // Optional
  },
]
```

  **Example 2:** show all departures from T-centralen

```javascript
siteids: [
  {
    id: "9001"
  },
]
```

#### Example configuration

```javascript
{
  module: "MMM-SL",
  header: "Departure times",
  position: "top_right",
  config: {
    debug: false,
    realtimeappid: "YOUR_TRAFIKLAB_REALTIME_API_KEY",
    timewindow: "10",
    sorting: "directionTime",
    updateNotification: "UPDATE_SL",
    convertTimeToMinutes: true,
    showRecentlyPassed: false,
    showLastUpdatedAlways: true,
    lastUpdatedInTitle:true,
    siteids: [
      {
      	id: "9001", // T-Centralen
      	type: ["metro"], // Only show metro
      	timewindow: 30, // Only show departures in the next 30 minutes
      	displayCount: 5, // Display at most 5 results
      },
    ],
  }
},
```

### Updating the data

This module listens for 3 events to trigger updates:
* **UPDATE_SL** (default value, see config to change this if necessary). <br/> When this event is received the module will make a new call and refresh its values.
* **DECREMENT_SL** When this event is received it will count down the existing values (not clock values, i.e. when it has an exact time like 12:15). <br/> This will **not** make a new API call.
* **USER_PRESENCE** When this event is received (eg. from [MMM-PIR-Sensor](https://github.com/paviro/MMM-PIR-Sensor) module) it will update departure times.

When using the PIR-sensor, it will send events when you're in front of the screen/mirror which will then update the departure times automatically.
When using [MMM-ModuleScheduler](https://github.com/ianperrin/MMM-ModuleScheduler), you can choose during which intervals the mirror will update, 
and how often it will update. This allows users to fine-tune updates to their own needs. Intervals are defined in [the crontab format](http://www.nncron.ru/help/EN/working/cron-format.htm). 
You can use [crontab.guru](https://crontab.guru/) or [cronmaker](http://www.cronmaker.com/) to create and test your expressions.

The **DECREMENT_SL** event should be sent every minute. This way, the timers will be decreased, without making an additional API call. This way your mirror will show a correct 
estimate at all times, and 'real' updates every few minutes can ensure the data remains correct.

The **UPDATE_SL** event should be sent according to your own schedule. These events count against your monthly quota of 10.000 calls. This means that you have about 320 requests per day.

The following configuration for [MMM-ModuleScheduler](https://github.com/ianperrin/MMM-ModuleScheduler) will update the shown vehicles every minute between 6:00 and 22:59. 
The data will be updated slow (once every 10 minutes) at the beginning and end of the day.
During the typical 'leaving for work' time, the data is updated every 2 minutes to ensure it is correct and has information about the latest delays.
The rest of the day, data is updated every 5 minutes to reduce the number of API calls, while still showing actual data.


```javascript
{
  module: "MMM-ModuleScheduler",
  config: {
    notification_schedule: [
      { notification: "DECREMENT_SL", schedule: "* 6-22 * * *", },
      { notification: "UPDATE_SL", schedule: "*/10 6 * * *", },
      { notification: "UPDATE_SL", schedule: "*/2 7-9 * * *", },
      { notification: "UPDATE_SL", schedule: "*/5 10-21 * * *", },
      { notification: "UPDATE_SL", schedule: "*/10 22 * * *", },
    ],
  },
},
```

Now lets calculate the number of requests the above configuration will generate:

| Interval | Number of hours | Requests per hour for one stop | Number of requests |
|----------|-----------------|-------------------|--------------------|
| Every 10 minutes in 6:00-6:59 | 1 | 6 | 6 | 
| Every 2 minutes in 7:00-9:59 | 3 | 30 | 90 |
| Every 5 minutes in 10:00-21:59 | 12 | 12 | 144 |
| Every 10 minutes in 22:00-22:59 | 1 | 6 | 6 |
| **Total** | | | **246 requests per day** |

This solution will use about 7600 requests per month, which is well under the maximum of 10.000 monthly requests / 31 days per month = 322 requests per day, and will thus work perfectly.
This is per stop location. If you want to query more stop locations, you can tweak this scheme a little bit:
 
| Interval | Number of hours | Requests per hour for two stops | Number of requests for two stops |
|----------|--------------------------------|--------------------------------|----------------------------------|
| Every 10 minutes in 6:00-6:59 | 1 | 12 | 12 |
| Every 4 minutes in 7:00-9:59 | 3 | 30 | 90 | 
| Every 6 minutes in 10:00-21:59 | 12 | 20 | 240 |
| **Total** | | | **322 requests per day** |

This configuration will use 10.000 requests per month to keep two stations updated, for 16 hours a day.