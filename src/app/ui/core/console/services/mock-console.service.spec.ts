// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { TestBed, inject } from '@angular/core/testing';

import { MockConsoleService } from './mock-console.service';

describe('MockConsoleService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockConsoleService]
    });
  });

  it('should be created', inject([MockConsoleService], (service: MockConsoleService) => {
    expect(service).toBeTruthy();
  }));
});
