// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { AgedDatePipe } from './ago.directive';

describe('AgedDatePipe', () => {
  it('should create an instance', () => {
    const directive = new AgedDatePipe();
    expect(directive).toBeTruthy();
  });
});
