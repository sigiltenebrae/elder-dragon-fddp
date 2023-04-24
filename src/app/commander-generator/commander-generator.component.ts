import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";
import {debounceTime, distinctUntilChanged, Observable, OperatorFunction, switchMap, tap} from "rxjs";

@Component({
  selector: 'app-commander-generator',
  templateUrl: './commander-generator.component.html',
  styleUrls: ['./commander-generator.component.scss']
})
export class CommanderGeneratorComponent implements OnInit {

  generated = false;
  color_w = false;
  color_u = false;
  color_b = false;
  color_r = false;
  color_g = false;
  commanders: any = null;
  commander_themes: any[] = [];

  users: any = null;
  user: any = null;

  loading_recs = false;
  all_recs: any[] = [];
  recs: any[] = [];
  cmdr_list = [];

  commander_search = null;

  constructor(private fddp_data: FddpApiService,  private tokenStorage: TokenStorageService, private router: Router) { }

  searching = false;
  /**
   * OperatorFunction for Scryfall autocomplete on typeahead.
   * @param text$ string to autocomplete
   */
    // @ts-ignore
  public card_search: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.searching = true),
      // @ts-ignore
      switchMap(async term => {
        this.searching = true;
        return await this.fddp_data.autocompleteCard(term);
      }),
      tap(() => {
        this.searching = false;
      }));

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.loading_recs = true;
      this.fddp_data.getUsers().then((users) => {
        this.users = users;
        for (let user of this.users) {
          if (user.id == this.tokenStorage.getUser().id) {
            this.user = user;
            this.calculateRecommendations(this.user).then(() => {
              this.loading_recs = false;
            });
          }
        }
      })
    }
  }

  calculateRecommendations(rec_user) {
    return new Promise<void>((resolve) => {
      this.fddp_data.getCommanders(rec_user.id).then((cmdr_data) => {
        this.cmdr_list = cmdr_data;
        if (rec_user.recs && rec_user.recs.length) {
          this.all_recs = [];
          this.recs = [];
          let rec_promises = [];
          for (let i = 0; i < rec_user.recs.length; i++) {
            if (i == 30) {
              break;
            }
            if (rec_user.recs[i].name) {
              rec_promises.push(
                new Promise((resolve) => {
                  this.fddp_data.getCardInfo(rec_user.recs[i].name).then((card_data) => {
                    card_data.image = card_data.default_image;
                    card_data.count = rec_user.recs[i].count;
                    resolve(card_data);
                  });
                }));
            }
          }
          Promise.all(rec_promises).then((rec_list) => {
            this.all_recs = rec_list;
            for (let j = 0; j < this.all_recs.length; j++) {
              if (this.recs.length == 5) {
                break;
              }
              if (this.all_recs[j].oracle_text.includes("Partner") && !this.all_recs[j].oracle_text.includes("Partner with")) {
                let k = 1;
                while(j + k < this.all_recs.length) {
                  if (this.all_recs[j + k].oracle_text.includes("Partner") && !this.all_recs[j + k].oracle_text.includes("Partner with")) {
                    this.recs.push([this.all_recs[j], this.all_recs[j + k]]);
                    this.all_recs.splice(j + k, 1);
                    k = -1;
                    break;
                  }
                  k++;
                }
                if (j + k == this.all_recs.length) {
                  this.recs.push([this.all_recs[j]]);
                }
              }
              else {
                this.recs.push([this.all_recs[j]]);
              }
            }
            resolve();
          })
        }
        else{
          resolve();
        }
      });
    })
  }

  checkCompatibility() {
    if (this.commander_search != null) {
      let ind = -1;
      let neg_ind = -1;
      for (let i = 0; i < this.user.recs.length; i++) {
        if (this.user.recs[i].name === this.commander_search) {
          ind = i;
        }
        if (neg_ind < 0 && this.user.recs[i].count <= 0) {
          neg_ind = i;
        }
      }

      if (ind < neg_ind) {
        let compat = ((neg_ind - (ind)) / neg_ind)
        if (ind< 0) {
          console.log('There is a 0% chance of you liking it.')
        }
        else {
          console.log('There is a ' + Math.floor(compat * 100) + '% chance of you liking it.')
        }

      }
      else {
        console.log(ind);
        console.log('Card is too popular!');
      }
    }
  }

  generateCommander() {
    let colors = [];
    if (this.color_w){ colors.push('W'); }
    if (this.color_u){ colors.push('U'); }
    if (this.color_b){ colors.push('B'); }
    if (this.color_r){ colors.push('R'); }
    if (this.color_g){ colors.push('G'); }
    this.fddp_data.getRandomCommander(colors).then((cmdr_data) => {
      this.commanders = cmdr_data;
      this.fddp_data.getEdhrecCommanderThemes(this.commanders[0].name, this.commanders[1] != null? this.commanders[1].name: null).then((theme_data: any) => {
        if (theme_data && theme_data.length) {
          if (theme_data.length > 3) {
            this.commander_themes = theme_data.slice(0, 3);
          }
          else {
            this.commander_themes = theme_data;
          }
        }
      });
      this.generated = true;
    })
  }

}
