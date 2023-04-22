import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";

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
  recs: any[] = [];

  constructor(private fddp_data: FddpApiService,  private tokenStorage: TokenStorageService) { }

  ngOnInit(): void {
    this.fddp_data.getUsers().then((users) => {
      this.users = users;
      for (let user of this.users) {
        if (user.id == this.tokenStorage.getUser().id) {
          this.user = user;
          if (this.user.recs && this.user.recs.length) {
            let rec_promises = [];
            for (let i = 0; i < this.user.recs.length; i++) {
              if (i == 3) {
                break;
              }
              if (this.user.recs[i].name) {
                rec_promises.push(
                  new Promise((resolve) => {
                    this.fddp_data.getCardInfo(this.user.recs[i].name).then((card_data) => {
                      this.fddp_data.getImagesForCard(this.user.recs[i].name).then((card_images:any) => {
                        if (card_images && card_images.images && card_images.images.length) {
                          card_data.image = card_images.images[card_images.images.length - 1].image;
                          resolve(card_data);
                        }
                      })
                    })
                  }));
              }
            }
            Promise.all(rec_promises).then((rec_list) => {
              this.recs = rec_list;
            })
          }
          break;
        }
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
