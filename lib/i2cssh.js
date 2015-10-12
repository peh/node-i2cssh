#!/usr/bin/env osascript -l JavaScript

var NavModifier = {using: ['option down', "command down"]};

var Arrow = {
	left: 123,
	right: 124,
	down: 125,
	up: 126
}
var Enter = 76;

var se = Application('System Events');
var iterm = Application('iTerm2');

function run(argv) {

	var hosts = argv
	var cols = Math.ceil(Math.pow(hosts.length, 0.5))
	var rows = Math.ceil(hosts.length/cols)
	console.log("creating " + cols + " cols and " + rows + " rows!")

	iterm.createWindowWithDefaultProfile()

	var session = iterm.currentWindow().currentTab().currentSession()
	for(var row = 0; row < rows; row++){
		if(row+1 < rows) {
			session.splitHorizontallyWithSameProfile()	
		}
		for(var col = 0; col < cols-1; col++) {
			session.splitVerticallyWithSameProfile();
		}
		for(var col = 0; col <= cols-1; col++) {
			var host = hosts.shift()
			if(host) {
				se.keystroke("ssh " + host + "\n")
				toTheRight()
			} else {
				iterm.currentWindow().currentTab().currentSession().close()
				toTheRight()
			}			
		}
		se.keyCode(Arrow.down, NavModifier)
		session = iterm.currentWindow().currentTab().currentSession()	
	}
}

function toTheRight(){
	se.keyCode(Arrow.right, NavModifier)
}