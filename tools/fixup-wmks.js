#!/usr/local/bin/node

// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.

// fixup vmware-wmks css errors

const replace = require('replace-in-file');
const options = {
  files: 'node_modules/vmware-wmks/css/css/wmks-all.css',
  from: [
    /url\('..\/img\/touch/g,
    / linear-gradient\(top/g,
    / linear-gradient\(bottom/g
  ],
  to: [
    'url(\'../../img/img/touch',
    ' linear-gradient(to bottom',
    ' linear-gradient(to top'
  ]
};

try {
  const results = replace.sync(options);
  console.log('Replacement results:', results);
}
catch (error) {
  console.error('Error occurred:', error);
}
