// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { AdminModule } from './admin.module';

describe('AdminModule', () => {
  let adminModule: AdminModule;

  beforeEach(() => {
    adminModule = new AdminModule();
  });

  it('should create an instance', () => {
    expect(adminModule).toBeTruthy();
  });
});
