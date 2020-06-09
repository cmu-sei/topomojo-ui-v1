// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, Input } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceSummary } from '../../../api/gen/models';

@Component({
  selector: 'topomojo-workspace-summary',
  templateUrl: './workspace-summary.component.html',
  styleUrls: ['./workspace-summary.component.scss']
})
export class WorkspaceSummaryComponent implements OnInit {

  @Input() summary: WorkspaceSummary;

  constructor(
    private router: Router
  ) { }

  ngOnInit() {
  }

}
