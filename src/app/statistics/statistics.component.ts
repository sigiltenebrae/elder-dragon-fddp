import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";

import {ChartConfiguration} from "chart.js";

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {

  constructor(private fddp_data: FddpApiService, private tokenStorage: TokenStorageService, private router: Router) { }

  user: any = null;
  decks: any[] = [];
  loading = false;

  themes = [];
  tribes = [];

  color_dist = {W: 0, U: 0, B: 0, R: 0, G: 0, C: 0};
  color_ratings = {W: 0, U: 0, B: 0, R: 0, G: 0, C: 0};
  theme_rating_dict = {};
  tribe_rating_dict = {};
  card_usage: any = null;

  //Data for "Deck Color Distribution" chart
  public colorDistChartLabels: string[] = [ 'W', 'U', 'B', 'R', 'G' ];
  public colorDistChartDatasets: ChartConfiguration<'doughnut'>['data']['datasets'] | undefined;
  public colorDistChartOptions: ChartConfiguration<'doughnut'>['options'];

  //Data for "Average Rating by Color" chart
  public colorRatingChartData: ChartConfiguration<'bar'>['data'] | undefined;
  public colorRatingChartLegend = false;
  public colorRatingChartPlugins = [];
  public colorRatingChartOptions: ChartConfiguration<'bar'>['options'];

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.loading = true;
      //color dist --
      //color ratings --
      //most used card --
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

              console.log(this.color_dist);
              console.log(this.color_ratings);
              console.log(this.theme_rating_dict);
              console.log(this.tribe_rating_dict);

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
                    this.card_usage = this.card_usage.slice(0, 5);
                    this.loadColorDistData();
                    this.loadColorRatingData();
                    this.loading = false;
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

  public loadColorDistData() {
    this.colorDistChartOptions = {
      responsive: false,
      plugins: {
        title: {
          display: false,
          text: 'Deck Color Percentages',
          color: this.user.theme === "light" ? 'rgb(100, 100, 100)':  'rgb(198, 198, 198)'
        }
      }
    };
    this.colorDistChartDatasets = [{
      data: [
        this.color_dist.W / this.decks.length,
        this.color_dist.U / this.decks.length,
        this.color_dist.B / this.decks.length,
        this.color_dist.R / this.decks.length,
        this.color_dist.G / this.decks.length,
      ],
      backgroundColor: [ //300
        '#eeeeeebb',
        '#64b5f6bb',
        '#9e9e9ebb',
        '#e57373bb',
        '#81c784bb'
      ],
      borderColor: [ //400
        '#e0e0e0bb',
        '#42a5f5bb',
        '#757575bb',
        '#ef5350bb',
        '#66bb6abb'
      ],
      hoverBackgroundColor: [ //500
        '#bdbdbdbb',
        '#2196f3bb',
        '#616161bb',
        '#f44336bb',
        '#4caf50bb'
      ],
      hoverBorderColor: [ //600
        '#9e9e9ebb',
        '#1e88e5bb',
        '#424242bb',
        '#e53935bb',
        '#43a047bb'
      ],
      borderWidth: 1,
      label: 'Series A'
    }];
  }

  public loadColorRatingData() {
    this.colorRatingChartData = {
      labels: [ 'W', 'U', 'B', 'R', 'G' ],
      datasets: [
        {
          data: [
            this.color_ratings.W,
            this.color_ratings.U,
            this.color_ratings.B,
            this.color_ratings.R,
            this.color_ratings.G
          ],
          backgroundColor: [ //300
            '#eeeeeebb',
            '#64b5f6bb',
            '#9e9e9ebb',
            '#e57373bb',
            '#81c784bb'
          ],
          borderColor: [ //400
            '#e0e0e0bb',
            '#42a5f5bb',
            '#757575bb',
            '#ef5350bb',
            '#66bb6abb'
          ],
          hoverBackgroundColor: [ //500
            '#bdbdbdbb',
            '#2196f3bb',
            '#616161bb',
            '#f44336bb',
            '#4caf50bb'
          ],
          hoverBorderColor: [ //600
            '#9e9e9ebb',
            '#1e88e5bb',
            '#424242bb',
            '#e53935bb',
            '#43a047bb'
          ],
          borderWidth: 1,
          label: 'Fun to Play' }
      ]
    };
    this.colorRatingChartOptions = {
      responsive: false,
      plugins: {
        title: {
          display: false,
          text: 'Average Rating By Color',
          color: this.user.theme === "light" ? 'rgb(100, 100, 100)':  'rgb(198, 198, 198)'
        },
        legend: {
          labels: {
            color: this.user.theme === "light" ? 'rgb(100, 100, 100)': 'rgb(198, 198, 198)'
          }
        },

      },
      scales: {
        y: {
          ticks: {
            color: this.user.theme === "light" ? 'rgb(100, 100, 100)': 'rgb(198, 198, 198)'
          }
        },
        x: {
          ticks: {
            color: this.user.theme === "light" ? 'rgb(100, 100, 100)': 'rgb(198, 198, 198)'
          }
        }
      }
    };
  }

}
