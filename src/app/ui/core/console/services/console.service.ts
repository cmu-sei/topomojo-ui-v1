// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

export interface ConsoleService {
  connect(url: string, stateCallback: Function, options: any);
  disconnect();
  refresh();
  sendCAD();
  toggleScale();
  fullscreen();
  showKeyboard();
  showExtKeypad();
  showTrackpad();
  dispose();
}