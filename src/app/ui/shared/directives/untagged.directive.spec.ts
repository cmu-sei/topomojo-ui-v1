// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.
import { UntaggedStringPipe } from './untagged.directive';

describe('UntaggedStringPipe', () => {
  it('should create an instance', () => {
    const directive = new UntaggedStringPipe();
    expect(directive).toBeTruthy();
  });
});
