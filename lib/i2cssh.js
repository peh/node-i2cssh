#!/usr/bin/env osascript -l JavaScript

ObjC.import("Cocoa");
ObjC.import('stdlib')

const args = ObjC.deepUnwrap($.NSProcessInfo.processInfo.arguments).slice(4);

const NavModifier = {
  using: ["option down", "command down"]
};
const BROADCAST_MODIFIER = {
  using: ["shift down", "command down"]
};

const Arrow = {
  left: 123,
  right: 124,
  down: 125,
  up: 126
};

const Enter = 76;

const se = Application("System Events");

const iterm = Application("iTerm2");

function run(argv) {
  let runConfig = JSON.parse(decodeBase64(argv.pop()));
  let hosts = argv;
  let user = runConfig.user ? `${runConfig.user}@` : ''


  let cols, rows;
  const sshCmd = runConfig.test == true ? 'echo' : 'ssh'
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


  // create a new window
  iterm.createWindowWithDefaultProfile();

  // set the initial session
  let session = iterm.currentWindow().currentTab().currentSession();

  // split everything into the matrix as calculated above
  for(let x = 0; x < rows; x++) {
    let k = session.splitHorizontallyWithDefaultProfile();
    for(let y = 0; y < cols-1; y++)  {
      k.splitVerticallyWithDefaultProfile();
    }
  }

  // close the starting window
  session.close()

  // update the session
  session = iterm.currentWindow().currentTab().currentSession();

  for(let x = 0; x < rows; x++) {
    for(let y = 0; y < cols; y++)  {
      if(hosts.length > 0)  {
        se.keystroke(`${sshCmd} ${user}${hosts.pop()} \n`);
        delay(0.2)
        session = toTheRight();
      } else {
        session.close();
        session = toTheRight();
      }
    }
    session = toTheBottom();
  }
}

function toTheRight() {
  se.keyCode(Arrow.right, NavModifier);
  return iterm.currentWindow().currentTab().currentSession();
}

function toTheBottom() {
  se.keyCode(Arrow.down, NavModifier);
  return iterm.currentWindow().currentTab().currentSession();
}

function decodeBase64(s) {
  let e = {},
    i, b = 0,
    c, x, l = 0,
    a, r = '',
    w = String.fromCharCode,
    L = s.length;
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (i = 0; i < 64; i++) {
    e[A.charAt(i)] = i;
  }
  for (x = 0; x < L; x++) {
    c = e[s.charAt(x)];
    b = (b << 6) + c;
    l += 6;
    while (l >= 8) {
      ((a = (b >>> (l -= 8)) & 0xff) || (x < (L - 2))) && (r += w(a));
    }
  }
  return r;
}
