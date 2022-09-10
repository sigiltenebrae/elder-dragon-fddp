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

  user: any = null;
  selected_player: any = null;
  sidenav_selected_player: any = null;
  current_turn = 0;

  players: any = [];

  hovered_card: any = null;
  rightclicked_item: any = null;
  sidenav_type: any = null;
  current_draw = 1;
  current_drawto = 1;
  selected_cards: any[] = [];
  sidenav_sort = '';
  sidenav_scry = 0;
  loading = false;

  constructor(private rightClickHandler: RightclickHandlerServiceService, private fddp_data: FddpApiService) { }

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
            card.power_mod = 0;
            card.toughness_mod = 0;
            card.loyalty_mod = 0;
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

  shuffleDeck(cards: any[]) {
    for (let i = 0; i < cards.length; i++) {
      let r = i + Math.floor(Math.random() * (cards.length - i));
      let temp = cards[r];
      cards[r] = cards[i];
      cards[i] = temp;
    }

  }

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

  moveCardToPlay(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      let cur_card = event.previousContainer.data[event.previousIndex];
      cur_card.tapped = 'untapped';
      cur_card.selected = false;
      cur_card.power_mod = 0;
      cur_card.toughness_mod = 0;
      cur_card.loyalty_mod = 0;
      cur_card.counter_1 = false;
      cur_card.counter_2 = false;
      cur_card.counter_3 = false;
      cur_card.multiplier = false;
      if (event.container.data.length < 3) {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
        this.sendSelectedToPlay(cur_card);
      }
    }
  }

  moveCardToHand(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      let cur_card = event.previousContainer.data[event.previousIndex];
      cur_card.tapped = 'untapped';
      cur_card.power_mod = 0;
      cur_card.toughness_mod = 0;
      cur_card.loyalty_mod = 0;
      cur_card.counter_1 = false;
      cur_card.counter_2 = false;
      cur_card.counter_3 = false;
      cur_card.multiplier = false;
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      if (this.selected_cards.length > 0) {
        for (let card of this.selected_cards) {
          if (card.card != cur_card) {
            this.user.hand.push(card.card);
            card.from.splice(card.from.indexOf(card.card), 1);
          }
          card.card.selected = false;
          card.card.tapped = 'untapped';
          card.card.power_mod = 0;
          card.card.toughness_mod = 0;
          card.card.loyalty_mod = 0;
          card.card.counter_1 = false;
          card.card.counter_2 = false;
          card.card.counter_3 = false;
          card.card.multiplier = false;
        }
        this.selected_cards = []
      }
    }
  }

  moveCardToCommandZone(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      let cur_card = event.previousContainer.data[event.previousIndex];
      if (cur_card.iscommander && cur_card.owner == this.user.name) {
        cur_card.tapped = 'untapped';
        cur_card.power_mod = 0;
        cur_card.toughness_mod = 0;
        cur_card.loyalty_mod = 0;
        cur_card.counter_1 = false;
        cur_card.counter_2 = false;
        cur_card.counter_3 = false;
        cur_card.multiplier = false;
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
        if (this.selected_cards.length > 0) { //prevent multiple dragging to the command zone
          for (let card of this.selected_cards) {
            card.card.selected = false;
          }
          this.selected_cards = [];
        }
      }
    }
  }

  moveCardToDeck(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      let cur_card = event.previousContainer.data[event.previousIndex];
      cur_card.tapped = 'untapped';
      cur_card.power_mod = 0;
      cur_card.toughness_mod = 0;
      cur_card.loyalty_mod = 0;
      cur_card.counter_1 = false;
      cur_card.counter_2 = false;
      cur_card.counter_3 = false;
      cur_card.multiplier = false;
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0,
      );
      if (this.selected_cards.length > 0) {
        for (let card of this.selected_cards) {
          if (card.card != cur_card) {
            this.user.deck.cards.push(card.card);
            card.from.splice(card.from.indexOf(card.card), 1);
          }
          card.card.selected = false;
          card.card.tapped = 'untapped';
          card.card.power_mod = 0;
          card.card.toughness_mod = 0;
          card.card.loyalty_mod = 0;
          card.card.counter_1 = false;
          card.card.counter_2 = false;
          card.card.counter_3 = false;
          card.card.multiplier = false;
        }
        this.selected_cards = []
      }
    }
  }

  moveCardToGrave(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      let cur_card = event.previousContainer.data[event.previousIndex];
      cur_card.tapped = 'untapped';
      cur_card.power_mod = 0;
      cur_card.toughness_mod = 0;
      cur_card.loyalty_mod = 0;
      cur_card.counter_1 = false;
      cur_card.counter_2 = false;
      cur_card.counter_3 = false;
      cur_card.multiplier = false;
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0,
      );
      if (this.selected_cards.length > 0) {
        for (let card of this.selected_cards) {
          if (card.card != cur_card) {
            this.user.grave.push(card.card);
            card.from.splice(card.from.indexOf(card.card), 1);
          }
          card.card.selected = false;
          card.card.tapped = 'untapped';
          card.card.power_mod = 0;
          card.card.toughness_mod = 0;
          card.card.loyalty_mod = 0;
          card.card.counter_1 = false;
          card.card.counter_2 = false;
          card.card.counter_3 = false;
          card.card.multiplier = false;
        }
        this.selected_cards = []
      }
    }
  }

  moveCardToExile(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      let cur_card = event.previousContainer.data[event.previousIndex];
      cur_card.tapped = 'untapped';
      cur_card.power_mod = 0;
      cur_card.toughness_mod = 0;
      cur_card.loyalty_mod = 0;
      cur_card.counter_1 = false;
      cur_card.counter_2 = false;
      cur_card.counter_3 = false;
      cur_card.multiplier = false;
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0,
      );
      if (this.selected_cards.length > 0) {
        for (let card of this.selected_cards) {
          if (card.card != cur_card) {
            this.user.exile.push(card.card);
            card.from.splice(card.from.indexOf(card.card), 1);
          }
          card.card.selected = false;
          card.card.tapped = 'untapped';
          card.card.power_mod = 0;
          card.card.toughness_mod = 0;
          card.card.loyalty_mod = 0;
          card.card.counter_1 = false;
          card.card.counter_2 = false;
          card.card.counter_3 = false;
          card.card.multiplier = false;
        }
        this.selected_cards = []
      }
    }
  }

  moveCardToTempZone(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      let cur_card = event.previousContainer.data[event.previousIndex];
      cur_card.tapped = 'untapped';
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0,
      );
      if (this.selected_cards.length > 0) {
        for (let card of this.selected_cards) {
          if (card.card != cur_card) {
            this.user.temp_zone.push(card.card);
            card.from.splice(card.from.indexOf(card.card), 1);
          }
          card.card.selected = false;
          card.card.tapped = 'untapped';
        }
        this.selected_cards = []
      }
    }
  }

  sendToPlayWrapper(card: any, from: any) {
    this.sendToPlay(card, from);
    this.sendSelectedToPlay(card);
  }

  sendSelectedToPlay(card: any) {
    if (this.selected_cards.length > 0) {
      for (let cur_card of this.selected_cards) {
        if (cur_card.card != card) {
          this.sendToPlay(cur_card.card, cur_card.from);
          cur_card.card.selected = false;
          cur_card.card.tapped = 'untapped';
        }
      }
      this.selected_cards = []
    }
  }

  sendToPlay(card: any, from: any[]) {
    for (let i = 0; i < this.user.playmat.length; i++) {
      if (this.user.playmat[i].length == 0) {
        card.tapped = 'untapped';
        card.selected = false;
        this.user.playmat[i].push(card);
        let old_loc = from.indexOf(card);
        from.splice(old_loc, 1);
        return;
      }
    }
    for (let i = 0; i < this.user.playmat.length; i++) {
      if (this.user.playmat[i].length == 1) {
        card.tapped = 'untapped';
        card.selected = false;
        this.user.playmat[i].push(card);
        let old_loc = from.indexOf(card);
        from.splice(old_loc, 1);
        return;
      }
    }
    for (let i = 0; i < this.user.playmat.length; i++) {
      if (this.user.playmat[i].length == 2) {
        card.tapped = 'untapped';
        card.selected = false;
        this.user.playmat[i].push(card);
        let old_loc = from.indexOf(card);
        from.splice(old_loc, 1);
        return;
      }
    }
  }

  sendToDeck(card: any, from: any[], location: number) {
    card.tapped = 'untapped';
    card.selected = false;
    card.power_mod = 0;
    card.toughness_mod = 0;
    card.loyalty_mod = 0;
    card.counter_1 = false;
    card.counter_2 = false;
    card.counter_3 = false;
    card.multiplier = false;
    if (location == -1) { //going to bottom
      this.user.deck.cards.push(card);
    }
    else if (location == 0) {
      this.user.deck.cards.unshift(card);
    }
    else {
      this.user.deck.cards.splice(this.user.deck.cards.length - (location - 1), 0, card); //this assumes # from the top
    }
    let old_loc = from.indexOf(card);
    from.splice(old_loc, 1);
    if (this.selected_cards.length > 0) {
      for (let cur_card of this.selected_cards) {
        if (cur_card.card != card) {
          if (location == -1) { //going to bottom
            this.user.deck.cards.push(cur_card.card);
          }
          else if (location == 0) {
            this.user.deck.cards.unshift(cur_card.card);
          }
          else {
            this.user.deck.cards.splice(this.user.deck.cards.length - (location - 1), 0, cur_card.card); //this assumes # from the top
          }
          cur_card.from.splice(cur_card.from.indexOf(cur_card.card), 1);
        }
        cur_card.card.selected = false;
        cur_card.card.tapped = 'untapped';
        cur_card.power_mod = 0;
        cur_card.toughness_mod = 0;
        cur_card.loyalty_mod = 0;
        cur_card.counter_1 = false;
        cur_card.counter_2 = false;
        cur_card.counter_3 = false;
        cur_card.multiplier = false;
      }
      this.selected_cards = []
    }
  }

  sendToHand(card: any, from: any[]) {
    card.tapped = 'untapped';
    card.selected = false;
    card.power_mod = 0;
    card.toughness_mod = 0;
    card.loyalty_mod = 0;
    card.counter_1 = false;
    card.counter_2 = false;
    card.counter_3 = false;
    card.multiplier = false;
    this.user.hand.push(card);
    let old_loc = from.indexOf(card);
    from.splice(old_loc, 1);
    if (this.selected_cards.length > 0) {
      for (let cur_card of this.selected_cards) {
        if (cur_card.card != card) {
          this.user.hand.push(cur_card.card);
          cur_card.from.splice(cur_card.from.indexOf(cur_card.card), 1);
        }
        cur_card.card.selected = false;
        cur_card.card.tapped = 'untapped';
        cur_card.power_mod = 0;
        cur_card.toughness_mod = 0;
        cur_card.loyalty_mod = 0;
        cur_card.counter_1 = false;
        cur_card.counter_2 = false;
        cur_card.counter_3 = false;
        cur_card.multiplier = false;
      }
      this.selected_cards = []
    }
  }

  sendToGrave(card: any, from: any[]) {
    card.tapped = 'untapped';
    card.selected = false;
    card.power_mod = 0;
    card.toughness_mod = 0;
    card.loyalty_mod = 0;
    card.counter_1 = false;
    card.counter_2 = false;
    card.counter_3 = false;
    card.multiplier = false;
    this.user.grave.push(card);
    let old_loc = from.indexOf(card);
    from.splice(old_loc, 1);
    if (this.selected_cards.length > 0) {
      for (let cur_card of this.selected_cards) {
        if (cur_card.card != card) {
          this.user.grave.push(cur_card.card);
          cur_card.from.splice(cur_card.from.indexOf(cur_card.card), 1);
        }
        cur_card.card.selected = false;
        cur_card.card.tapped = 'untapped';
        cur_card.power_mod = 0;
        cur_card.toughness_mod = 0;
        cur_card.loyalty_mod = 0;
        cur_card.counter_1 = false;
        cur_card.counter_2 = false;
        cur_card.counter_3 = false;
        cur_card.multiplier = false;
      }
      this.selected_cards = []
    }
  }

  sendToExile(card: any, from: any[]) {
    card.tapped = 'untapped';
    card.selected = false;
    card.power_mod = 0;
    card.toughness_mod = 0;
    card.loyalty_mod = 0;
    card.counter_1 = false;
    card.counter_2 = false;
    card.counter_3 = false;
    card.multiplier = false;
    this.user.exile.push(card);
    let old_loc = from.indexOf(card);
    from.splice(old_loc, 1);
    if (this.selected_cards.length > 0) {
      for (let cur_card of this.selected_cards) {
        if (cur_card.card != card) {
          this.user.exile.push(cur_card.card);
          cur_card.from.splice(cur_card.from.indexOf(cur_card.card), 1);
        }
        cur_card.card.selected = false;
        cur_card.card.tapped = 'untapped';
        cur_card.power_mod = 0;
        cur_card.toughness_mod = 0;
        cur_card.loyalty_mod = 0;
        cur_card.counter_1 = false;
        cur_card.counter_2 = false;
        cur_card.counter_3 = false;
        cur_card.multiplier = false;
      }
      this.selected_cards = []
    }
  }

  sendToTempZone(card: any, from: any[], player: any) {
    if (player) {
      card.tapped = 'untapped';
      card.selected = false;
      player.temp_zone.push(card);
      let old_loc = from.indexOf(card);
      from.splice(old_loc, 1);
      if (this.selected_cards.length > 0) {
        for (let cur_card of this.selected_cards) {
          if (cur_card.card != card) {
            player.temp_zone.push(cur_card.card);
            cur_card.from.splice(cur_card.from.indexOf(cur_card.card), 1);
          }
          cur_card.card.selected = false;
          cur_card.card.tapped = 'untapped';
        }
        this.selected_cards = []
      }
    }
  }

  reverse(array: any[]){
    return array.map((item,idx) => array[array.length-1-idx])
  }

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

  drawCard(count: number) {
    for (let i = 0; i < count; i++) {
      if(this.user.deck.cards.length > 0) {
        this.user.hand.push(this.user.deck.cards[0]);
        this.user.deck.cards.splice(0, 1);
      }
    }
    this.current_draw = 1;
  }

  drawToZone(count: number, type: string) {
    for (let i = 0; i < count; i++) {
      if (this.user.deck.cards.length > 0) {
        if (type === 'play') {
          this.sendToPlay(this.user.deck.cards[0], this.user.deck.cards);
        }
        else if (type === 'grave') {
          this.sendToGrave(this.user.deck.cards[0], this.user.deck.cards);
        }
        else if (type === 'exile') {
          this.sendToExile(this.user.deck.cards[0], this.user.deck.cards);
        }
        else if (type === 'temp_zone') {
          this.sendToTempZone(this.user.deck.cards[0], this.user.deck, this.user.cards);
        }
      }
    }
    this.current_drawto = 1;
  }

  drawToOtherTempZone(count: number, player: any) {
    if (player) {
      for (let i = 0; i < count; i++) {
        if (this.user.deck.cards.length > 0) {
          this.sendToTempZone(this.user.deck.cards[0], this.user.deck.cards, player);
        }
      }
    }
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

  untapAll() {
    for (let spot of this.user.playmat) {
      for (let card of spot) {
        card.tapped = 'untapped';
      }
    }
  }

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
