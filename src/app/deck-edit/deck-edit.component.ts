import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Component, Inject, OnInit} from '@angular/core';
import { debounceTime, distinctUntilChanged, map, Observable, OperatorFunction, startWith, switchMap, tap } from "rxjs";
import { FormControl } from "@angular/forms";
import { FddpApiService } from "../../services/fddp-api.service";
import * as Scry from "scryfall-sdk";
import {ActivatedRoute, Router} from "@angular/router";
import {TokenStorageService} from "../../services/token-storage.service";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {CustomTokenDialog} from "../custom-images/custom-images.component";
import {MatChipInputEvent} from "@angular/material/chips";

@Component({
  selector: 'app-deck-edit',
  templateUrl: './deck-edit.component.html',
  styleUrls: ['./deck-edit.component.scss']
})
export class DeckEditComponent implements OnInit {
  readonly  seperatorKeysCodes = [ENTER, COMMA] as const;

  temp_theme: any = null;
  temp_tribe: any = null;

  loading = false;
  users: any = []
  current_user: any = null;

  deckid = -1;
  deck: any = null;
  selected_card: any = null;
  changing_image = false;
  changing_back_image = false;
  image_options: any[] = [];
  token_options: any[] = [];
  back_image_options: any[] = [];
  new_card_temp: any = null;
  new_token_temp = '';
  deleting = false;
  card_type = 'cards';

  commanders = [];
  notcommanders = [];

  image_sort = "";
  available_sets = [];
  selected_set = "";

  themes = [];
  tribes = [];

  constructor(private fddp_data: FddpApiService, private route: ActivatedRoute, private router: Router, private tokenStorage: TokenStorageService, public dialog: MatDialog) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.fddp_data.getUsers().then((users: any) => {
        this.users = users;
      });
      const routeParams = this.route.snapshot.paramMap;
      this.deckid = Number(routeParams.get('deckid'));
      this.current_user = this.tokenStorage.getUser();
      if (this.deckid == -1) {
        this.deck = {};
        this.deck.id = this.deckid;
        this.deck.name = '';
        this.deck.image = '';
        this.deck.sleeves = '';
        this.deck.link = '';
        this.deck.rating = 3;
        this.deck.cards = [];
        this.deck.tokens = [];
        this.deck.owner = this.current_user.id;
      }
      else if (this.deckid < 0) {
        this.router.navigate(['/']);
      }
      else {
        this.fddp_data.getThemes().then((theme_data) => {
          this.themes = theme_data.themes;
          this.tribes = theme_data.tribes;
          this.fddp_data.getDeckForPlay(this.deckid).then((deck) => {
            this.deck = deck;
            console.log(deck);
            this.deck.delete = [];
            this.deck.token_delete = [];
            this.deck.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
            this.deck.tokens.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
            this.getCommanders();
          });
        });
      }
    }
  }


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
        return await Scry.Cards.autoCompleteName(term);
      }),
      tap(() => {
        this.searching = false;
      }));

  getCommanders() {
    this.commanders = [];
    this.notcommanders = [];
    for (let card of this.deck.cards) {
      if (card.iscommander) {
        this.commanders.push(card);
      }
      else {
        this.notcommanders.push(card);
      }
    }
  }

  syncWithArchidekt() {
    if (this.deck.link) {
      let archidekt_deckid = this.deck.link.indexOf('#') > 0 ?
        this.deck.link.substring(0, this.deck.link.indexOf('#')).substring(this.deck.link.indexOf('/decks/') + 7):
        this.deck.link.substring(this.deck.link.indexOf('/decks/') + 7);
      this.fddp_data.getArchidektDeck(archidekt_deckid).then((archidekt_deck: any) => {
        if (archidekt_deck) {
          this.deck.name = archidekt_deck.name;
          for (let card of archidekt_deck.cards) {
            let iscommander = false;
            if (card.categories.includes('Commander')){
              iscommander = true;
            }
            if (!this.hasCard(card.card.oracleCard.name)) {
              this.deck.cards.push(
                {
                  name: card.card.oracleCard.name,
                  image: '',
                  back_image: null,
                  count: card.quantity,
                  iscommander: iscommander
                });
            }
            else {
              this.getCard(card.card.oracleCard.name).count = card.quantity;
            }
          }
          let remove_cards: any[] = [];
          for (let card of this.deck.cards) {
            if (this.removeCard(card.name, archidekt_deck.cards)) {
              remove_cards.push(card);
            }
          }
          remove_cards.forEach((card: any) => {
            this.deck.cards.splice(this.deck.cards.indexOf(card), 1);
          });
          this.deck.delete = remove_cards;
        }
        this.deck.cards.forEach((card: any) => {
          if (card.image === '' || card.image == null) {
            this.getCardImage(card).then(() => {
              if (card.iscommander) {
                if (this.deck.image === '' || this.deck.image == null) {
                  this.deck.image = card.image;
                }
              }
            });
          }
        });
        this.deck.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
        let token_promises: any[] = [];
        this.deck.cards.forEach((card: any) => {
          token_promises.push(this.getTokens(card));
        });
        Promise.all(token_promises).then(() => {
          this.deck.tokens.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
        });
      });
    }
  }

  getTokens(card: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getCardInfo(card.name).then((card_info: any) => {
        if (card_info.tokens && card_info.tokens.length > 0) {
          card_info.tokens.forEach((token: any) => {
            if (!this.hasToken(token)) {
              this.deck.tokens.push(token);
            }
          });
        }
        resolve();
      });
    })
  }

  hasToken(token: any) {
    for (let tok of this.deck.tokens) {
      if (this.tokensEqual(tok, token)) {
        return true;
      }
    }
    return false;
  }

  hasCard(name: string): boolean {
    for (let card of this.deck.cards) {
      if (card.name === name) {
        return true;
      }
    }
    return false;
  }

  getCard(name: string) {
    for (let card of this.deck.cards) {
      if (card.name === name) {
        return card;
      }
    }
    return null;
  }

  removeCard(name: string, cards: any[]): boolean {
    for (let card of cards) {
      if (card.card.oracleCard.name === name) {
        return false;
      }
    }
    return true;
  }

  getCardImage(card: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getImagesForCard(card.name).then((card_image_data: any) => {
        let card_images = card_image_data.images;
        let card_back_images = card_image_data.back_images
        card.image = card_images && card_images.length > 0? card_images[card_images.length - 1].image: '';
        card.back_image = card_back_images && card_back_images.length > 0? card_back_images[card_back_images.length - 1].image: '';
        resolve();
      });
    });
  }

  tokensEqual(card1: any, card2: any): boolean {
    return card1.name.toLowerCase() === card2.name.toLowerCase() &&
      card1.oracle_text === card2.oracle_text &&
      card1.power === card2.power &&
      card1.toughness === card2.toughness &&
      card1.colors.includes("W") == card2.colors.includes("W") &&
      card1.colors.includes("U") == card2.colors.includes("U") &&
      card1.colors.includes("B") == card2.colors.includes("B") &&
      card1.colors.includes("R") == card2.colors.includes("R") &&
      card1.colors.includes("G") == card2.colors.includes("G")
  }


  async getCardImages(card: any) {
    this.available_sets = [];
    this.selected_set = "";
    if (this.card_type === 'tokens') {
      this.token_options = [];
      let token_data = await this.fddp_data.getAllOfToken(card.name);
      for (let token of token_data) {
        if (this.tokensEqual(card, token)) {
          token.visible = true;
          this.token_options.push(token);
          if (!this.available_sets.includes(token.set_name)) {
            this.available_sets.push(token.set_name);
          }
        }
      }
    }

    if (this.card_type === 'cards') {
      let image_data: any = await this.fddp_data.getImagesForCard(card.name);
      this.image_options = image_data.images;
      this.back_image_options = image_data.back_images;

      for (let card of this.image_options) {
        card.visible = true;
        if (!this.available_sets.includes(card.set_name)) {
          this.available_sets.push(card.set_name);
        }
      }
      for (let card of this.back_image_options) {
        card.visible = true;
      }
    }
    this.available_sets.sort((a: any, b: any) => (a > b) ? 1: -1);
  }

  sortImages() {
    if (this.image_sort === "dateasc") {
      this.image_options.sort((a: any, b: any) => (a.date > b.date) ? 1: -1);
      this.back_image_options.sort((a: any, b: any) => (a.date > b.date) ? 1: -1);
      this.token_options.sort((a: any, b: any) => (a.date > b.date) ? 1: -1);
    }
    else if (this.image_sort === "datedesc") {
      this.image_options.sort((a: any, b: any) => (a.date < b.date) ? 1: -1);
      this.back_image_options.sort((a: any, b: any) => (a.date < b.date) ? 1: -1);
      this.token_options.sort((a: any, b: any) => (a.date < b.date) ? 1: -1);
    }
  }

  selectSet() {
    for (let card of this.image_options) {
      card.visible = card.set_name === this.selected_set || this.selected_set === 'all';
    }
    for (let card of this.back_image_options) {
      card.visible = card.set_name === this.selected_set || this.selected_set === 'all';
    }
    for (let card of this.token_options) {
      card.visible = card.set_name === this.selected_set || this.selected_set === 'all';
    }
  }

  copyToSelected(card: any) {
    this.selected_card.name = card.name;
    this.selected_card.image = card.image;
    this.selected_card.types = card.types;
    this.selected_card.power = card.power;
    this.selected_card.toughness = card.toughness;
    this.selected_card.oracle_text = card.oracle_text;
    this.selected_card.colors = card.colors;
    console.log(this.selected_card);
  }

  resetCard(card:any) {
    card.image = null;
    card.back_image = null;
    this.getCardImage(card).then(() => {
    });
  }

  addCardToDeck() {
    if (this.new_card_temp) {
      for (let card of this.deck.cards) {
        if (card.name === this.new_card_temp) {
          card.count++;
          this.new_card_temp = null;
          return;
        }
      }
      let temp_card = {
        name: this.new_card_temp,
        image: '',
        count: 1,
        iscommander: false
      }
      this.deck.cards.push(
        temp_card
      );
      this.deck.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
      this.getCardImage(temp_card);
      this.new_card_temp = null;
    }
  }

  addTokenToDeck() {
    if (this.new_token_temp !== '') {
      this.fddp_data.getAllOfToken(this.new_token_temp).then((token_list) => {
        if (token_list.length > 0) {
          const tokDialogRef = this.dialog.open(TokenFinderDialog, {
            width: '800px',
            data: {tokens: token_list},
          });
          tokDialogRef.afterClosed().subscribe(result => {
            if (result) {
              this.deck.tokens.push(result);
            }
          })
        }
      })
    }
  }

  deleteToken(token: any) {
    this.deck.token_delete.push(token);
    this.deck.tokens.splice(this.deck.tokens.indexOf(token), 1);
  }

  getTotal(cards: any) {
    let count = 0;
    for (let card of cards) {
      count += card.count;
    }
    return count;
  }

  saveDeck() {
    if (this.deckid == -1) { //create
      this.fddp_data.createDeck(this.deck).then(() => {
        this.router.navigate(['/']);
      });
    }
    else {
      this.fddp_data.updateDeck(this.deck).then(() => {
        this.fddp_data.updateDeckThemes(this.deckid, this.deck.themes, this.deck.tribes).then(() => {
          this.router.navigate(['/']);
        });
      });
    }
  }

  deleteDeck() {
    this.fddp_data.deleteDeck(this.deck.id).then(() => {
      this.router.navigate(['/']);
    });
  }

  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    if (item.type && item.type !== 'none') {
      if (item.type == 'card_count') {
        item.card.count--;
        if (item.card.count == 0) {
          this.deck.delete.push(item.card);
          this.deck.cards.splice(this.deck.cards.indexOf(item.card), 1);
        }
      }
    }
  }

  /**
   * OperatorFunction for theme autocomplete on a typeahead
   * @param text$ string to autocomplete
   */
  public theme_search: OperatorFunction<string, readonly {id: number, name: string}[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      map(term => term === '' ? this.themes
        : this.themes.filter(v => v.name.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    );

  public theme_formatter = (x: {name: string}) => x.name;


  /**
   * OperatorFunction for tribe autocomplete on a typeahead
   * @param text$ string to autocomplete
   */
  public tribe_search: OperatorFunction<string, readonly {id: number, name: string}[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      map(term => term === '' ? this.tribes
        : this.tribes.filter(v => v.name.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    );

  public tribe_formatter = (x: {name: string}) => x.name;

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

  /**
   * Adds theme to the deck's theme list
   * @param event detects a chip create event to add it to the list
   */
  public addTheme(event: MatChipInputEvent): void {
    if (this.temp_theme) {
      const value = (event.value || '').trim();
      if (value) {
        this.deck.themes.push({name: value, theme_id: this.temp_theme.id, url: this.temp_theme.url});
      }
      event.chipInput!.clear();
    }
  }

  /**
   * Adds theme to the deck's tribe list
   * @param event detects a chip create event to add it to the list
   */
  public addTribe(event: MatChipInputEvent): void {
    if (this.temp_tribe) {
      const value = (event.value || '').trim();
      if (value) {
        this.deck.tribes.push({name: value, tribe_id: this.temp_tribe.id, url: this.temp_tribe.url});
      }
      event.chipInput!.clear();
    }
  }

  public removeTheme(theme: any): void {
    const index = this.deck.themes.indexOf(theme);
    if (index > -1) {
      this.deck.themes.splice(index, 1);
    }
  }

  public removeTribe(theme: any): void {
    const index = this.deck.tribes.indexOf(theme);
    if (index > -1) {
      this.deck.tribes.splice(index, 1);
    }
  }

}



@Component({
  selector: 'token-finder-dialog',
  templateUrl: 'token-finder-dialog.html',
})
export class TokenFinderDialog {
  constructor(
    public dialogRef: MatDialogRef<TokenFinderDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  tokens: any[] = this.data.tokens;

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  selectToken(res: any) {
    this.dialogRef.close(res);
  }
}
