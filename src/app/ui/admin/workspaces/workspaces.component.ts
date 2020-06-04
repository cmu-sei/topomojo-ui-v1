// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, OnDestroy } from '@angular/core';
import { WorkspaceService } from '../../../api/workspace.service';
import { Workspace, Search } from '../../../api/gen/models';
import { ToolbarService } from '../../svc/toolbar.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'topomojo-workspaces',
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.scss']
})
export class WorkspacesComponent implements OnInit, OnDestroy {

  current = 0;
  workspaces: Array<Workspace> = [];
  search: Search = {take: 20};
  hasMore = false;
  subs: Array<Subscription> = [];
  changedWorkspace = new Subject<Workspace>();
  changedWorkspace$ = this.changedWorkspace.asObservable();
  constructor(
    private topoSvc: WorkspaceService,
    private toolbar: ToolbarService
  ) { }

  ngOnInit() {
    this.subs.push(
      this.toolbar.term$.subscribe(
        (term: string) => {
          this.search.term = term;
          this.fetch();
        }
      ),

      this.changedWorkspace$.pipe(
        debounceTime(500)
      ).subscribe((topo) => {
        this.topoSvc.update(topo).subscribe();
      })
    );
    this.toolbar.search(true);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.toolbar.reset();
  }

  fetch() {
    this.search.skip = 0;
    this.workspaces = [];
    this.more();
  }

  more() {
    this.topoSvc.list(this.search).subscribe(
      (data: Workspace[]) => {
        this.workspaces.push(...data);
        this.search.skip += data.length;
        this.hasMore = data.length === this.search.take;
      }
    );
  }

  filterChanged(e) {
    this.search.filter = [ e.value ];
    this.fetch();
  }

  select(topo: Workspace) {
    this.current = (this.current !== topo.id) ? topo.id : 0;
  }

  delete(topo: Workspace) {
    this.topoSvc.delete(topo.id).subscribe(
      () => {
        this.workspaces.splice(this.workspaces.indexOf(topo), 1);
      }
    );
  }

  trackById(i: number, item: Workspace): number {
    return item.id;
  }

  changeLimit(topo: Workspace, count: number) {
    topo.templateLimit += count;
    this.changedWorkspace.next(topo);
  }
}
