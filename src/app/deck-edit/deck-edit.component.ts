import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Component, Inject, OnInit} from '@angular/core';
import {debounceTime, distinctUntilChanged, map, Observable, OperatorFunction, switchMap, tap} from "rxjs";
import {FddpApiService} from "../../services/fddp-api.service";
import {ActivatedRoute, Router} from "@angular/router";
import {TokenStorageService} from "../../services/token-storage.service";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {MatChipInputEvent} from "@angular/material/chips";

@Component({
  selector: 'app-deck-edit',
  templateUrl: './deck-edit.component.html',
  styleUrls: ['./deck-edit.component.scss']
})
export class DeckEditComponent implements OnInit {
  readonly  seperatorKeysCodes = [ENTER, COMMA] as const;
  default_card_back = 'https://drive.google.com/uc?export=view&id=1-Hp4xnjvn6EU-khUQEHn4R0T7n46Pt84';

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

  syncing = false;
  saving = false;
  setting_default = false;

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
        this.fddp_data.getThemes().then((theme_data) => {
          this.themes = theme_data.themes;
          this.tribes = theme_data.tribes;
          this.deck = {};
          this.deck.active = true;
          this.deck.id = this.deckid;
          this.deck.name = '';
          this.deck.image = '';
          this.deck.sleeves = '';
          this.deck.link = '';
          this.deck.rating = 3;
          this.deck.cards = [];
          this.deck.tokens = [];
          this.deck.sideboard = [];
          this.deck.companions = [];
          this.deck.contraptions = [];
          this.deck.attractions = [];
          this.deck.stickers = [];
          this.deck.themes = [];
          this.deck.tribes = [];
          this.deck.owner = this.current_user.id;
        });
      }
      else if (this.deckid < 0) {
        this.router.navigate(['/']);
      }
      else {
        this.loading = true;
        this.fddp_data.getThemes().then((theme_data) => {
          this.themes = theme_data.themes;
          this.tribes = theme_data.tribes;
          this.fddp_data.getDeckForPlay(this.deckid).then((deck) => {
            this.deck = deck;
            this.deck.delete_cards = [];
            this.deck.delete_tokens = [];
            this.deck.delete_sideboard = [];
            this.deck.delete_companions = [];
            this.deck.delete_contraptions = [];
            this.deck.delete_attractions = [];
            this.deck.delete_stickers = [];
            this.deck.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
            this.deck.cards.sort((a: any, b: any) => (a.iscommander < b.iscommander) ? 1: -1);
            this.deck.tokens.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
            this.deck.sideboard.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
            this.deck.companions.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
            this.deck.contraptions.forEach((card: any) => card.count = 1);
            this.deck.attractions.forEach((card: any) => card.count = 1);
            this.deck.stickers.forEach((card: any) => card.count = 1);
            this.getCommanders();
            this.loading = false;
          });
        });
      }
    }
  }

  public getViewHeight() {
    return window.innerHeight;
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
        return await this.fddp_data.autocompleteCard(term);
      }),
      tap(() => {
        this.searching = false;
      }));

  /**
   * Helper function for viewing the deck if you aren't the owner. Pulls out the commanders to display at the top.
   */
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


  deckSync() {
    if (this.deck.link.toLowerCase().includes('archidekt')) {
      this.syncDeck('archidekt');
    }
    else if (this.deck.link.toLowerCase().includes('moxfield')) {
      this.syncDeck('moxfield');
    }
  }

  /**
   *
   * @param type Accepts 'Moxfield' or 'Archidekt'
   */
  syncDeck(type: string) {
    if (this.deck.link && !this.saving) {
      this.syncing = true;
      let deck_promise = null;
      if (type === 'archidekt') {
        let archidekt_deckid = this.deck.link.indexOf('#') > 0 ?
          this.deck.link.substring(0, this.deck.link.indexOf('#')).substring(this.deck.link.indexOf('/decks/') + 7):
          this.deck.link.substring(this.deck.link.indexOf('/decks/') + 7);
        archidekt_deckid = archidekt_deckid.substring(0, archidekt_deckid.indexOf('/'));
        deck_promise = this.fddp_data.getArchidektDeck(archidekt_deckid);
      }
      else if (type === 'moxfield') {
        let moxfield_id = this.deck.link.substring(this.deck.link.indexOf('/decks/') + 7);
        deck_promise = this.fddp_data.getMoxfieldDeck(moxfield_id);
      }
      if (deck_promise) {
        deck_promise.then((deck_data: any) => {
          if (deck_data) {
            this.deck.name = deck_data.name;
            if (type === 'archidekt') {
              for (let card of deck_data.cards) {
                if (!card.categories.includes("Maybeboard")) {
                  let card_cat = null;
                  //if (card.categories.includes("Commander")){ card_cat = 'commanders'; }
                  if (card.categories.includes("Companion")) { card_cat = 'companions'; }
                  else if (card.categories.includes("Sideboard")) { card_cat = 'sideboard'; }
                  else if (card.categories.includes("Contraption")) { card_cat = 'contraptions'; }
                  else if (card.categories.includes("Attraction")) { card_cat = 'attractions'; }
                  else if (card.categories.includes("Stickers")) { card_cat = 'stickers'; }
                  if (card_cat == null) { card_cat = 'cards'; }
                  if (!this.hasCard(card.card.oracleCard.name, this.deck[card_cat])) {
                    this.deck[card_cat].push(
                      {
                        name: card.card.oracleCard.name,
                        image: '',
                        back_image: null,
                        count: card.quantity,
                        iscommander: card_cat === 'cards' && card.categories.includes("Commander")
                      });
                  }
                  else {
                    this.getCard(card.card.oracleCard.name, this.deck[card_cat]).count = card.quantity;
                  }
                }
              }
            }
            else if (type === 'moxfield') {
              for (let zone of ['commanders', 'companions', 'mainboard', 'sideboard', 'contraptions', 'attractions', 'stickers']) {
                let add_zone = zone === 'commanders' || zone === 'mainboard'? 'cards': zone;
                if (Object.entries(deck_data.boards[zone].cards)) {
                  for (let [key, value] of Object.entries(deck_data.boards[zone].cards)) {
                    if (key !== "count") {
                      let card:any = value;
                      if (!this.hasCard(card.card.name, this.deck[add_zone])) {
                        this.deck[add_zone].push(
                          {
                            name: card.card.name,
                            image: '',
                            back_image: '',
                            count: card.quantity != null? card.quantity: 1,
                            iscommander: zone === 'commanders'
                          }
                        );
                      }
                      else {
                        this.getCard(card.card.name, this.deck[add_zone]).count = card.quantity != null? card.quantity: 1;
                        this.getCard(card.card.name, this.deck[add_zone]).iscommander = zone === 'commanders';
                      }
                    }
                  }
                }
              }
            }
            let remove_cards: any = {};
            remove_cards.mainboard = [];
            remove_cards.sideboard = [];
            remove_cards.companions = [];
            remove_cards.contraptions = [];
            remove_cards.attractions = [];
            remove_cards.stickers = [];

            if (type === 'archidekt') {
              for (let zone of ['cards', 'companions', 'sideboard', 'contraptions', 'attractions', 'stickers']) {
                for (let card of this.deck[zone]) {
                  if (this.removeArchidektCard(card.name, deck_data.cards, zone)) {
                    remove_cards[zone !== 'cards'? zone: 'mainboard'].push(card);
                  }
                }
              }
            }
            else if (type === 'moxfield') {
              for (let zone of ['companions', 'mainboard', 'sideboard', 'contraptions', 'attractions', 'stickers']) {
                let add_zone = zone === 'mainboard'? 'cards': zone;
                for (let card of this.deck[add_zone]) {
                  if (this.removeMoxfieldCard(card.name, deck_data.boards[zone].cards)) {
                    if (zone !== 'mainboard' || this.removeMoxfieldCard(card.name, deck_data.boards.commanders.cards)) {
                      remove_cards[zone].push(card);
                    }
                  }
                }
              }
            }
            for (let zone of ['companions', 'mainboard', 'sideboard', 'contraptions', 'attractions', 'stickers']) {
              let add_zone = zone === 'mainboard'? 'cards': zone;
              remove_cards[zone].forEach((card: any) => {
                this.deck[add_zone].splice(this.deck[add_zone].indexOf(card), 1);
              });
              this.deck['delete_' + add_zone] = remove_cards[zone];
            }
            let card_image_promises = [];
            let token_promises = [];

            for (let zone of ['cards', 'companions', 'sideboard', 'contraptions', 'attractions', 'stickers']) {
              this.deck[zone].forEach((card: any) => {
                if (card.image === '' || card.image == null) {
                  card_image_promises.push(
                    new Promise<void>((resolve_image) => {
                      this.getCardImage(card).then(() => {
                        if (card.iscommander) {
                          if (this.deck.image === '' || this.deck.image == null) {
                            this.deck.image = card.image;
                          }
                        }
                        resolve_image();
                      });
                    }))
                  token_promises.push(this.getTokens(card));
                }
              })
            }

            Promise.all(card_image_promises).then(() => {
              Promise.all(token_promises).then(() => {
                for (let zone of ['cards', 'companions', 'sideboard', 'contraptions', 'attractions', 'stickers', 'tokens']) {
                  this.deck[zone].sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
                }
                this.deck.cards.sort((a: any, b: any) => (a.iscommander < b.iscommander) ? 1: -1);
                this.syncing = false;
              });
            });
          }
        });
      }
    }
  }

  /**
   * Checks to see if a card has tokens associated with it, and if so, adds them to the deck.
   * @param card card object to search with.
   */
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

  /**
   * Checks to see if the token object is already in the deck
   * @param token token object to compare
   */
  hasToken(token: any) {
    for (let tok of this.deck.tokens) {
      if (this.tokensEqual(tok, token)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks to see if the card is already in the deck
   * @param name string name of card to search
   * @param cards list of cards to search
   */
  hasCard(name: string, cards: any[]): boolean {
    for (let card of cards) {
      if (card.name === name) {
        return true;
      }
    }
    return false;
  }

  /**
   * Return the card object from the deck, or null if dne
   * @param name string name of card to search
   * @param cards the list to search
   */
  getCard(name: string, cards: any[]) {
    for (let card of cards) {
      if (card.name === name) {
        return card;
      }
    }
    return null;
  }

  /**
   * Remove the card with the given name from the given card array
   * @param name string name to search
   * @param cards card object array
   * @param mode the mode to check remove status for
   */
  removeArchidektCard(name: string, cards: any[], mode): boolean {
    for (let card of cards) {
      if (card.card.oracleCard.name === name) {
        if (mode === 'cards') {
          return card.categories.includes('Maybeboard') ||
            card.categories.includes("Companion") ||
            card.categories.includes("Sideboard") ||
            card.categories.includes("Contraption") ||
            card.categories.includes("Attraction") ||
            card.categories.includes("Stickers");
        }
        else if (mode === 'companions') {
          return !card.categories.includes("Companion") || card.categories.includes('Maybeboard');
        }
        else if (mode === 'sideboard') {
          return !card.categories.includes("Sideboard") || card.categories.includes('Maybeboard');
        }
        else if (mode === 'contraptions') {
          return !card.categories.includes("Contraption") || card.categories.includes('Maybeboard');
        }
        else if (mode === 'attractions') {
          return !card.categories.includes("Attraction") || card.categories.includes('Maybeboard');
        }
        else if (mode === 'stickers') {
          return !card.categories.includes("Stickers") || card.categories.includes('Maybeboard');
        }
      }
    }
    return true;
  }

  removeMoxfieldCard(name: string, cards: any[]): boolean {
    for (let [key, value] of Object.entries(cards)) {
      if (key !== "count") {
        if (value.card.name === name) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Sets the image for the given card to the oldest available image.
   * @param card card object to use.
   */
  getCardImage(card: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getDefaultImage(this.current_user.id, card.name).then((default_data: any) => {
        if (default_data != null) {
          card.image = default_data.image != null? default_data.image: ''
          card.back_image = default_data.back_image != null? default_data.back_image: ''
        }
        else {
          this.fddp_data.getImagesForCard(card.name).then((card_image_data: any) => {
            let card_images = card_image_data.images;
            let card_back_images = card_image_data.back_images
            card.image = card_images && card_images.length > 0? card_images[card_images.length - 1].image: '';
            card.back_image = card_back_images && card_back_images.length > 0? card_back_images[card_back_images.length - 1].image: '';
            resolve();
          });
        }
      });
    });
  }

  /**
   * Token object comparison function
   * @param card1
   * @param card2
   */
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

  /**
   * Gets all available images for a given card
   * @param card card object to search
   */
  async getCardImages(card: any) {
    this.available_sets = [];
    this.selected_set = "";
    this.image_options = [];
    if (this.card_type === 'tokens') {
      let token_data = await this.fddp_data.getAllOfToken(card.name);
      for (let token of token_data) {
        if (this.tokensEqual(card, token)) {
          token.visible = true;
          this.image_options.push(token);
          if (!this.available_sets.includes(token.set_name)) {
            this.available_sets.push(token.set_name);
          }
        }
      }
    }
    else {
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

  /**
   * Sort function for displaying all card images
   */
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

  /**
   * Filter helper function for displaying images for a given set
   */
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

  /**
   * Copies the input card data into selected_card object
   * @param card
   */
  copyToSelected(card: any) {
    if (this.card_type === 'tokens') {
      this.selected_card.name = card.name;
      this.selected_card.image = card.image;
      this.selected_card.types = card.types;
      this.selected_card.power = card.power;
      this.selected_card.toughness = card.toughness;
      this.selected_card.oracle_text = card.oracle_text;
      this.selected_card.colors = card.colors;
      this.changing_image = false;
    }
    else {
      if (this.changing_image) {
        this.selected_card.image = card.image;
        this.changing_image = false;
      }
      else if (this.changing_back_image) {
        this.selected_card.back_image = card.image;
        this.changing_back_image = false;
      }
    }
  }

  /**
   * Sets card image to default
   * @param card
   */
  resetCard(card:any) {
    card.image = null;
    card.back_image = null;
    this.getCardImage(card).then(() => {
    });
  }

  /**
   * Inserts the new card into the deck, or increases count if already exists.
   */
  addCardToDeck(mode) {
    let zone = null;
    if (mode === 'deck' || mode === 'cards') {
      zone = this.deck.cards;
    }
    else if (mode === 'sideboard'){
      zone = this.deck.sideboard;
    }
    else if (mode === 'companions') {
      zone = this.deck.companions;
    }
    else if (mode === 'contraptions') {
      zone = this.deck.contraptions;
    }
    else if (mode === 'attractions') {
      zone = this.deck.attractions;
    }
    else if (mode === 'stickers') {
      zone = this.deck.stickers;
    }
    if (this.new_card_temp && zone) {
      for (let card of zone) {
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
      zone.push(
        temp_card
      );
      zone.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
      zone.sort((a: any, b: any) => (a.iscommander < b.iscommander) ? 1: -1);
      this.getCardImage(temp_card);
      this.new_card_temp = null;
    }
  }

  /**
   * Inserts the token into the deck.
   */
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
              this.deck.tokens.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
            }
          })
        }
      })
    }
  }

  /**
   * Remove the given token from the deck
   * @param token
   */
  deleteToken(token: any) {
    this.deck.token_delete.push(token);
    this.deck.tokens.splice(this.deck.tokens.indexOf(token), 1);
  }

  /**
   * Returns the total number of cards in the input card array
   * @param cards
   */
  getTotal(cards: any) {
    let count = 0;
    for (let card of cards) {
      count += card.count;
    }
    return count;
  }

  /**
   * Save the deck to the db and recheck its legality.
   */
  saveDeck() {
    console.log(this.deck);
    this.saving = true;
    if (this.deckid == -1) { //create
      this.fddp_data.createDeck(this.deck).then((deckid) => {
        if (deckid) {
          this.fddp_data.updateDeckThemes(deckid, this.deck.themes, this.deck.tribes).then(() => {
            this.fddp_data.updateDeckLegality(deckid).then(() => {
              this.router.navigate(['/']);
            });
          });
        }
        else {
          this.router.navigate(['/']);
        }
      });
    }
    else {
      this.fddp_data.updateDeck(this.deck).then(() => {
        this.fddp_data.updateDeckThemes(this.deckid, this.deck.themes, this.deck.tribes).then(() => {
          this.fddp_data.updateDeckLegality(this.deckid).then(() => {
            this.router.navigate(['/']);
          });
        });
      });
    }
  }

  /**
   * Delete the deck from the db.
   */
  deleteDeck() {
    this.fddp_data.deleteDeck(this.deck.id).then(() => {
      this.router.navigate(['/']);
    });
  }

  /**
   * Right click helper function to handle decrementing card counts.
   * @param event
   * @param item
   */
  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    if (item.type && item.type !== 'none') {
      if (item.type == 'cards_count') {
        item.card.count--;
        if (item.card.count == 0) {
          this.deck.delete_cards.push(item.card);
          this.deck.cards.splice(this.deck.cards.indexOf(item.card), 1);
        }
      }
      if (item.type == 'sideboard_count') {
        item.card.count--;
        if (item.card.count == 0) {
          this.deck.delete_sideboard.push(item.card);
          this.deck.sideboard.splice(this.deck.sideboard.indexOf(item.card), 1);
        }
      }
      if (item.type == 'companions_count') {
        item.card.count--;
        if (item.card.count == 0) {
          this.deck.delete_companions.push(item.card);
          this.deck.companions.splice(this.deck.companions.indexOf(item.card), 1);
        }
      }
      if (item.type == 'contraptions_count') {
        item.card.count--;
        if (item.card.count == 0) {
          this.deck.delete_contraptions.push(item.card);
          this.deck.contraptions.splice(this.deck.contraptions.indexOf(item.card), 1);
        }
      }
      if (item.type == 'attractions_count') {
        item.card.count--;
        if (item.card.count == 0) {
          this.deck.delete_attractions.push(item.card);
          this.deck.attractions.splice(this.deck.attractions.indexOf(item.card), 1);
        }
      }
      if (item.type == 'stickers_count') {
        item.card.count--;
        if (item.card.count == 0) {
          this.deck.delete_stickers.push(item.card);
          this.deck.stickers.splice(this.deck.stickers.indexOf(item.card), 1);
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

  /**
   * Returns the theme object with the given id
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
   * Returns the tribe object with the given id
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

  /**
   * Removes the theme from the deck
   * @param theme
   */
  public removeTheme(theme: any): void {
    const index = this.deck.themes.indexOf(theme);
    if (index > -1) {
      this.deck.themes.splice(index, 1);
    }
  }

  /**
   * Removes the tribe from the deck.
   * @param theme
   */
  public removeTribe(theme: any): void {
    const index = this.deck.tribes.indexOf(theme);
    if (index > -1) {
      this.deck.tribes.splice(index, 1);
    }
  }

  setDefaultImage(card) {
    this.setting_default = true;
    this.fddp_data.setDefaultImage(this.current_user.id, card).then(() => {
      this.setting_default = false;
      console.log('default image set');
    })
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
