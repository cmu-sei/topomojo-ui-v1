// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.
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
