// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component } from '@angular/core';
import { AdminService } from '../../../api/admin.service';
import { CachedConnection, JanitorReport } from '../../../api/gen/models';
import { Observable } from 'rxjs';

@Component({
  selector: 'topomojo-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  connections: Observable<Array<CachedConnection>> | undefined;
  importResult: Observable<Array<string>> | undefined;
  janitorResult: Observable<Array<JanitorReport>> | undefined;
  announcement = '';
  exportIds = '';

  constructor(
    private adminSvc: AdminService
  ) {
    this.connections = adminSvc.listConnections();
  }

  announce() {
    this.adminSvc.createAnnouncement(this.announcement).subscribe(
      () => {
        this.announcement = '';
      }
    );
  }

  import() {
    this.importResult = this.adminSvc.import();
  }

  export() {
    const ids = this.exportIds.split(/[,\ ]/).map(v => +v);
    this.adminSvc.export(
      ids
    ).subscribe(() => this.exportIds = '');
  }

  trackById(i: number, item: CachedConnection): string {
    return item.id;
  }

  cleanup() {
    this.janitorResult = this.adminSvc.cleanup();
  }
}
