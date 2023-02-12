import {Component, HostBinding} from '@angular/core';
import {TokenStorageService} from "../services/token-storage.service";
import {FddpApiService} from "../services/fddp-api.service";
import {OverlayContainer} from "@angular/cdk/overlay";

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

  constructor(public overlayContainer: OverlayContainer, private tokenStorage: TokenStorageService, private fddp_data: FddpApiService) {
    this.fddp_data.getUsers().then((users: any) => {
      this.users = users;
    });
    this.loggedIn = !(this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0);
    if (this.loggedIn) {
      this.current_user = this.tokenStorage.getUser();
      if (this.current_user.theme === 'dark') {
        this.onSetTheme('dark-theme');
      }
      else {
        this.onSetTheme('light-theme');
      }
    }
  }

  signOut() {
    this.tokenStorage.signOut();
    this.reloadPage();
  }

  reloadPage(): void {
    window.location.reload();
  }

  @HostBinding('class') componentCssClass: any;
  private onSetTheme(theme: any) {
    this.overlayContainer.getContainerElement().classList.add(theme);
    this.componentCssClass = theme;
  }
}
