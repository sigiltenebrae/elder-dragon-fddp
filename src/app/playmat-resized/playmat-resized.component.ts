import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {MatMenuTrigger} from "@angular/material/menu";
import { RightclickHandlerServiceService } from "../../services/rightclick-handler-service.service";
import {MatSelectionListChange} from "@angular/material/list";
import {MatSidenav} from "@angular/material/sidenav";
import {FddpApiService} from "../../services/fddp-api.service";

@Component({
  selector: 'app-playmat-resized',
  templateUrl: './playmat-resized.component.html',
  styleUrls: ['./playmat-resized.component.scss'],
  animations: [
    // Each unique animation requires its own trigger. The first argument of the trigger function is the name
    trigger('userTappedState', [
      state('untapped', style({ transform: 'rotate(0)' })),
      state('tapped', style({ transform: 'rotate(90deg)' })),
      transition('tapped => untapped', animate('250ms ease-out')),
      transition('untapped => tapped', animate('250ms ease-in'))
    ]),
    trigger('opponentTappedState', [
      state('untapped', style({ transform: 'rotate(180deg)' })),
      state('tapped', style({ transform: 'rotate(270deg)' })),
      transition('tapped => untapped', animate('250ms ease-out')),
      transition('untapped => tapped', animate('250ms ease-in'))
    ])
  ]
})
export class PlaymatResizedComponent implements OnInit {

  /**------------------------------------------------
   *                  Variables                     *
   ------------------------------------------------**/
  players: any = [];

  user: any = null;
  selected_player: any = null;
  sidenav_selected_player: any = null;
  current_turn = 0;

  hovered_card: any = null;
  rightclicked_item: any = null;
  sidenav_type: any = null;
  current_draw = 1;
  current_drawto = 1;
  selected_cards: any[] = [];
  sidenav_sort = '';
  sidenav_scry = 0;
  loading = false;


  /**------------------------------------------------
   *              Game Setup Functions              *
   ------------------------------------------------**/
  constructor(private rightClickHandler: RightclickHandlerServiceService, private fddp_data: FddpApiService) { }

  ngOnInit(): void {
    this.loading = true;
    this.rightClickHandler.overrideRightClick();
    let game_promises: any[] = [];
    game_promises.push(this.loadPlayer("Christian", 8, 0));
    game_promises.push(this.loadPlayer("Liam", 10, 1));
    game_promises.push(this.loadPlayer("David", 11, 2));
    game_promises.push(this.loadPlayer("George", 12, 3));
    Promise.all(game_promises).then(() => {
      for (let player of this.players) {
        if (player.name === "Christian") {
          this.user = player;
        }
      }
      this.players.sort((a: any, b: any) => (a.turn > b.turn) ? 1: -1);
      this.loading = false;
    });
  }

  loadPlayer(player: string, deckid: number, turn: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getDeckForPlay(deckid).then((deck_data: any) => {
        if (deck_data) {
          let out_player: any = {};
          out_player.deck = deck_data;
          out_player.name = player;
          out_player.life = 40;
          out_player.infect = 0;
          out_player.turn = turn;
          out_player.playmat = []
          for (let i = 0; i < 36; i++) {
            out_player.playmat.push([])
          }
          out_player.hand = [];
          out_player.grave = [];
          out_player.exile = [];
          out_player.temp_zone = [];
          out_player.deck.cards.forEach((card: any) => {
            card.counter_1 = false;
            card.counter_2 = false;
            card.counter_3 = false;
            card.multiplier = false;
            card.counter_1_value = 0;
            card.counter_2_value = 0;
            card.counter_3_value = 0;
            card.multiplier_value = 0;
            //card.owner = out_player.name;
            card.owner = 'Liam';
            card.power_mod = 0;
            card.toughness_mod = 0;
            card.loyalty_mod = 0;
            card.locked = false;
            card.primed = false;
            card.triggered = false;
          })
          out_player.deck.commander.forEach((card: any) => {
            card.counter_1 = false;
            card.counter_2 = false;
            card.counter_3 = false;
            card.multiplier = false;
            card.counter_1_value = 0;
            card.counter_2_value = 0;
            card.counter_3_value = 0;
            card.multiplier_value = 0;
            card.owner = out_player.name;
            card.power_mod = 0;
            card.toughness_mod = 0;
            card.loyalty_mod = 0;
            card.locked = false;
            card.primed = false;
            card.triggered = false;
          })

          out_player.selected = false;
          this.shuffleDeck(out_player.deck.cards);
          this.players.push(out_player);
          resolve();
        }
        else{
          resolve();
        }
      });
    });
  }

  /**------------------------------------------------
   *      Player-Interaction Helper Functions        *
   ------------------------------------------------**/

  reversePlaymat(array: any[]){
    return array.map((item,idx) => array[array.length-1-idx])
  }

  selectPlayer(selector: any) {
    for (let player of this.players) {
      player.selected = false;
    }
    selector.selected = true;
    if (this.isOpponent(selector)) {
      this.selected_player = selector;
    }
    else {
      this.selected_player = null;
    }
  }

  getPlayer(player: string) {
    for(let cur_player of this.players) {
      if (cur_player.name === player) {
        return cur_player;
      }
    }
    return null;
  }

  nextTurn() {
    this.current_turn ++;
    let max_turn = 0;
    let max_player = null;
    for (let player of this.players) {
      if (player.turn > max_turn) {
        max_turn = player.turn;
        max_player = player;
      }
    }
    if (this.current_turn > max_turn) {
      this.current_turn = 0;
      for (let player of this.players) {
        if (player.turn == 0) {
          max_player = player;
          break;
        }
      }
    }

    //DEBUG
    for (let player of this.players) {
      if (player.turn == this.current_turn) {
        this.user = player;
      }
    }

  }

  /**------------------------------------------------
   *      Board-Interaction Helper Functions        *
   ------------------------------------------------**/

  isOpponent(player: any) {
    return player.name !== this.user.name
  }

  tapSpot(spot: any) {
    for (let card of spot) {
      card.tapped = card.tapped === 'tapped'? 'untapped': 'tapped';
    }
  }

  tapCard(card: any) {
    card.tapped = card.tapped === 'tapped'? 'untapped': 'tapped';
  }

  untapAll() {
    for (let spot of this.user.playmat) {
      for (let card of spot) {
        card.tapped = 'untapped';
      }
    }
  }

  /**
   * Add or remove the card from the selected list for group actions.
   * @param card Card to add to the list
   * @param from Current location of the card
   * @param enable whether or not to allow the card to be selected (in the case of non-visible cards in the sidenav)
   */
  toggleCardSelect(card: any, from: any, enable?: boolean) {
    if (typeof enable === 'undefined' || enable) {
      for (let selected of this.selected_cards) {
        if (selected.card == card && selected.from == from) {
          this.selected_cards.splice(this.selected_cards.indexOf(selected), 1);
          card.selected = false;
          return;
        }
      }
      this.selected_cards.push({
        card: card,
        from: from
      });
      card.selected = true;
    }
  }

  clearCard(card: any) {
    card.tapped = 'untapped';
    card.power_mod = 0;
    card.toughness_mod = 0;
    card.loyalty_mod = 0;
    card.counter_1 = false;
    card.counter_2 = false;
    card.counter_3 = false;
    card.multiplier = false;
    card.locked = false;
    card.primed = false;
    card.triggered = false;
  }

  shuffleDeck(cards: any[]) {
    for (let i = 0; i < cards.length; i++) {
      let r = i + Math.floor(Math.random() * (cards.length - i));
      let temp = cards[r];
      cards[r] = cards[i];
      cards[i] = temp;
    }

  }

  /**------------------------------------------------
   *          Card Transfer Helper Functions        *
   ------------------------------------------------**/

  moveCardToZone(event: any, location: string) {
    //Hand, Command Zone, Deck, Grave, Exile, Temp Zone, Play

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      let cur_card = event.previousContainer.data[event.previousIndex];
      if (location !== 'temp_zone' && location !== 'play') {
        this.clearCard(cur_card); //wipe all counters
      }
      if (!cur_card.selected) { //add the card to selected list if it isn't already
        this.toggleCardSelect(cur_card, event.previousContainer.data);
      }

      if (location !== 'play') {
        for (let card_select of this.selected_cards) {
          switch(location) {
            case 'hand':
              transferArrayItem(
                card_select.from,
                this.getPlayer(card_select.card.owner).hand,
                card_select.from.indexOf(card_select.card),
                event.currentIndex
              );
              break;
            case 'deck':
              transferArrayItem(
                card_select.from,
                this.getPlayer(card_select.card.owner).deck.cards,
                card_select.from.indexOf(card_select.card),
                event.currentIndex
              );
              break;
            case 'grave':
              transferArrayItem(
                card_select.from,
                this.getPlayer(card_select.card.owner).grave,
                card_select.from.indexOf(card_select.card),
                event.currentIndex
              );
              break;
            case 'exile':
              transferArrayItem(
                card_select.from,
                this.getPlayer(card_select.card.owner).exile,
                card_select.from.indexOf(card_select.card),
                event.currentIndex
              );
              break;
            case 'temp_zone':
              transferArrayItem(
                card_select.from,
                event.container.data,
                card_select.from.indexOf(card_select.card),
                event.currentIndex
              );
              break;
            case 'command_zone':
              if (card_select.card.iscommander) {
                transferArrayItem(
                  card_select.from,
                  this.getPlayer(card_select.card.owner).deck.commander,
                  card_select.from.indexOf(card_select.card),
                  event.currentIndex
                );
                break;
              }
          }
        }
      }

      else { //card is being moved to play

      }
    }
  }

  /**------------------------------------------------
   *               Sidenav Functions                *
   ------------------------------------------------**/

  @ViewChild('fddp_sidenav') fddp_sidenav: any;
  openSideNav(type: string) {
    this.sidenav_selected_player = this.user;
    this.getSidenavSort(this.user.deck.cards)
    this.getSidenavSort(this.user.grave);
    this.getSidenavSort(this.user.exile);
    this.getSidenavSort(this.user.temp_zone);
    this.sidenav_type = type;
    this.sidenav_scry = this.current_draw;
    this.fddp_sidenav.open();
    this.current_draw = 1;
  }

  closeSideNav() {
    this.sidenav_selected_player = null;
    this.sidenav_type = null;
    this.fddp_sidenav.close();
    this.sidenav_sort = '';
  }

  updateSidenav() {
    if (this.sidenav_type === 'grave') {
      this.getSidenavSort(this.sidenav_selected_player.grave);
    }
    else if (this.sidenav_type === 'exile') {
      this.getSidenavSort(this.sidenav_selected_player.exile);
    }
    else if (this.sidenav_type === 'temp_zone') {
      this.getSidenavSort(this.sidenav_selected_player.temp_zone);
    }
    else if (this.sidenav_type === 'deck' || this.sidenav_type === 'scry') {
      this.getSidenavSort(this.sidenav_selected_player.deck.cards);
    }
  }

  getSidenavSort(items: any[]) {
    for (let item of items) {
      item.sidenav_visible = item.name.toLowerCase().includes(this.sidenav_sort.toLowerCase());
    }
  }


  /**------------------------------------------------
   *      Right-Click Replacement Functions         *
   ------------------------------------------------**/
  menuTopLeftPosition =  {x: '0', y: '0'}
  @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: any;

  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    if (item.type && item.type !== 'none') {
      if (item.type === 'life') {
        item.player.life --;
      }
      else if (item.type === 'infect') {
        item.player.infect --;
      }
      else if (item.type === 'counter_1') {
        item.card.counter_1_value --;
      }
      else if (item.type === 'counter_2') {
        item.card.counter_2_value --;
      }
      else if (item.type === 'counter_3') {
        item.card.counter_3_value --;
      }
      else if (item.type === 'multiplier') {
        item.card.multiplier_value --;
      }
      else if (item.type === 'power') {
        item.card.power_mod --;
      }
      else if (item.type === 'toughness') {
        item.card.toughness_mod --;
      }
      else if (item.type === 'loyalty') {
        item.card.loyalty_mod --;
      }
      else {
        this.rightclicked_item = item;
        this.menuTopLeftPosition.x = event.clientX + 'px';
        this.menuTopLeftPosition.y = event.clientY + 'px';
        this.matMenuTrigger.openMenu();
      }
    }
  }
}
