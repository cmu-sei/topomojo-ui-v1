// Copyright 2020 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Directive, PipeTransform, Pipe } from '@angular/core';

@Pipe({name: 'untagged'})
export class UntaggedStringPipe implements PipeTransform {
    transform(value: string): string {
      return value.split('#').shift();
  }
}
