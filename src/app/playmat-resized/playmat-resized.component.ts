import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {MatMenuTrigger} from "@angular/material/menu";
import { RightclickHandlerServiceService } from "../../services/rightclick-handler-service.service";
import {MatSelectionListChange} from "@angular/material/list";
import {MatSidenav} from "@angular/material/sidenav";
import {FddpApiService} from "../../services/fddp-api.service";
import {MatSnackBar} from "@angular/material/snack-bar";

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
  temp_scry_zone: any[] = [];
  loading = false;


  /**------------------------------------------------
   *              Game Setup Functions              *
   ------------------------------------------------**/
  constructor(private rightClickHandler: RightclickHandlerServiceService, private fddp_data: FddpApiService,
              private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.loading = true;
    this.rightClickHandler.overrideRightClick();
    let game_promises: any[] = [];
    game_promises.push(this.loadPlayer("Christian", 1, 16, 0));
    game_promises.push(this.loadPlayer("Ray", 3, 13, 1));
    game_promises.push(this.loadPlayer("David", 2, 11, 2));
    game_promises.push(this.loadPlayer("George", 6, 12, 3));
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

  loadPlayer(name: string, id: number, deckid: number, turn: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getDeckForPlay(deckid).then((deck_data: any) => {
        if (deck_data) {
          let out_player: any = {};
          out_player.deck = deck_data;
          out_player.name = name;
          out_player.id = id;
          out_player.life = 40;
          out_player.infect = 0;
          out_player.turn = turn;
          out_player.playmat = []
          out_player.command_tax_1 = 0;
          out_player.command_tax_2 = 0;
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
            card.owner = out_player.deck.owner;
            //card.owner = 'Liam';
            card.power_mod = 0;
            card.toughness_mod = 0;
            card.loyalty_mod = 0;
            card.locked = false;
            card.primed = false;
            card.triggered = false;
            card.is_token = false;
            card.tapped = 'untapped';
            card.sidenav_visible = true;
            card.visible = [];
            card.alt = false;
          })
          out_player.deck.commander_saved = [];
          out_player.deck.commander.forEach((card: any) => {
            out_player.deck.commander_saved.push(card);
            card.counter_1 = false;
            card.counter_2 = false;
            card.counter_3 = false;
            card.multiplier = false;
            card.counter_1_value = 0;
            card.counter_2_value = 0;
            card.counter_3_value = 0;
            card.multiplier_value = 0;
            card.owner = out_player.deck.owner;
            card.power_mod = 0;
            card.toughness_mod = 0;
            card.loyalty_mod = 0;
            card.locked = false;
            card.primed = false;
            card.triggered = false;
            card.is_token = false;
            card.tapped = 'untapped';
            card.sidenav_visible = true;
            card.visible = []
            card.alt = false;
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

  getPlayer(player: number) {
    for(let cur_player of this.players) {
      if (cur_player.id === player) {
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

  canSee(card: any, user: any) {
    if (card.visible && card.visible.includes(user.name)) {
      return true;
    }
    return false;
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

  selectCard(card: any, from: any, commander?: boolean) {
    if (commander) { //if it is the commander being cast
      if (from.indexOf(card) != -1) {
        if (!card.selected) {
          card.selected = true;
          this.selected_cards.push({
            card: card,
            from: from
          });
          card.selected = true;
        }
      }
    }
    else {
      if (!card.selected) {
        card.selected = true;
        this.selected_cards.push({
          card: card,
          from: from
        });
        card.selected = true;
      }
    }
  }

  clearSelection(besides?: any) {
    let saving:any = null;
    for (let card of this.selected_cards) {
      if (besides) {
        if (card.card == besides) {
          saving = card;
        }
        else {
          card.card.selected = false;
        }
      }
      else {
        card.card.selected = false;
      }
    }
    this.selected_cards = saving? [saving]: [];
  }

  altFaceCard(card: any) {
    if (card.back_face) {
      let temp_image = card.image;
      let temp_mana_cost = card.mana_cost;
      let temp_types = card.types;
      let temp_oracle_text = card.oracle_text;
      let temp_power = card.power;
      let temp_toughness = card.toughness;
      let temp_loyalty = card.loyalty;

      card.image = card.back_image;
      card.mana_cost = card.back_mana_cost;
      card.types = card.back_types;
      card.oracle_text = card.back_oracle_text;
      card.power = card.back_power;
      card.toughness = card.back_toughness;
      card.loyalty = card.back_loyalty;

      card.back_image = temp_image;
      card.back_mana_cost = temp_mana_cost;
      card.back_types = temp_types;
      card.back_oracle_text = temp_oracle_text;
      card.back_power = temp_power;
      card.back_toughness = temp_toughness;
      card.back_loyalty = temp_loyalty;

      card.alt = !card.alt;
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
    if (card.alt) {
      this.altFaceCard(card);
    }
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

  typeCount(player: any, type: string) {
    let count = 0;
    if (player) {
      for (let spot of player.playmat) {
        for (let card of spot) {
          if (card.types) {
            for (let card_type of card.types) {
              if (type.toLowerCase() === card_type.toLowerCase()) {
                count++;
              }
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

  //Sidebar search limit
  moveCardToZone(event: any, location: string, sidebar?: boolean) {
    //Hand, Command Zone, Deck, Grave, Exile, Temp Zone, Play
    if (location !== 'play') {
      for (let card_select of this.selected_cards) {
        switch(location) {
          case 'hand':
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).hand) { //If it is already in hand
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex);
            }
            else {
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).hand, card_select.from.indexOf(card_select.card), event.currentIndex);
            }
            break;
          case 'deck':
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).deck.cards) { //If it is already in the deck
              if (!(sidebar && this.sidenav_sort !== '')) { //if it is trying to move in a sorted sidebar, prevent
                moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
              }
            }
            else {
              if (sidebar) {
                if (this.sidenav_sort === '') {
                  transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), event.currentIndex);
                }
              }
              else {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), 0);
              }
            }
            break;
          case 'deck_bottom': //this should never happen from a drag event, only from a 'send'
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).deck.cards) { //If it is already in the deck
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
            }
            else {
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), this.getPlayer(card_select.card.owner).deck.cards.length);
            }
            break;
          case 'grave':
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).grave) { //If it is already in grave
              if (!(sidebar && this.sidenav_sort !== '')) {
                moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
              }
            }
            else {
              if (sidebar && this.sidenav_sort === '') {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).grave, card_select.from.indexOf(card_select.card), event.currentIndex);
              }
              else {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).grave, card_select.from.indexOf(card_select.card), 0);
              }
            }
            break;
          case 'exile':
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).exile) { //If it is already in exile
              if (!(sidebar && this.sidenav_sort !== '')) {
                moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
              }
            }
            else {
              if (sidebar && this.sidenav_sort === '') {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).exile, card_select.from.indexOf(card_select.card), event.currentIndex);
              }
              else {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).exile, card_select.from.indexOf(card_select.card), 0);
              }
            }
            break;
          case 'temp_zone':
            if (card_select.from === event.container.data) { //If it is already in temp zone
              if (!(sidebar && this.sidenav_sort !== '')) {
                moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
              }
            }
            else {
              if (sidebar && this.sidenav_sort === '') {
                transferArrayItem(card_select.from, event.container.data, card_select.from.indexOf(card_select.card), event.currentIndex);
              }
              else {
                transferArrayItem(card_select.from, event.container.data, card_select.from.indexOf(card_select.card), 0);
              }
            }
            break;
          case 'command_zone':
            if (card_select.card.iscommander) {
              if (card_select.from !== this.getPlayer(card_select.card.owner).deck.commander) { //Do not allow moving commanders via drag
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.commander, card_select.from.indexOf(card_select.card), 0);
              }
              break;
            }
        }
        card_select.card.selected = false;
      }
    }
    else { //card is being moved to play
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

  castCommander(commander: any) {
    if(this.user.deck.commander.includes(commander)) { //If commander is in the command zone

      this.clearSelection(commander);
      this.sendCardToZone(commander, this.user.deck.commander, 'play');
    }
    else {
      this.snackBar.open('Commander is not in the command zone!', 'Dismiss', { duration: 3000});
    }
  }


  swapCommanders() {
    if (this.user.deck.commander_saved.length == 2) {
      let temp: any = this.user.deck.commander_saved[0];
      this.user.deck.commander_saved[0] = this.user.deck.commander_saved[1];
      this.user.deck.commander_saved[1] = temp;
    }
  }
  /**
   * Draws to the temp zone until it reaches a card of the given type
   * @param type
   */
  drawUntil(type: string) {
    while(true) {
      if (this.user.deck.cards.length > 0) {
        let cur_card = this.user.deck.cards[0];
        this.sendCardToZone(cur_card, this.user.deck.cards, 'temp_zone');
        if (cur_card.types) {
          if (cur_card.types.includes(type)) {
            break;
          }
        }
        else {
          break;
        }
      }
    }
  }


  /**
   * Draws cards to the temp zone until it reaches a non-land with a cmc lower than the given.
   * @param cmc
   */
  cascade(cmc: any) {
    cmc = Number(cmc);
    while(true) {
      if (this.user.deck.cards.length > 0) {
        let cur_card = this.user.deck.cards[0];
        this.sendCardToZone(cur_card, this.user.deck.cards, 'temp_zone');
        if (cur_card.cmc) {
          if (cur_card.cmc < cmc) {
            if (cur_card.cmc > 0) {
              break;
            }
            if (cur_card.types) {
              if (!cur_card.types.includes("Land")) {
                break;
              }
            }
            else {
              break;
            }
          }
        }
        else {
          break;
        }
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
    this.sidenav_scry = 2; //DEBUGGING, NEED TO FIX
    if (this.sidenav_scry > 0) {
      for (let i = 0; i < this.sidenav_scry; i++) {
        this.temp_scry_zone.push(this.user.deck.cards[i]);
        console.log('done')
      }
    }
    this.fddp_sidenav.open();
  }

  closeSideNav() {
    this.sidenav_sort = '';
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
    else if (this.sidenav_type === 'deck') {
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
      switch (item.type) {
        case 'life':
          item.player.life --;
          break;
        case 'infect':
          item.player.infect --;
          break;
        case 'counter_1':
          item.card.counter_1_value --;
          break;
        case 'counter_2':
          item.card.counter_2_value --;
          break;
        case 'counter_3':
          item.card.counter_3_value --;
          break;
        case 'multiplier':
          item.card.multiplier_value --;
          break;
        case 'power':
          item.card.power_mod --;
          break;
        case 'toughness':
          item.card.toughness_mod --;
          break;
        case 'loyalty':
          item.card.loyalty_mod --;
          break;
        case 'command_tax_1':
          this.user.command_tax_1 --;
          break;
        case 'command_tax_2':
          this.user.command_tax_2 --;
          break;
        default:
          this.rightclicked_item = item;
          this.menuTopLeftPosition.x = event.clientX + 'px';
          this.menuTopLeftPosition.y = event.clientY + 'px';
          this.matMenuTrigger.openMenu();
      }
    }
  }
}
