// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnlistComponent } from './enlist.component';

describe('EnlistComponent', () => {
  let component: EnlistComponent;
  let fixture: ComponentFixture<EnlistComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EnlistComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EnlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
