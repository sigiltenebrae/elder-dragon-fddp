import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-ban-list',
  templateUrl: './ban-list.component.html',
  styleUrls: ['./ban-list.component.scss']
})
export class BanListComponent implements OnInit {

  cards: any[] = [];
  types: any[] = [];
  ban_list: any[] = [];

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
      this.fddp_data.getBanList().then((cards: any) => {
        this.cards = cards;
        this.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
        let card_promises = [];
        this.cards.forEach((card: any) => {
          card_promises.push(this.getCardImage(card));
        });
        this.fddp_data.getBanTypes().then((types: any) => {
          this.types = types;
          Promise.all(card_promises).then(() => {
            this.ban_list = [[], [], [], []];
            this.cards.forEach((card: any) => {
              this.ban_list[card.ban_type - 1].push(card);
            });
            console.log('ban list loaded');
          });
        });
      });
    }
  }

  /**
   * Loads in an image for the card (attempts to use the most recent)
   * @param card card object to load in
   */
  getCardImage(card: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getImagesForCard(card.name).then((card_image_data: any) => {
        let card_images = card_image_data.images;
        card.image = card_images && card_images.length > 0? card_images[card_images.length - 1].image: '';
        if (card_images.length == 0){
          console.log('failed to find ' + card.name);
        }
        resolve();
      });
    });
  }
}
