// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GamespaceComponent } from './gamespace.component';

describe('GamespacePreviewComponent', () => {
  let component: GamespaceComponent;
  let fixture: ComponentFixture<GamespaceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GamespaceComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GamespaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
