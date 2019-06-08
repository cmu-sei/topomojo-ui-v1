// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { SharedModule } from './shared.module';

describe('SharedModule', () => {
  let sharedModule: SharedModule;

  beforeEach(() => {
    sharedModule = new SharedModule();
  });

  it('should create an instance', () => {
    expect(sharedModule).toBeTruthy();
  });
});
