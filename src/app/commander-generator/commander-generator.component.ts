import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";

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

  constructor(private fddp_data: FddpApiService,  private tokenStorage: TokenStorageService, private router: Router) { }

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
          console.log(this.all_recs);
          resolve();
        })
      }
      else{
        resolve();
      }
    })
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
