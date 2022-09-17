import { Component } from '@angular/core';
import {TokenStorageService} from "../services/token-storage.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'elder-dragon-fddp';

  public loggedIn = false; //Is a user logged in
  public users: any[] = [
    {
      "id": 1,
      "name": "Christian"
    },
    {
      "id": 2,
      "name": "David"
    },
    {
      "id": 3,
      "name": "Ray"
    },
    {
      "id": 4,
      "name": "Liam"
    },
    {
      "id": 5,
      "name": "Ryan"
    },
    {
      "id": 6,
      "name": "George"
    }
  ];
  current_user: any = null;

  constructor(private tokenStorage: TokenStorageService) {
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
