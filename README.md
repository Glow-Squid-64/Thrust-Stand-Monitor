# Thrust Stand Monitor Web Interface

## Overview
  This here repo is intended to be used as a web interface for my on going thrust stand monitor.
  The code is rough but the basics works now.

## Development Notes
  tsc should already be configured properly
  and build.js should create a ready for use combination in build.
  This project uses uPlot

## Web socket protocol examples
  This web interface uses websocket to send and recieve updates, the basics are as such:

  - Add status (downlink)
  ```
  {
    "action":"status.add",
    "data": [
      {"key":"status1"},
      {"key":"status2"}
    ]
  }
  ```

  - Set status (downlink)
  ```
  {
    "action":"status.set",
    "data": [
      {"key":"status1", "value":true},
      {"key":"status2", "value":false}
    ]
  }
  ```

  - Log data points (downlink)
  ```
  {
    "action":"data.log",
    "data": [
      {"key":t1, "value":y1},
      {"key":t2, "value":y2}
    ]
  }
  ```

  - Start data collection (uplink)
  ```
  {
    "action":"data.start",
    "data": []
  }
  ```

  - Stop data collection (uplink)
  ```
  {
    "action":"data.stop",
    "data": []
  }
  ```

  - Get ignition safety code (uplink)
  ```
  {
    "action":"ignition.getCode",
    "data": []
  }
  ```

  - Return ignition safety code (downlink)
  ```
  {
    "action":"ignition.saveCode",
    "data":[
      {"value":code}
    ]
  }
  ```

  - Trigger ignition (uplink)

    code number 0 means it is the first code generated
    which would be when countdown is at 3
  ```
  {
    "action":"ignition.start",
    "data": [
      {"key":"0", "value":code1},
      {"key":"1", "value":code2},
      {"key":"2", "value":code3}
    ]
  }
  ```
