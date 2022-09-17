import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";

@Component({
  selector: 'app-deck-manager',
  templateUrl: './deck-manager.component.html',
  styleUrls: ['./deck-manager.component.scss']
})
export class DeckManagerComponent implements OnInit {
  user: any = null;
  loading = false;
  decks: any[] = [];

  temp = false;

  constructor(private fddp_data: FddpApiService, private tokenStorage: TokenStorageService) { }

  ngOnInit(): void {
    this.loading = true;
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
          this.loading = false;
        });
      });
    }
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
        this.decks.push(deck);
        resolve();
      })
    })
  }

  getDeckColors(deck: any) {
    let colors: any = null;
    for (let commander of deck.commander) {
      if (commander.mana_cost) {
        if (colors == null) {
          colors = [];
        }
        for (let mana of commander.mana_cost) {
          if (mana === 'W' || mana === 'U' || mana === 'B' || mana === 'R' || mana === 'G'){
            colors.push(mana);
          }
        }
        if (commander.back_mana_cost) {
          for (let mana of commander.back_mana_cost) {
            if (mana === 'W' || mana === 'U' || mana === 'B' || mana === 'R' || mana === 'G'){
              colors.push(mana);
            }
          }
        }
      }
    }
    return colors;
  }

}
