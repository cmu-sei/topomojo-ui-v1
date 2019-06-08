// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateSelectorComponent } from './template-selector.component';

describe('TemplateSelectorComponent', () => {
  let component: TemplateSelectorComponent;
  let fixture: ComponentFixture<TemplateSelectorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TemplateSelectorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemplateSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
