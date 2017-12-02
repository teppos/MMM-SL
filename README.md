# MMM-SL
This an extension for the [MagicMirror](https://github.com/MichMich/MagicMirror). It can fetch realtime information from SL.se and show departure times for the configured stops.

![Realtime information](/img/screenshot.PNG?raw=true 'Realtime information')

## Installation
Navigate into your MagicMirror's `modules` folder and execute `git clone https://github.com/teppos/MMM-SL.git`.


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
          updateNotification: 'UPDATE_SL',
          debug: true,
		  convertTimeToMinutes: true,
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
| **siteids**            | List of siteid objects. See explanation below of siteids |
| **updateNotification** | The notification to listen for. If received then will trigger update of departure times. |
| **debug** | Show debug information in view, like walking distance, siteid and direction for the different entries |
| **convertTimeToMinutes** | Instead of showing a departure time as 22:10, tries to convert it to amount of minutes left, like: 15 min |


### API key

The API key is free but registration is required.

Note: there is a limit on how many calls you can make per minute (30) and per month (10 000) you can make. If you have several stops you want to track, I recommend that you don't update it with a timer, otherwise you will see that after a while you will get an error message instead. The recommended way is to trigger the update either with a button or similiar.

### Siteid list

Easiest way to find a siteid for your stop is from sl.se. Search for your stop with 'Next stop'-feature. The siteId is the last number in the URL: ex T-centralen = `9001`

A siteid contains of an `id` and `type` which is an optional list of transportation types.

```javascript
...
siteids: [
	{
		id: '9001', // Mandatory
		type: ['bus', 'metro'], // Optional
		walkTime: 5, // Optional
		direction: 1 // Optional
		timewindow: 30 // Optional
	},
	...
]
...
```

| Option                 | Description                                         |
|:-----------------------|:----------------------------------------------------|
| **id**      | **Mandatory** siteid for the stop. <br/> Easiest way to find a siteid for your stop is from [sl.se](https://sl.se). Search for your stop with 'Next stop'-feature. The siteId is the last number in the URL: ex T-centralen = `9001`|
| **type**         | **Optional** List of transportation. <br/> Can be any of `['metro', 'bus', 'train', 'tram', 'ship']`. <br/> If type is not entered then all transportation types are shown. |
| **walkTime**            | **Optional**  Walk time to stop in minutes. Filters out the entries which are less time than this |
| **direction** | **Optional** Direction, if only want to show entries in one direction. I.e. show only metro times in one direction. <br/> Use *debug* mode (see above) to see which direction îs which. |
| **timewindow** | **Optional** time window for this stop. if you want some other timewindow for just this stop. |

  **Example 1:** show only bus and metro departures from T-centralen

```javascript
siteids: [
  {
    id: '9001',
    type: ['bus', 'metro'] // Optional
  },
]
```

  **Example 2:** show all departures from T-centralen

```javascript
siteids: [
  {
    id: '9001'
  },
]
```
### Events

This module listens for 2 events:
* **UPDATE_SL** (default value, see config to change this if necessary). <br/> When this event is received the module will make a new call and refresh its values.
* **DECREMENT_SL** When this event is received it will count down the existing values (not clock values, i.e. when it has an exact time like 12:15). <br/> This will **not** make a new API call.

I use another MagicMirror module [MMM-ModuleScheduler](https://github.com/ianperrin/MMM-ModuleScheduler) to send the DECREMENT_SL event every minute.
You can also send the UPDATE_SL event according to a schedule but The important thing is to remember to not update the values too often cause then it's a high risk that you will exceed your allowed limit on calls / month.

For example send only the update event during the morning when you know you are about to travel to work.
Example configuration for MMM-ModuleScheduler:

```javascript
{
	module: 'MMM-ModuleScheduler',
	config: {
		notification_schedule: [
			{ notification: 'DECREMENT_SL', schedule: '0-59 6-23 * * *', },
		],
	},
},
```
See [MMM-ModuleScheduler](https://github.com/ianperrin/MMM-ModuleScheduler) for more information.
