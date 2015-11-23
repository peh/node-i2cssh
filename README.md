# node-i2cssh
i2cssh with the support of osascript and node.
It is highly inspired by the original [i2cssh](https://github.com/wouterdebie/i2cssh) and the AppleScript version of it ([i2cssh](https://github.com/djui/i2cssh)).
It only runs from within [iTerm2 (>2.9)](https://iterm2.com/)! (currently only available as test releases)

## Installation
`npm -g install node-i2cssh`

## Usage
`i2cssh 1.example.com 2.example.com 3.example.com`

## Configuration

by default, node-i2cssh is checking for a file called .i2csshrc in the users home directory. This can be overwritten with the -C option.
see i2csshrc.example.yml for an annotated example configuration

## Options

### -C --config
overwrites the default config file location
`i2cssh -C ~/workspace/gitrepo/i2csshconfig.yml`

### -c --clusters
adds the given clusters hosts from the config to the hosts to connect to.
`i2cssh -c dev -c staging`

### -t --tags
ec2 tag in the format of $NAME_$VALUE (underscore separated as it is forbidden to be used in tags)
`i2cssh -t env_staging -t end_dev`

## EC2 Integration
For the EC2 integration to work, you need to have `AWS_SECRET_ACCESS_KEY` and `AWS_ACCESS_KEY_ID` set as environment variables.
I recommend using [envchain](https://github.com/sorah/envchain) and creating some alias for i2cssh wrapping it into envchain like
`alias i2cssh="envchain aws i2cssh $@"`
