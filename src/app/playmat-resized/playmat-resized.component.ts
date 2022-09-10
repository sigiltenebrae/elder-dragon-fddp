import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
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

  players_old: any[] = [
    {
      name: "David",
      life: 40,
      infect: 0,
      selected: false,
      turn: 0,
      hand: [],
      commander: [
        {
          name: "Mayael the Anima",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/3/0/309d95ad-e46c-4407-894d-d4cfdc7017f8.jpg?1562905228",
          text: "{R}{G}{W}, {T}: Look at the top five cards of your library. You may put a creature card with power 5 or greater from among them onto the battlefield. Put the rest on the bottom of your library in any order.",
          mana: "{R}{G}{W}",
          tapped: 'untapped',
        },
      ],
      deck_name: "Stompy",
      deck: [],
      grave: [
        {
          name: "Mayael the Anima",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/3/0/309d95ad-e46c-4407-894d-d4cfdc7017f8.jpg?1562905228",
          text: "{R}{G}{W}, {T}: Look at the top five cards of your library. You may put a creature card with power 5 or greater from among them onto the battlefield. Put the rest on the bottom of your library in any order.",
          mana: "{R}{G}{W}",
          tapped: 'untapped',
        },
      ],
      exile: [],
      temp_zone: []
    },
    {
      name: "Liam",
      life: 40,
      infect: 0,
      selected: false,
      turn: 2,
      hand: [
      ],
      commander: [
        {
          name: "Alela, Artful Provocateur",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/a/b/abc9e41e-fd03-4b6f-8f44-17ba94fa44f5.jpg?1650422625",
          text: "Flying, deathtouch, lifelink +\n" +
            "Other creatures you control with flying get +1/+0. + \n" +
            "Whenever you cast an artifact or enchantment spell, create a 1/1 blue Faerie creature token with flying.",
          mana: "(1){W}{U}{B}",
          tapped: 'untapped',
        },
      ],
      deck_name: "Artifacts",
      deck: [],
      grave: [
        {
          name: "Alela, Artful Provocateur",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/a/b/abc9e41e-fd03-4b6f-8f44-17ba94fa44f5.jpg?1650422625",
          text: "Flying, deathtouch, lifelink +\n" +
            "Other creatures you control with flying get +1/+0. + \n" +
            "Whenever you cast an artifact or enchantment spell, create a 1/1 blue Faerie creature token with flying.",
          mana: "(1){W}{U}{B}",
          tapped: 'untapped',
        },
      ],
      exile: [],
      temp_zone: []
    },
    {
      name: "George",
      life: 40,
      infect: 0,
      selected: false,
      turn: 3,
      hand: [
      ],
      commander: [
        {
          name: "Muldrotha, the Gravetide",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/c/6/c654737d-34ac-42ff-ae27-3a3bbb930fc1.jpg?1591204580",
          text: "During each of your turns, you may play a land and cast a permanent spell of each permanent type from your graveyard. ",
          mana: "(3){B}{G}{U}",
          tapped: 'untapped',
        },
      ],
      deck_name: "Mill Stuff",
      deck: [],
      grave: [
        {
          name: "Muldrotha, the Gravetide",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/c/6/c654737d-34ac-42ff-ae27-3a3bbb930fc1.jpg?1591204580",
          text: "During each of your turns, you may play a land and cast a permanent spell of each permanent type from your graveyard. ",
          mana: "(3){B}{G}{U}",
          tapped: 'untapped',
        },
      ],
      exile: [],
      temp_zone: []
    },
  ]

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

          out_player.selected = false;
          this.players.push(out_player);
          resolve();
        }
        else{
          resolve();
        }
      });
    });
  }

  ngOnInit(): void {
    this.loading = true;
    this.rightClickHandler.overrideRightClick();
    let game_promises: any[] = [];
    game_promises.push(this.loadPlayer("Christian", 8, 1));
    Promise.all(game_promises).then(() => {
      for (let player of this.players) {
        if (player.name === "Christian") {
          this.user = player;
        }
      }
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
        }
        this.selected_cards = []
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
      for (let card of this.selected_cards) {
        if (card.card != card) {
          if (location == -1) { //going to bottom
            this.user.deck.cards.push(card.card);
          }
          else if (location == 0) {
            this.user.deck.cards.unshift(card.card);
          }
          else {
            this.user.deck.cards.splice(this.user.deck.cards.length - (location - 1), 0, card.card); //this assumes # from the top
          }
          card.from.splice(card.from.indexOf(card.card), 1);
        }
        card.card.selected = false;
        card.card.tapped = 'untapped';
      }
      this.selected_cards = []
    }
  }

  sendToHand(card: any, from: any[]) {
    card.tapped = 'untapped';
    card.selected = false;
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
      }
      this.selected_cards = []
    }
  }

  sendToGrave(card: any, from: any[]) {
    card.tapped = 'untapped';
    card.selected = false;
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
      }
      this.selected_cards = []
    }
  }

  sendToExile(card: any, from: any[]) {
    card.tapped = 'untapped';
    card.selected = false;
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
      else {
        this.rightclicked_item = item;
        this.menuTopLeftPosition.x = event.clientX + 'px';
        this.menuTopLeftPosition.y = event.clientY + 'px';
        this.matMenuTrigger.openMenu();
      }
    }
  }
}
