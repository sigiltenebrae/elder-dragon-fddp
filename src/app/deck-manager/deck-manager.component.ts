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

  ban_types: any[] = [];
  ban_list: any[] = [];

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

            this.fddp_data.getBanList().then((banned_cards: any) => {
              this.fddp_data.getBanTypes().then((ban_types) => {
                this.ban_types = ban_types;
                this.ban_list = [[], [], [], []];
                banned_cards.forEach((card: any) => {
                  this.ban_list[card.ban_type - 1].push(card);
                });

                let legality_promises = [];
                for (let deck of this.decks) {
                  deck.hovered = false;
                  legality_promises.push(this.getDeckLegality(deck));
                  Promise.all(legality_promises).then(() => {
                    console.log('Decks loaded for user: ' + this.user.username);
                  });
                }
                this.fddp_data.getUsers().then((user_list: any) => {
                  this.users = user_list;
                  this.loading = false;
                });

              });
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
        let legality_promises = [];
        for (let key in this.decks_others) {
          for (let other_deck of this.decks_others[key]) {
            other_deck.hovered = false;
            legality_promises.push(this.getDeckLegality(other_deck));
          }
          Promise.all(legality_promises).then(() => {
            this.loading_others = false;
            this.loaded_others = true;
          });
        }
      })
    })
  }

  /**
   * Get the necessary data to display the deck.
   * @param deckid
   */
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

  /**
   * Get the color identity for a deck
   * @param deck
   */
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

  getBanId(ban_type: string){
    for (let type of this.ban_types) {
      if (ban_type === type.type) {
        return type.id;
      }
    }
  }

  getDeckLegality(deck: any) {
    return new Promise<void>((resolve) => {
      if (deck.cards == null || deck.cards.length == 0) {
        deck.legality = 'unknown';
        deck.issues = [];
      }
      else {
        let banned_cards = [];
        deck.cards.forEach((card: any) => {
          for (let banned_card of this.ban_list[this.getBanId("banned") - 1]) {
            if (card.name === banned_card.name) {
              banned_cards.push({name: card.name, gatherer: card.gatherer});
              break;
            }
          }
          if (!card.legality) {
            let card_allowed = false;
            if (card.iscommander) {
              for (let unbanned_commander of this.ban_list[this.getBanId("allowed as commander") - 1]) {
                if (card.name === unbanned_commander.name) {
                  card_allowed = true;
                  break;
                }
              }

            }
            if (!card_allowed) {
              for (let unbanned_card of this.ban_list[this.getBanId("unbanned") - 1]) {
                if (card.name === unbanned_card.name) {
                  card_allowed = true;
                  break;
                }
              }
            }
            if (!card_allowed) {
              banned_cards.push({name: card.name, gatherer: card.gatherer});
            }
          }
        });
        deck.legality = banned_cards.length > 0 ? "illegal": "legal";
        deck.issues = banned_cards;
      }
      resolve();
    })
  }
}
