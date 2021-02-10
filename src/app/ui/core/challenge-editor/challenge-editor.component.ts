import { Component, Input, OnInit } from '@angular/core';
import { Workspace } from 'src/app/api/gen/models';
import { WorkspaceService } from 'src/app/api/workspace.service';
import * as YAML from 'yaml';

@Component({
  selector: 'topomojo-challenge-editor',
  templateUrl: './challenge-editor.component.html',
  styleUrls: ['./challenge-editor.component.scss']
})
export class ChallengeEditorComponent implements OnInit {
  @Input() workspace: Workspace;
  text = '';
  errors = [];

  constructor(
    private api: WorkspaceService
  ) { }

  ngOnInit(): void {
    this.text = YAML.stringify(JSON.parse(this.workspace.challenge || '{"questions":[]}'));
  }

  save(): void {
    try {

      const model = YAML.parse(this.text);
      this.api.putWorkspaceChallenge(this.workspace.id, model).subscribe();
    } catch {
      this.errors.push({ message: "bad yaml"});
    }

  }
}
