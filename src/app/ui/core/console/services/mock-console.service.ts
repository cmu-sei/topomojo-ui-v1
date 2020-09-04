// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { ConsoleService } from './console.service';

@Injectable()
export class MockConsoleService implements ConsoleService {
  counter = 0;
  stateChanged: (state: string) => void;

  constructor() { }

  connect(url: string, stateCallback: (state: string) => void, options: any) {
    if (stateCallback === Function) { this.stateChanged = stateCallback; }
    if (this.counter % 3 === 2) {
      stateCallback('connected');
      setTimeout(() => {
        stateCallback('disconnected');
      }, 60000);
    }

    if (this.counter % 3 === 1) { stateCallback('failed'); }
    if (this.counter % 3 === 0) { stateCallback('forbidden'); }
    this.counter += 1;
  }

  disconnect() {
    this.stateChanged('disconnected');
  }

  sendCAD() {}
  refresh() {}
  toggleScale() {}
  fullscreen() {}
  showKeyboard() {}
  showExtKeypad() {}
  showTrackpad() {}
  copy() {}
  paste() {}
  dispose() {}
}
