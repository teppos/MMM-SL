# MMM-SL
This an extension for the [MagicMirror](https://github.com/MichMich/MagicMirror). It can fetch realtime information from SL.se and show departure times for the configured stops.

![Realtime information](/img/screenshot.PNG?raw=true "Realtime information")

## Installation
Navigate into your MagicMirror's `modules` folder and execute `git clone <TODO URL>`.


## Using the module

To use this module, add it to the modules array in the `config/config.js` file:
```javascript
modules: [
	{
		module: 'MMM-SL',
		config: {
          realtimeappid: 'YOUR_SL_REALTIME_API_KEY',
          timewindow: '10',
          siteids: [LIST OF SITEID OBJECTS HERE],
          updateNotification: "UPDATE_SL",
			// See 'Configuration options' for more information.
		}
	}
]
```


## Configuration options

The following properties can be configured:

| Option                 | Description                                         |
|:-----------------------|:----------------------------------------------------|
| **realtimeappid**      | The API key for the realtime data, which can be obtained at  [www.trafiklab.se](https://www.trafiklab.se/api/sl-realtidsinformation-4) |
| **timewindow**         | The time window which departures should be downloaded. In minutes from now. Min `1`. Max `60`. Default `10` |
| **siteids**            | List of siteid objects. See above explanation of siteids |
| **updateNotification** | The notification to listen for. If received then will trigger update of departure times. |


### API key

The API key is free but registration is required.

Note: there is a limit on how many calls you can make per minute (30) and per month (10 000) you can make. If you have several stops you want to track, I recommend that you don't update it with a timer, otherwise you will see that after a while you will get an error message instead. The recommended way is to trigger the update either with a button or similiar.

### Siteid list

Easiest way to find a siteid for your stop is from sl.se. Search for your stop with 'Next stop'-feature. The siteId is the last number in the URL: ex T-centralen = `9001`

A siteid contains of an `id` and `type` which is an optional list of transportation types.

  **Example 1:** show only bus and metro departures from T-centralen

```javascript
siteids: [
  {
    id: "9001",
    type: ["bus", "metro"]
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

  **Note:** type can be any of `["metro", "bus", "train", "tram", "ship"]`

  If type is not entered then all transportation types are shown.
