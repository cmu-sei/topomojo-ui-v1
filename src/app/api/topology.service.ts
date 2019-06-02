// Copyright 2019 Carnegie Mellon University. All Rights Reserved.
// Licensed under the MIT (SEI) License. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiSettings } from './api-settings';
import { GeneratedTopologyService } from './gen/topology.service';
import { ChangedTopology, GameState, NewTopology, Search, Template, Topology, TopologySearchResult, TopologyState, TopologySummary, TopologySummarySearchResult, VmOptions, VmState, Worker } from './gen/models';

@Injectable()
export class TopologyService extends GeneratedTopologyService {

    constructor(
       protected http: HttpClient,
       protected api: ApiSettings
    ) { super(http, api); }
}
