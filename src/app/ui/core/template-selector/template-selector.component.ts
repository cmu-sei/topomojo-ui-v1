// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { TemplateSummary } from '../../../api/gen/models';
import { TemplateService } from '../../../api/template.service';
import { TemplateDataSource } from '../../datasources';

@Component({
  selector: 'topomojo-template-selector',
  templateUrl: './template-selector.component.html',
  styleUrls: ['./template-selector.component.scss']
})
export class TemplateSelectorComponent implements OnInit {
  tableColumns = [ 'name', 'description' ];
  term = '';
  take = 10;
  dataSource: TemplateDataSource;
  @Output() selected = new EventEmitter<TemplateSummary>();

  constructor(
    private templateSvc: TemplateService
  ) { }

  ngOnInit() {
    this.dataSource = new TemplateDataSource(this.templateSvc);
  }

  clicked(item): void {
    this.selected.emit(item);
  }

}
