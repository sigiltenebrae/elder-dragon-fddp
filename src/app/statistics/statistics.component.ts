import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {

  constructor(private fddp_data: FddpApiService, private tokenStorage: TokenStorageService, private router: Router) { }

  user: any = null;
  decks: any[] = [];

  themes = [];
  tribes = [];

  color_dist = {W: 0, U: 0, B: 0, R: 0, G: 0, C: 0};
  color_ratings = {W: 0, U: 0, B: 0, R: 0, G: 0, C: 0};
  theme_rating_dict = {};
  tribe_rating_dict = {};
  card_usage: any = null;

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      //color dist --
      //color ratings --
      //most used card
      //deck theme data --
      //color win data
      this.user = this.tokenStorage.getUser()
      if(this.user && this.user.id) {
        this.fddp_data.getThemes().then((theme_data) => {
          this.themes = theme_data.themes;
          this.tribes = theme_data.tribes;
          this.fddp_data.getCardUsage(this.user.id).then((card_data: any) => {
            this.fddp_data.getDecksBasic(this.user.id).then((decks: any) => {
              this.decks = decks;
              console.log(this.decks);
              for (let deck of this.decks) {
                if (deck.colors) {
                  if (deck.colors.length == 0) {
                    this.color_dist.C ++;
                    this.color_ratings.C += deck.rating;
                  }
                  else {
                    for (let color of deck.colors) {
                      this.color_dist[color] ++;
                      this.color_ratings[color] += deck.rating;
                    }
                  }
                }
                if (deck.themes) {
                  for (let theme of deck.themes) {
                    if (this.theme_rating_dict[theme.theme_id] === undefined) {
                      this.theme_rating_dict[theme.theme_id] = {rating: (deck.rating / 5), count: 1}
                    }
                    else {
                      this.theme_rating_dict[theme.theme_id].rating += (deck.rating / 5);
                      this.theme_rating_dict[theme.theme_id].count ++;
                    }
                  }
                }
                if (deck.tribes) {
                  for (let tribe of deck.tribes) {
                    if (this.tribe_rating_dict[tribe.tribe_id] === undefined) {
                      this.tribe_rating_dict[tribe.tribe_id] = {rating: (deck.rating / 5), count: 1}
                    }
                    else {
                      this.tribe_rating_dict[tribe.tribe_id].rating += (deck.rating / 5);
                      this.tribe_rating_dict[tribe.tribe_id].count ++;
                    }
                  }
                }
              }

              for (let [key, value] of Object.entries(this.color_ratings)) {
                this.color_ratings[key] = this.color_dist[key] > 0 ? this.color_ratings[key] / this.color_dist[key]: 0;
              }

              //console.log(this.color_dist);
              //console.log(this.color_ratings);
              //console.log(this.theme_rating_dict);
              //console.log(this.tribe_rating_dict);

              if (card_data && card_data.length) {
                let carddata_promises = [];
                this.card_usage = [];
                for (let card of card_data.slice(0, 50)) {
                  carddata_promises.push(new Promise<void>((res) => {
                    this.fddp_data.getCardInfo(card.name).then((cardinfo) => {
                      if (cardinfo && cardinfo.types && !cardinfo.types.includes("Land")) {
                        cardinfo.count = card.count;
                        this.card_usage.push(cardinfo);
                      }
                      res();
                    })
                  }));
                }
                Promise.all(carddata_promises).then(() => {
                  let image_promises = [];
                  for (let card of this.card_usage) {
                    image_promises.push(new Promise<void>((re) => {
                      this.fddp_data.getImagesForCard(card.name).then((card_images:any) => {
                        if (card_images && card_images.images && card_images.images.length) {
                          card.image = card_images.images[card_images.images.length - 1].image;
                        }
                        re();
                      })
                    }));
                  }
                  Promise.all(image_promises).then(() => {
                    this.card_usage.sort((a, b) => (a.count < b.count)? 1: -1);
                    //console.log(this.card_usage);
                  });
                })
              }
            })
          });
        });
      }
    }
  }

  /**
   * Returns the theme with the given id
   * @param id
   */
  getTheme(id) {
    for (let theme of this.themes) {
      if (theme.id === id) {
        return theme;
      }
    }
    return null;
  }

  /**
   * Returns the tribe with the given id
   * @param id
   */
  getTribe(id) {
    for (let tribe of this.tribes) {
      if (tribe.id === id) {
        return tribe;
      }
    }
    return null;
  }

}
