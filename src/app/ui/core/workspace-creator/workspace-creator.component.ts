// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceService } from '../../../api/workspace.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'topomojo-workspace-creator',
  templateUrl: './workspace-creator.component.html',
  styleUrls: ['./workspace-creator.component.scss']
})
export class WorkspaceCreatorComponent implements OnInit {

  @Input() redirect = true;
  name = '';
  description = '';
  errors = new Array<Error>();

  constructor(
    private router: Router,
    private workspaceSvc: WorkspaceService
  ) { }

  ngOnInit() {
  }

  clicked(): void {
    if (!!this.name) {
      this.workspaceSvc.create({
        name: this.name,
        description: this.description
      }).subscribe(
        (ws) => {
          this.router.navigate(['/topo', ws.id, ws.slug]);
          this.name = '';
        },
        (err: HttpErrorResponse) => {
          if (err.error.message.match(/WorkspaceLimitReachedException/)) {
            err.error.message = 'You have reached the workspace limit and so cannot create one now.';
          }
          this.errors.push(err.error);
        }
      );
    }
  }
}
