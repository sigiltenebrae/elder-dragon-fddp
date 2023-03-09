import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-custom-image-manager',
  templateUrl: './custom-image-manager.component.html',
  styleUrls: ['./custom-image-manager.component.scss']
})
export class CustomImageManagerComponent implements OnInit {

  cards: any[] = [];

  constructor(private fddp_data: FddpApiService,  private tokenStorage: TokenStorageService, private router: Router) { }

  isAdmin() {
    return this.tokenStorage.getUser().isAdmin;
  }

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.fddp_data.getCustomCards().then((cards: any) => {
        this.cards = cards;
        this.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
        this.cards.forEach((card: any) => { card.deleting = false });
      });
    }
  }

  deleteCustomCard(card: any) {
    this.fddp_data.deleteCustomCard(card.id).then(() => {
      location.reload();
    });
  }

}
