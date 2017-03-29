#!/usr/bin/env osascript -l JavaScript

ObjC.import("Cocoa");
var args = ObjC.deepUnwrap($.NSProcessInfo.processInfo.arguments).slice(4);

var NavModifier = {
  using: ["option down", "command down"]
};
var BROADCAST_MODIFIER = {
  using: ["shift down", "command down"]
};

var Arrow = {
  left: 123,
  right: 124,
  down: 125,
  up: 126
};
var Enter = 76;

var se = Application("System Events");
var iterm = Application("iTerm2");

function run(argv) {
  var runConfig = JSON.parse(argv.splice(argv.length - 1, 1));
  var hosts = argv;
  var cols, rows;
  if (runConfig.columns) {
    cols = runConfig.columns;
    rows = Math.ceil(hosts.length / cols);
  } else if (runConfig.rows) {
    rows = runConfig.rows;
    cols = Math.ceil(hosts.length / rows);
  }

  if (cols === undefined || cols == 0) {
    if (runConfig.direction === "row") {
      rows = Math.ceil(Math.pow(hosts.length, 0.5));
      cols = Math.ceil(hosts.length / rows);
    } else {
      cols = Math.ceil(Math.pow(hosts.length, 0.5));
      rows = Math.ceil(hosts.length / cols);
    }
  }

  var profile = runConfig.profile || "default";

  iterm.createWindowWithDefaultProfile();
  var session = iterm.currentWindow().currentTab().currentSession();

  for (var row = 0; row < rows; row++) {
    if (row + 1 < rows) {
      console.log(JSON.stringify(session));
      // session.splitHorizontallyWithProfile(profile);
      session.splitHorizontallyWithDefaultProfile();
    }

    for (var col = 0; col < cols - 1; col++) {
      // session.splitVerticallyWithProfile(profile);
      session.splitVerticallyWithDefaultProfile();
    }
    for (var col = 0; col <= cols - 1; col++) {
      var host = hosts.shift();
      if (host) {
        if (runConfig.user) {
          host = runConfig.user + "@" + host;
        }
        se.keystroke("ssh " + host + "\n");
        toTheRight();
      } else {
        iterm.currentWindow().currentTab().currentSession().close();
        toTheRight();
      }
    }
    se.keyCode(Arrow.down, NavModifier);
    session = iterm.currentWindow().currentTab().currentSession();
  }
  if (runConfig.broadcast === true) {
    // keycode 34 === i
    se.keyCode(34, BROADCAST_MODIFIER);
  }
}

function toTheRight() {
  se.keyCode(Arrow.right, NavModifier);
}
