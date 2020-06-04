// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OidcSilentComponent } from './oidc-silent.component';

describe('OidcSilentComponent', () => {
  let component: OidcSilentComponent;
  let fixture: ComponentFixture<OidcSilentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OidcSilentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OidcSilentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
