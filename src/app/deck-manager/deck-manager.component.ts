import {Component, OnInit, ViewChild} from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";
import {MatMenuTrigger} from "@angular/material/menu";

@Component({
  selector: 'app-deck-manager',
  templateUrl: './deck-manager.component.html',
  styleUrls: ['./deck-manager.component.scss']
})
export class DeckManagerComponent implements OnInit {
  user: any = null;
  loading = false;
  decks: any[] = [];

  users: any = null;
  loading_others = false;
  loaded_others = false;
  decks_others: any = {};
  show_others: boolean = false;

  temp = false;

  current_errors = [];

  constructor(private fddp_data: FddpApiService, private tokenStorage: TokenStorageService, private router: Router) { }

  ngOnInit(): void {
    this.loading = true;
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.user = this.tokenStorage.getUser()
      this.decks = [];
      if(this.user && this.user.id) {
        this.fddp_data.getUsers().then((user_list: any) => {
          this.users = user_list;


          this.fddp_data.getDecksBasic(this.user.id).then((decks: any) => {
            this.decks = decks;
            this.loading = false;
            this.fddp_data.getDecksBasic().then((decks: any) => {

              for (let other of this.users) {
                if (other.id != this.user.id) {
                  this.decks_others[other.id] = [];
                }
              }
              decks.forEach((deck: any) => {
                if (deck.owner !== this.user.id) {
                  this.decks_others[deck.owner].push(deck);
                }
              });
              this.loading_others = false;
              this.loaded_others = true;

              for (let deck of this.decks) {
                deck.hovered = false;
                this.fddp_data.getDeckLegality(deck.id).then((issues) => {
                  deck.issues = issues;
                });
              }
              for (let key in this.decks_others) {
                for (let other_deck of this.decks_others[key]) {
                  other_deck.hovered = false;
                  this.fddp_data.getDeckLegality(other_deck.id).then((issues) => {
                    other_deck.issues = issues;
                  });
                }
              }
            });
          });
        });
      }
    }
  }

  showOthers() {
    this.show_others = true;
  }

  getOthers() {
    this.loading_others = true;
    for (let other of this.users) {
      if (other.id != this.user.id) {
        this.decks_others[other.id] = [];
      }
    }
    this.fddp_data.getDecksBasic().then((decks: any) => {
      decks.forEach((deck: any) => {
        if (deck.owner !== this.user.id) {
          this.decks_others[deck.owner].push(deck);
        }
      });
      this.loading_others = false;
      this.loaded_others = true;


    })
  }
}
