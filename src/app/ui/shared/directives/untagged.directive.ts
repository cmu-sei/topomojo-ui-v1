// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.
import { Directive, PipeTransform, Pipe } from '@angular/core';

@Pipe({name: 'untagged'})
export class UntaggedStringPipe implements PipeTransform {
    transform(value: string): string {
      return value.split('#').shift();
  }
}
