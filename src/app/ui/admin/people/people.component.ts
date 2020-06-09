// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Search, UserProfile } from '../../../api/gen/models';
import { Subscription } from 'rxjs';
import { ProfileService } from '../../../api/profile.service';
import { ToolbarService } from '../../svc/toolbar.service';

@Component({
  selector: 'topomojo-people',
  templateUrl: './people.component.html',
  styleUrls: ['./people.component.scss']
})
export class PeopleComponent implements OnInit, OnDestroy {
  search: Search = { take: 25 };
  hasMore = false;
  current = 0;
  subs: Array<Subscription> = [];
  people: Array<UserProfile> = [];

  constructor(
    private profileSvc: ProfileService,
    private toolbar: ToolbarService
  ) { }

  ngOnInit() {

    this.subs.push(
        this.toolbar.term$.subscribe(
        (term: string) => {
          this.search.term = term;
          this.fetch();
        }
      )
    );

    this.toolbar.search(true);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.toolbar.reset();
  }

  fetch() {
    this.search.skip = 0;
    this.people = [];
    this.more();
  }

  more() {
    this.profileSvc.list(this.search).subscribe(
      (data: UserProfile[]) => {
        this.people.push(...data);
        this.search.skip += data.length;
        this.hasMore = data.length === this.search.take;
      }
    );
  }

  filterChanged(e) {
    this.search.filter = [ e.value ];
    this.fetch();
  }

  select(p: UserProfile) {
    this.current = (this.current !== p.id) ? p.id : 0;
  }

  trackById(i: number, item: UserProfile): number {
    return item.id;
  }

  onDeleted(p: UserProfile) {
    this.people.splice(this.people.indexOf(p), 1);
  }
}
