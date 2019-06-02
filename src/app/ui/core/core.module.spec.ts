// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.
import { CoreModule } from './core.module';

describe('CoreModule', () => {
  let coreModule: CoreModule;

  beforeEach(() => {
    coreModule = new CoreModule();
  });

  it('should create an instance', () => {
    expect(coreModule).toBeTruthy();
  });
});
