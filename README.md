# topomojo-ui

User Interface for TopoMojo using Angular

## Build

Use the typical `ng` or `npm` commands to build and run:
```sh
$ npm install
$ sh tools/fixup-wmks.sh  # Only necessary once.
$ npm start
```

*NOTE:* The `vmware-wmks` npm package has problems. After the initial `npm install`, run `node tools/fixup-wmks.js` to modify it.

*NOTE:* If you have a custom version of vmware-wmks, move the files to node_modules/vmware-wmks.  The app looks for both the `./wmks.min.js` and `./wmks-all.css ` (in the root).  If building a docker image, the default Dockerfile will extract `wmks.tar` if it exists.

## Roadmap

* Improve the document editor
* Improve the Admin Dashboard
