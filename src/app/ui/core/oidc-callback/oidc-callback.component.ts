// Copyright 2020 Carnegie Mellon University. 
// Released under a MIT (SEI) license. See LICENSE.md in the project root. 

import { Component } from '@angular/core';
import { AuthService } from 'src/app/svc/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'topomojo-oidc-callback',
  templateUrl: './oidc-callback.component.html',
  styleUrls: ['./oidc-callback.component.scss']
})
export class OidcCallbackComponent {

  authmsg = '';

  constructor(
    private authSvc: AuthService,
    private router: Router
  ) {
    this.authSvc.externalLoginCallback('')
      .then(
        (user) => {
          this.router.navigateByUrl(user.state || '/topo');
        },
        (err) => {
          console.log(err);
          this.authmsg = (err.error || err).message;
        }
      );
   }

}
