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

  current_sort = "Name";
  current_sort_direction = "asc";
  sort_options = [
    "Name",
    "Last Modified",
  ];


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

  isAdmin() {
    return this.tokenStorage.getUser().isAdmin;
  }

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
            this.users.forEach((user: any) => {
              user.visible = true;
            })
            this.fddp_data.getDecksBasic(this.user.id).then((decks: any) => {
              this.decks = decks;
              this.loading = false;
              this.sortDecks();
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
                this.sortDecks();
              });
            });
          });
        });
      }
    }
  }

  /**
   * Helper function to determine if the user should see their own decks
   */
  userVisible() {
    for (let ouser of this.users) {
      if (ouser.id == this.user.id) {
        return ouser.visible;
      }
    }
    return true;
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

  /**
   * Helper function to flip over the deck display
   * @param deck
   */
  toggleFlip(deck) {
    deck.flipped = !deck.flipped;
  }

  /**
   * sort decks based on the current sort filters
   */
  sortDecks() {
    switch (this.current_sort) {
      case "Name":
        this.decks.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
        for(let other_user of this.users) {
          if (other_user.id != this.user.id && this.decks_others[other_user.id]) {
            this.decks_others[other_user.id].sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
          }
        }
        break;
      case "Last Modified":
        this.decks.sort((a: any, b: any) => (a.modified > b.modified) ? -1: 1);
        for(let other_user of this.users ) {
          if (other_user.id != this.user.id && this.decks_others[other_user.id]) {
            this.decks_others[other_user.id].sort((a: any, b: any) => (a.modified > b.modified) ? -1: 1);
          }
        }
        break;
    }
    if (this.current_sort_direction === 'desc') {
      this.decks.reverse();
      for(let other_user of this.users) {
        if (other_user.id != this.user.id && this.decks_others[other_user.id]) {
          this.decks_others[other_user.id].reverse;
        }
      }
    }
  }
}
