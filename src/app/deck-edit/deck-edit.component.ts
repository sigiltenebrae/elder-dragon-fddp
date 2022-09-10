import { Component, OnInit } from '@angular/core';
import { debounceTime, distinctUntilChanged, map, Observable, OperatorFunction, startWith, switchMap, tap } from "rxjs";
import { FormControl } from "@angular/forms";
import { FddpApiService } from "../../services/fddp-api.service";
import * as Scry from "scryfall-sdk";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
  selector: 'app-deck-edit',
  templateUrl: './deck-edit.component.html',
  styleUrls: ['./deck-edit.component.scss']
})
export class DeckEditComponent implements OnInit {

  loading = false;
  users = [
    {
      id: 1,
      name: "Christian"
    },
    {
      id: 2,
      name: "David"
    },
    {
      id: 3,
      name: "Ray"
    },
    {
      id: 4,
      name: "Liam"
    },
    {
      id: 5,
      name: "Ryan"
    },
    {
      id: 6,
      name: "George"
    }
  ]

  deckid = -1;
  deck: any = null;
  selected_card: any = null;
  changing_image = false;
  image_options: any[] = []
  new_card_temp: any = null;

  constructor(private fddp_data: FddpApiService, private route: ActivatedRoute, private router: Router) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit(): void {
    const routeParams = this.route.snapshot.paramMap;
    this.deckid = Number(routeParams.get('deckid'));
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
    }
    else if (this.deckid < 0) {
      this.router.navigate(['/']);
    }
    else {
      this.fddp_data.getDeck(this.deckid).then((deck) => {
        this.deck = deck;
      })
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
            this.deck.cards.push(
              {
                name: card.card.oracleCard.name,
                image: '',
                count: card.quantity,
                iscommander: iscommander
              });
          }
        }
        this.deck.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
        this.deck.cards.forEach((card: any) => {
          this.getCardImage(card).then(() => {
            if (card.iscommander) {
              this.deck.image = card.image;
            }
          });
        });
      });
    }
  }

  async getCardImage(card: any) {
    let card_images = await this.fddp_data.getImagesForCard(card.name);
    card.image = card_images.length > 0? card_images[0]: '';
  }

  async getCardImages(card: any) {
    this.image_options = await this.fddp_data.getImagesForCard(card.name);
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
      this.deck.cards.push(
        {
          name: this.new_card_temp,
          image: '',
          count: 1,
          iscommander: false
        }
      );
      this.new_card_temp = null;
    }
  }

  saveDeck() {
    if (this.deckid == -1) { //create
      this.fddp_data.createDeck(this.deck).then(() => {
        this.router.navigate(['/']);
      });
    }
  }

  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    if (item.type && item.type !== 'none') {
      if (item.type == 'card_count') {
        item.card.count--;
        if (item.card.count == 0) {
          this.deck.cards.splice(this.deck.cards.indexOf(item.card), 1);
        }
      }
    }
  }
}
