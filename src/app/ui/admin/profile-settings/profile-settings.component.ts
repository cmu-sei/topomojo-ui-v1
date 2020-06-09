// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { Component, OnInit, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ProfileService } from '../../../api/profile.service';
import { UserProfile } from '../../../api/gen/models';

@Component({
  selector: 'topomojo-profile-settings',
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss']
})
export class ProfileSettingsComponent implements OnInit {
  @Input() profile: UserProfile;
  @Output() deleted = new EventEmitter<UserProfile>();
  @ViewChild(NgForm) form;

  constructor(
    private profileSvc: ProfileService
  ) { }

  ngOnInit() {
  }

  update() {
    this.profileSvc.update(this.profile).subscribe(
      () => {
        this.form.reset(this.form.value);
      }
    );
  }

  delete() {
    this.profileSvc.delete(this.profile.id).subscribe(
      () => {
        this.deleted.emit(this.profile);
      }
    );
  }
}
