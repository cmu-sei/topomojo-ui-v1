// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.
import { TestBed, inject } from '@angular/core/testing';

import { ConsoleService } from './console.service';

describe('ConsoleService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConsoleService]
    });
  });

  it('should be created', inject([ConsoleService], (service: ConsoleService) => {
    expect(service).toBeTruthy();
  }));
});
