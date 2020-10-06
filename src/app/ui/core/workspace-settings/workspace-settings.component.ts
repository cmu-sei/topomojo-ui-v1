// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { Workspace, UserProfile, ChangedWorkspace } from '../../../api/gen/models';
import { MatChipEvent } from '@angular/material/chips';
import { WorkspaceService } from '../../../api/workspace.service';
import { UserService } from '../../../svc/user.service';
import { SettingsService } from '../../../svc/settings.service';
import { NgForm } from '@angular/forms';
import { ClipboardService } from 'src/app/svc/clipboard.service';
import { timer } from 'rxjs';

@Component({
  selector: 'topomojo-workspace-settings',
  templateUrl: './workspace-settings.component.html',
  styleUrls: ['./workspace-settings.component.scss']
})
export class WorkspaceSettingsComponent {

  @Input() workspace: Workspace;
  @Output() deleted = new EventEmitter<boolean>();
  profile: UserProfile = {};
  hostUrl = '';
  inviteUrl = '';
  @ViewChild('form') form: NgForm;

  constructor(
    private workspaceSvc: WorkspaceService,
    private userSvc: UserService,
    private settingsSvc: SettingsService,
    private clipboard: ClipboardService
  ) {

    this.hostUrl = this.settingsSvc.hostUrl;

    this.userSvc.profile$.subscribe(
      (profile: UserProfile) => { this.profile = profile; }
    );

  }

  update() {
    if (this.form.valid) {
      this.workspaceSvc.update(this.form.value as ChangedWorkspace).subscribe(
        () => {
          this.form.reset(this.form.value);
        }
      );
    }
  }

  removeMember(e: MatChipEvent): void {
    this.workspaceSvc.deleteWorker(e.chip.value)
      .subscribe(
        () => {
          const i = this.workspace.workers.findIndex((worker) => worker.id === e.chip.value);
          if (i > -1) {
            this.workspace.workers.splice(i, 1);
          }
        },
        () => { }
      );
  }

  shareUrl(): string {
    return `${this.hostUrl}/invite-gs/${this.workspace.shareCode}`;
  }

  newInvitation() {
    this.workspaceSvc.newInvitation(this.workspace.id)
      .subscribe(
        (data) => {
          this.workspace.shareCode = data.shareCode;
          this.inviteUrl = this.shareUrl();
          this.clipboard.copyToClipboard(this.inviteUrl);
          timer(5000).subscribe(() => this.inviteUrl = '');
        },
        () => {}
      );
  }

  onDelete() {
    this.deleted.emit(true);
  }

}
