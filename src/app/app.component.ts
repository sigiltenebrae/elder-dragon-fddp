import { Component } from '@angular/core';
import {TokenStorageService} from "../services/token-storage.service";
import {FddpApiService} from "../services/fddp-api.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'elder-dragon-fddp';

  public loggedIn = false; //Is a user logged in
  public users: any[] = [];
  current_user: any = null;

  constructor(private tokenStorage: TokenStorageService, private fddp_data: FddpApiService) {
    this.fddp_data.getUsers().then((users: any) => {
      this.users = users;
    });
    this.loggedIn = !(this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0);
    if (this.loggedIn) {
      this.current_user = this.tokenStorage.getUser();
    }
  }

  public signOut():void {
    this.tokenStorage.signOut();
  }

  public signIn(user: any) {
    this.tokenStorage.saveUser(user);
    this.reloadPage();
  }

  reloadPage(): void {
    window.location.reload();
  }
}
