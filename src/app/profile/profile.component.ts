import { Component, OnInit } from '@angular/core';
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";
import {FddpApiService} from "../../services/fddp-api.service";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  user: any = null;

  constructor(private tokenStorage: TokenStorageService, private router: Router, private fddp_data: FddpApiService) { }

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.user = this.tokenStorage.getUser();
      console.log(this.user);
    }
  }

  saveProfile() {
    this.fddp_data.updateProfile(this.user).then((errors: any) => {
      if (errors.length > 0) {
        console.log(errors);
      }
      else {
        this.tokenStorage.saveUser(this.user);
        window.location.reload();
      }
    });
  }

}
