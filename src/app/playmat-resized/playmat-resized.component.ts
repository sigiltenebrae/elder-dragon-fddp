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
            card.owner = out_player.name;
            //card.owner = 'Liam';
            card.power_mod = 0;
            card.toughness_mod = 0;
            card.loyalty_mod = 0;
            card.locked = false;
            card.primed = false;
            card.triggered = false;
            card.is_token = false;
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
            card.is_token = false;
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
        if (!card.locked) {
          card.tapped = 'untapped';
        }
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

  isPermanent(card: any) {
    return card.types.includes("Creature") ||
      card.types.includes("Artifact") ||
      card.types.includes("Enchantment") ||
      card.types.includes("Land");
  }

  devotionCount(player: any, color: string) {
    let count = 0;
    if (player) {
      for (let spot of player.playmat) {
        for (let card of spot) {
          if (this.isPermanent(card) && !card.is_token) {
            if (card.mana_cost) {
              card.mana_cost.forEach((mana: any) => { if(mana === color) { count++ }});
            }
          }
        }
      }
    }
    return count;
  }

  /**------------------------------------------------
   *          Card Transfer Helper Functions        *
   ------------------------------------------------**/

  /**
   * Drag event handler for moving a card
   * @param event
   * @param location string value of where to move the card.
   * Accepts: 'hand', 'deck', 'grave', 'exile', 'temp_zone', 'command_zone' or 'play'
   */
  moveCardToZone(event: any, location: string) {
    //Hand, Command Zone, Deck, Grave, Exile, Temp Zone, Play
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
            if (card_select.from === this.getPlayer(card_select.card.owner).hand) { //If it is already in hand
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex);
            }
            else {
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).hand, card_select.from.indexOf(card_select.card), event.currentIndex);
            }
            break;
          case 'deck':
            if (card_select.from === this.getPlayer(card_select.card.owner).deck.cards) { //If it is already in the deck
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
            }
            else {
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), 0);
            }
            break;
          case 'deck_bottom': //this should never happen from a drag event, only from a 'send'
            if (card_select.from === this.getPlayer(card_select.card.owner).deck.cards) { //If it is already in the deck
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
            }
            else {
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), this.getPlayer(card_select.card.owner).deck.cards.length);
            }
            break;
          case 'grave':
            if (card_select.from === this.getPlayer(card_select.card.owner).grave) { //If it is already in grave
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
            }
            else {
              //transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).grave, card_select.from.indexOf(card_select.card), event.currentIndex);
              //changed to insert at the top of grave no matter what
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).grave, card_select.from.indexOf(card_select.card), 0);
            }
            break;
          case 'exile':
            if (card_select.from === this.getPlayer(card_select.card.owner).exile) { //If it is already in exile
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
            }
            else {
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).exile, card_select.from.indexOf(card_select.card), 0);
            }
            break;
          case 'temp_zone':
            if (card_select.from === event.container.data) { //If it is already in temp zone
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex);
            }
            else {
              transferArrayItem(card_select.from, event.container.data, card_select.from.indexOf(card_select.card), 0);
            }
            break;
          case 'command_zone':
            if (card_select.card.iscommander) {
              if (card_select.from === this.getPlayer(card_select.card.owner).deck.commander) { //If it is already in hand
                moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex);
              }
              else {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.commander, card_select.from.indexOf(card_select.card), event.currentIndex);
              }
              break;
            }
        }
        card_select.card.selected = false;
      }
    }
    else { //card is being moved to play
      if (this.selected_cards.length == 1) { //only moving 1 card, just use default behavior
        if (event.previousContainer === event.container) {
          moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        }
        else {
          if (event.container.data.length < 3) {
            transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
          }
        }
        cur_card.selected = false;
      }
      else {
        //Get the index on the playmat of the spot you are moving to
        let spot_index = this.user.playmat.indexOf(event.container.data);
        for (let card_select of this.selected_cards) {
          card_select.card.selected = false;
          if (card_select.from != event.container.data) { //if the card is already there, skip it
            for (let spot_offset = 0; spot_offset < this.user.playmat.length; spot_offset++) {
              //start at the spot you are trying to insert on and loop around
              let current_index = spot_index + spot_offset;
              if (current_index >= this.user.playmat.length) { current_index -= this.user.playmat.length }
              if (this.user.playmat[current_index].length < 3) {
                this.user.playmat[current_index].push(card_select.card);
                card_select.from.splice(card_select.from.indexOf(card_select.card), 1);
                break;
              }
            }
          }
        }
      }
    }
    this.selected_cards = [];
  }

  /**
   * Manual handler for moving a card. Constructs a drag event and passes into the drag handler.
   * @param card card to move
   * @param from location of card to move
   * @param location string value of where to move the card.
   * Accepts: 'hand', 'deck_top', 'deck_bottom', 'grave', 'exile', 'temp_zone', 'selected', 'command_zone' or 'play'
   */
  sendCardToZone(card: any, from: any[], location: string) {
    let event:any = {}
    event.previousContainer = {}
    event.container = {}
    event.previousContainer.data = from;
    event.previousIndex = from.indexOf(card);
    switch (location) {
      case 'hand':
        event.container.data = this.user.hand;
        event.currentIndex = 0;
        break;
      case 'deck_top':
        location = 'deck'
        event.container.data = this.user.deck.cards;
        event.currentIndex = 0;
        break;
      case 'deck_bottom':
        event.container.data = this.user.deck.cards;
        event.currentIndex = 0;
        break;
      case 'grave':
        event.container.data = this.user.grave;
        event.currentIndex = 0;
        break;
      case 'exile':
        event.container.data = this.user.exile;
        event.currentIndex = 0;
        break;
      case 'temp_zone':
        event.container.data = this.user.temp_zone;
        event.currentIndex = 0;
        break;
      case 'selected':
        if (this.selected_player) {
          location = 'temp_zone';
          console.log(this.selected_player);
          event.container.data = this.selected_player.temp_zone;
          event.currentIndex = 0;
        }
        break;
      case 'command_zone':
        event.container.data = this.user.deck.commander;
        event.currentIndex = 0;
        break;
      case 'play':
        event.container.data = this.user.playmat[0];
        event.currentIndex = 0;
        break;
    }
    this.moveCardToZone(event, location);
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
    this.sidenav_scry = 2; //DEBUGGING, NEED TO FIX
    this.fddp_sidenav.open();
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
