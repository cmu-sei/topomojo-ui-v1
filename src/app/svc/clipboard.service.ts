// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.
import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable()
export class ClipboardService {

    constructor(
        @Inject(DOCUMENT) private dom: Document
    ) { }

    copyToClipboard(text: string) {
        const el = this.dom.createElement('textarea') as HTMLTextAreaElement;
        el.style.position = 'fixed';
        el.style.top = '-200';
        el.style.left = '-200';
        this.dom.body.appendChild(el);
        el.value = text;
        el.select();
        this.dom.execCommand('copy');
        this.dom.body.removeChild(el);
    }

}
