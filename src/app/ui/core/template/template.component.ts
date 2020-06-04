// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Template, Vm, Workspace } from '../../../api/gen/models';
import { TemplateService } from '../../../api/template.service';
import { VmService } from '../../../api/vm.service';
import { forkJoin, Observable } from 'rxjs';
import { mapTo } from 'rxjs/operators';
import { IsoDataSource } from '../../datasources';
import { WorkspaceService } from '../../../api/workspace.service';
import { VmControllerComponent } from '../../shared/vm-controller/vm-controller.component';

@Component({
  selector: 'topomojo-template',
  templateUrl: './template.component.html',
  styleUrls: ['./template.component.scss']
})
export class TemplateComponent implements OnInit {

  @Input() template: Template;
  // @Input() workspaceId: string;
  @Output() deleted = new EventEmitter<Template>();
  @Output() cloned = new EventEmitter<Template>();
  @ViewChild(VmControllerComponent) vmcontroller: VmControllerComponent;
  vm: Vm = {};
  private isoSource: IsoDataSource;
  showSettings = false;

  constructor(
    private templateSvc: TemplateService,
    private topologySvc: WorkspaceService,
    private vmSvc: VmService
  ) { }

  ngOnInit() {
    this.isoSource = new IsoDataSource(this.topologySvc, this.template.workspaceGlobalId);
  }

  vmLoaded(vm: Vm) {
    this.vm = vm;
  }

  unlink() {
    this.templateSvc.unlink({
      templateId: this.template.id,
      workspaceId: this.template.workspaceId
    }).subscribe(t => {
      this.template = t;
      this.cloned.emit(t);
      this.vmcontroller.load();
    });
  }

  isoChanged(iso: string) {
    this.template.iso = iso;
    // this.save();
    console.log(iso);

    if (this.vm.id) {
        this.vmSvc.updateConfig(this.vm.id, { key: 'iso', value: iso }).subscribe(
            (result) => {

            }
        );
    }
  }

  delete() {

    let q: Observable<any> = this.templateSvc.delete(this.template.id);
    if (!!this.vm.id) {
      q = forkJoin([q, this.vmSvc.delete(this.vm.id).pipe(mapTo(true))]);
    }
    q.subscribe(() => this.deleted.emit(this.template));
  }
}
