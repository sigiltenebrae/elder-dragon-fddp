import {Component, OnInit, ViewChild} from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-deck-manager',
  templateUrl: './deck-manager.component.html',
  styleUrls: ['./deck-manager.component.scss'],
  animations: [
    trigger('flipState', [
      state('true', style({
        transform: 'rotateY(179deg)'
      })),
      state('false', style({
        transform: 'rotateY(0)'
      })),
      transition('true => false', animate('500ms ease-out')),
      transition('false => true', animate('500ms ease-in'))
    ])
  ]
})
export class DeckManagerComponent implements OnInit {
  menuTopLeftPosition =  {x: '0', y: '0'}

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

  calculate = false;
  calculate_others = false;

  themes = [];
  tribes = [];

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
        this.fddp_data.getThemes().then((theme_data) => {
          this.themes = theme_data.themes;
          this.tribes = theme_data.tribes;
          this.fddp_data.getUsers().then((user_list: any) => {
            this.users = user_list;
            this.fddp_data.getDecksBasic(this.user.id).then((decks: any) => {
              this.decks = decks;
              this.loading = false;
              this.fddp_data.getDecksBasic().then((other_decks: any) => {

                for (let other of this.users) {
                  if (other.id != this.user.id) {
                    this.decks_others[other.id] = [];
                  }
                }
                other_decks.forEach((deck: any) => {
                  if (deck.owner !== this.user.id && deck.active) {
                    this.decks_others[deck.owner].push(deck);
                  }
                });
                this.loading_others = false;
                this.loaded_others = true;

                for (let deck of this.decks) {
                  deck.hovered = false;
                  deck.flipped = false;
                }
                for (let key in this.decks_others) {
                  for (let other_deck of this.decks_others[key]) {
                    other_deck.hovered = false;
                    other_deck.flipped = false;
                  }
                }
                this.show_others = true;
              });
            });
          });
        });
      }
    }
  }

  showOthers() {
    this.show_others = true;
  }

  calculateLegality() {
    this.calculate = true;
    for (let deck of this.decks) {
      deck.hovered = false;
      this.fddp_data.getDeckLegality(deck.id).then((issues) => {
        deck.issues = issues;
      });
    }
  }

  calculateLegalityOthers() {
    this.calculate_others = true;
    for (let key in this.decks_others) {
      for (let other_deck of this.decks_others[key]) {
        other_deck.hovered = false;
        this.fddp_data.getDeckLegality(other_deck.id).then((issues) => {
          other_deck.issues = issues;
        });
      }
    }
  }

  getTheme(id) {
    for (let theme of this.themes) {
      if (theme.id === id) {
        return theme;
      }
    }
    return null;
  }

  getTribe(id) {
    for (let tribe of this.tribes) {
      if (tribe.id === id) {
        return tribe;
      }
    }
    return null;
  }

  toggleFlip(deck) {
    deck.flipped = !deck.flipped;
  }

  isAdmin() {
    return this.tokenStorage.getUser().isAdmin;
  }
}
