// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, Input } from '@angular/core';
import { VmService } from '../../../api/vm.service';
import { Vm, VmQuestionChoice, VmQuestion } from '../../../api/gen/models';

@Component({
  selector: 'topomojo-vm-question',
  templateUrl: './vm-question.component.html',
  styleUrls: ['./vm-question.component.scss']
})
export class VmQuestionComponent implements OnInit {
  @Input() id: string;
  vm: Vm = {};
  msg = 'status unknown';
  constructor(
    private vmSvc: VmService
  ) { }

  ngOnInit() {
  }

  refresh() {
    this.msg = '';
    this.vmSvc.load(this.id).subscribe(
      (vm: Vm) => {
        this.vm = vm;
        this.msg = (vm.question) ? vm.question.prompt : 'No question pending.';
      }
    );
  }

  choices(): Array<VmQuestionChoice> {
    if (this.vm.question && this.vm.question.choices.length) {
      return this.vm.question.choices;
    }
    return [];
  }

  label(choice: VmQuestionChoice): string {
    return choice.label + ((choice.key === this.vm.question.defaultChoice) ? ' *' : '');
  }

  answer(choice: VmQuestionChoice) {
    this.vmSvc.answerVmQuestion(this.id, {
      questionId: this.vm.question.id,
      choiceKey: choice.key
    }).subscribe((vm: Vm) => {
      this.vm = vm;
      this.msg = (vm.question) ? vm.question.prompt : 'No question pending.';
    });
  }
}
