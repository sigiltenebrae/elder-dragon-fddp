import { Component, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged, map, Observable, OperatorFunction, startWith, switchMap, tap } from "rxjs";
import { FormControl } from "@angular/forms";
import { FddpApiService } from "../../services/fddp-api.service";
import * as Scry from "scryfall-sdk";
import {ActivatedRoute, Router} from "@angular/router";
import {TokenStorageService} from "../../services/token-storage.service";

@Component({
  selector: 'app-deck-edit',
  templateUrl: './deck-edit.component.html',
  styleUrls: ['./deck-edit.component.scss']
})
export class DeckEditComponent implements OnInit {

  loading = false;
  users: any = []
  current_user: any = null;

  deckid = -1;
  deck: any = null;
  selected_card: any = null;
  changing_image = false;
  changing_back_image = false;
  image_options: any[] = [];
  back_image_options: any[] = [];
  new_card_temp: any = null;
  new_token_temp = '';
  deleting = false;
  card_type = 'cards';

  constructor(private fddp_data: FddpApiService, private route: ActivatedRoute, private router: Router, private tokenStorage: TokenStorageService) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit(): void {
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
      this.deck.sleeves = 'https://c1.scryfall.com/file/scryfall-card-backs/large/59/597b79b3-7d77-4261-871a-60dd17403388.jpg?1561757129';
      this.deck.link = '';
      this.deck.rating = 3;
      this.deck.owner = 0;
      this.deck.cards = [];
      this.deck.tokens = [];
      this.deck.owner = this.current_user.id;
    }
    else if (this.deckid < 0) {
      this.router.navigate(['/']);
    }
    else {
      this.fddp_data.getDeckForPlay(this.deckid).then((deck) => {
        this.deck = deck;
        this.deck.delete = [];
        this.deck.token_delete = [];
        this.deck.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
      });
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
          this.deck.tokens.forEach((token: any) => {
            this.getCardImage(token);
          });
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
      if (tok.name === token.name) {
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
        card.image = card_images && card_images.length > 0? card_images[0]: '';
        card.back_image = card_back_images && card_back_images.length > 0? card_back_images[0]: '';
        resolve();
      });
    });
  }

  async getCardImages(card: any) {
    let image_data: any = await this.fddp_data.getImagesForCard(card.name);
    this.image_options = image_data.images;
    this.back_image_options = image_data.back_images;
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
      //for (let card of this.deck.tokens) {
      //  if (card.name === this.new_token_temp) {
      //    return;
      //  }
      //}
      let temp_card = {
        name: this.new_token_temp,
        image: '',
      }
      this.deck.tokens.push(temp_card);
      this.deck.tokens.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
      this.getCardImage(temp_card);
      this.new_token_temp = '';
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
        this.router.navigate(['/']);
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
}
