// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, Input, AfterViewInit, ViewChild } from '@angular/core';
import { Template, ChangedTemplate } from '../../../api/gen/models';
import { NgForm } from '@angular/forms';
import { TemplateService } from '../../../api/template.service';
import { IsoDataSource, IsoFile } from '../../datasources';
import { WorkspaceService } from '../../../api/workspace.service';

@Component({
  selector: 'topomojo-template-settings',
  templateUrl: './template-settings.component.html',
  styleUrls: ['./template-settings.component.scss']
})
export class TemplateSettingsComponent implements OnInit, AfterViewInit {
  @Input() template: Template;
  @Input() hasVm = false;
  @ViewChild(NgForm) form: NgForm;
  isoSource: IsoDataSource;
  isoDirty = false;
  showingIsos = false;

  constructor(
    private service: TemplateService,
    private topologySvc: WorkspaceService
  ) {
  }

  ngOnInit() {
    this.isoSource = new IsoDataSource(this.topologySvc, this.template.workspaceGlobalId);
  }

  ngAfterViewInit() {
  }

  update(form: NgForm) {
    if (this.form.valid && this.form.value.id) {
      this.service.update(this.form.value as ChangedTemplate).subscribe(
        () => {
          this.form.reset(this.form.value);
          this.isoDirty = false;
        }
      );
    }
  }

  needSaving(): boolean {
    return ((this.form && this.form.dirty) || this.isoDirty) && this.form.valid;
  }

  isoChanged(iso: IsoFile) {
    this.isoDirty = this.template.iso !== iso.path;
    this.template.iso = iso.path;
    this.showingIsos = false;
  }
}
