// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { TestBed, inject } from '@angular/core/testing';

import { WmksConsoleService } from './wmks-console.service';

describe('WmksConsoleService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WmksConsoleService]
    });
  });

  it('should be created', inject([WmksConsoleService], (service: WmksConsoleService) => {
    expect(service).toBeTruthy();
  }));
});
