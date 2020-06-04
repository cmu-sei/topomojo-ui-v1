// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, OnDestroy } from '@angular/core';
import { WorkspaceService } from '../../../api/workspace.service';
import { Workspace, Search, WorkspaceSummary } from '../../../api/gen/models';
import { ToolbarService } from '../../svc/toolbar.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'topomojo-workspaces',
  templateUrl: './workspaces.component.html',
  styleUrls: ['./workspaces.component.scss']
})
export class WorkspacesComponent implements OnInit, OnDestroy {

  current: Workspace;
  workspaces: Array<WorkspaceSummary> = [];
  search: Search = {take: 20};
  hasMore = false;
  subs: Array<Subscription> = [];
  changedWorkspace = new Subject<Workspace>();
  changedWorkspace$ = this.changedWorkspace.asObservable();
  constructor(
    private workspaceSvc: WorkspaceService,
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
      ).subscribe((workspace) => {
        this.workspaceSvc.update(workspace).subscribe();
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
    this.workspaceSvc.list(this.search).subscribe(
      (data: WorkspaceSummary[]) => {
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

  select(workspace: WorkspaceSummary) {
    if (this.current?.id !== workspace.id) {
      this.workspaceSvc.load(workspace.id).subscribe(
        w => this.current = w
      );
    } else {
      this.current = null;
    }
  }

  delete(workspace: WorkspaceSummary) {
    this.workspaceSvc.delete(workspace.id).subscribe(
      () => {
        this.workspaces.splice(this.workspaces.indexOf(workspace), 1);
      }
    );
  }

  trackById(i: number, item: Workspace): number {
    return item.id;
  }

  changeLimit(count: number) {
    this.current.templateLimit += count;
    this.changedWorkspace.next(this.current);
  }
}
