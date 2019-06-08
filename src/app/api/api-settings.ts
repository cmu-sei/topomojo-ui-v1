// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Released under a 3 Clause BSD-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { SettingsService } from '../svc/settings.service';

@Injectable()
export class ApiSettings {

    constructor(
        settingsSvc: SettingsService
    ) {
        this.url = settingsSvc.settings.urls.apiUrl;
        this.docUrl = settingsSvc.settings.urls.docUrl;
    }

    url: string;
    docUrl: string;
}
