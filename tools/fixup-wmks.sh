#!/bin/sh
target=node_modules/vmware-wmks
css=$target/css/css/wmks-all.css
img=$target/img/img

if [ -e "$css" ]; then
  cat $css | sed \
    -e s,\.\./img/,, \
    -e s,\ linear-gradient\(top,\ linear-gradient\(to\ bottom, \
    -e s,\ linear-gradient\(bottom,\ linear-gradient\(to\ top, \
  > $target/wmks-all.css
fi

if [ -d "$img" ]; then
  cp $img/* $target
fi
