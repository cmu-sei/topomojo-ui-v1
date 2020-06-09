// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component } from '@angular/core';

@Component({
  selector: 'topomojo-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent {

  navLinks: Array<NavLink> = [
    { label: 'Dashboard', path: 'dash' },
    { label: 'Gamespace', path: 'mojo' },
    { label: 'Workspace', path: 'topo' },
    { label: 'Template', path: 'tempo' },
    { label: 'Machines', path: 'vms' },
    { label: 'People', path: 'people' }
  ];

}

export interface NavLink {
  label?: string;
  path?: string;
}
