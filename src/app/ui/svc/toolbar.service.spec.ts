// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { TestBed, inject } from '@angular/core/testing';

import { ToolbarService } from './toolbar.service';

describe('ToolbarService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToolbarService]
    });
  });

  it('should be created', inject([ToolbarService], (service: ToolbarService) => {
    expect(service).toBeTruthy();
  }));
});
