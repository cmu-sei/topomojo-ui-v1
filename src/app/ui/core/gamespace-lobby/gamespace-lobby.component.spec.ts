// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GamespaceLobbyComponent } from './gamespace-lobby.component';

describe('GamespaceLobbyComponent', () => {
  let component: GamespaceLobbyComponent;
  let fixture: ComponentFixture<GamespaceLobbyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GamespaceLobbyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GamespaceLobbyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
