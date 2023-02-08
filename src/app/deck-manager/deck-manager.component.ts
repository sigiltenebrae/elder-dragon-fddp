import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";

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

  temp = false;

  constructor(private fddp_data: FddpApiService, private tokenStorage: TokenStorageService, private router: Router) { }

  ngOnInit(): void {
    this.loading = true;
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.user = this.tokenStorage.getUser();
      if(this.user && this.user.id) {
        this.fddp_data.getDecksBasic(this.user.id).then((decks: any) => {
          let temp_decks = decks;
          let deck_promises: any[] = [];
          temp_decks.forEach((deck: any) => {
            deck_promises.push(this.getDeckData(deck.id));
          });
          Promise.all(deck_promises).then(() => {
            for (let deck of this.decks) {
              deck.hovered = false;
            }
            this.fddp_data.getUsers().then((user_list: any) => {
              this.users = user_list;
              this.loading = false;
            });
          });
        });
      }
    }
  }

  getOthers() {
    this.loading_others = true;
    for (let other of this.users) {
      if (other.id != this.user.id) {
        this.decks_others[other.id] = [];
      }
    }

    this.fddp_data.getDecksBasic().then((decks: any) => {
      let temp_decks = decks;
      let deck_promises: any[] = [];
      temp_decks.forEach((deck: any) => {
        if (deck.owner !== this.user.id) {
          deck_promises.push(this.getDeckData(deck.id));
        }
      });
      Promise.all(deck_promises).then(() => {
        for (let key in this.decks_others) {
          for (let other_deck of this.decks_others[key]) {
            other_deck.hovered = false;
          }
        }
        this.loading_others = false;
        this.loaded_others = true;
        console.log(this.decks_others);
      })
    })
  }

  getDeckData(deckid: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getDeckForPlay(deckid).then((deck) => {
        deck.commander = [];
        deck.cards.forEach((card: any) => {
          if (card.iscommander) {
            deck.commander.push(card);
          }
        });
        deck.commander.forEach((card: any) => {
          deck.cards.splice(deck.cards.indexOf(card), 1);
        });
        deck.colors = this.getDeckColors(deck);
        if (deck.owner == this.user.id) {
          this.decks.push(deck);
        }
        else {
          this.decks_others[deck.owner].push(deck);
        }
        resolve();
      })
    })
  }

  getDeckColors(deck: any) {
    let colors: any = null;
    for (let commander of deck.commander) {
      if (commander.color_identity) {
        if (colors == null) {
          colors = [];
        }
        for (let mana of commander.color_identity) {
          if (mana === 'W' || mana === 'U' || mana === 'B' || mana === 'R' || mana === 'G'){
            colors.push(mana);
          }
        }
      }
    }
    return colors;
  }

}
