import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {MatMenuTrigger} from "@angular/material/menu";
import { RightclickHandlerServiceService } from "../../services/rightclick-handler-service.service";
import {MatSelectionListChange} from "@angular/material/list";
import {MatSidenav} from "@angular/material/sidenav";

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

  user_playmat: any[] = []

  user: any = null;
  selected_player: any = null;
  sidenav_selected_player: any = null;
  current_turn = 0;

  players: any[] = [
    {
      name: "David",
      life: 40,
      infect: 0,
      selected: false,
      turn: 0,
      hand: [
      ],
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
      name: "Christian",
      life: 40,
      infect: 0,
      selected: false,
      turn: 1,
      hand: [
        {
          name: "Rakdos, Lord of Riots",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/2/1/2143f275-6d3e-4040-a60e-8259a82befdb.jpg?1612280030",
          text: "You can’t cast this spell unless an opponent lost life this turn.\n" +
            "\n" +
            "Flying, trample\n" +
            "\n" +
            "Creature spells you cast cost {1} less to cast for each 1 life your opponents have lost this turn.\n",
          mana: "{B}{B}{R}{R}",
          tapped: 'untapped',
        },
      ],
      commander: [
        {
          name: "Rakdos, Lord of Riots",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/2/1/2143f275-6d3e-4040-a60e-8259a82befdb.jpg?1612280030",
          text: "You can’t cast this spell unless an opponent lost life this turn.\n" +
            "\n" +
            "Flying, trample\n" +
            "\n" +
            "Creature spells you cast cost {1} less to cast for each 1 life your opponents have lost this turn.\n",
          mana: "{B}{B}{R}{R}",
          tapped: 'untapped',
        },
      ],
      deck_name: "Enrage",
      deck: [
      ],
      grave: [
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Hubris",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/0/5/05f5b473-edad-43a9-b4e7-b6d3fc877cf2.jpg?1593095462",
          text: "Return target creature and all Auras attached to it to their owners' hands.",
          mana: "(1){U}",
          tapped: 'untapped',
        },
        {
          name: "Solitude",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/f/e/febad44a-eaf0-4122-87c5-a12d17f28392.jpg?1628337214",
          text: "Flash\n" +
            "Lifelink\n" +
            "When Solitude enters the battlefield, exile up to one other target creature. That creature's controller gains life equal to its power.\n" +
            "Evoke—Exile a white card from your hand.",
          mana: "(3){W}{W}",
          tapped: 'untapped'
        }
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

  hovered_card: any = null;
  rightclicked_item: any = null;
  sidenav_type: any = null;
  current_draw = 1;
  current_drawto = 1;
  selected_cards: any[] = [];
  sidenav_sort = '';
  sidenav_scry = 0;

  constructor(private rightClickHandler: RightclickHandlerServiceService) { }

  ngOnInit(): void {
    for (let i = 0; i < 36; i++) {
      this.user_playmat.push([])
    }
    this.rightClickHandler.overrideRightClick();
    for (let player of this.players) {
      if (player.name === "Christian") {
        this.user = player;
      }
    }
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
            this.user.deck.push(card.card);
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
    for (let i = 0; i < this.user_playmat.length; i++) {
      if (this.user_playmat[i].length == 0) {
        card.tapped = 'untapped';
        card.selected = false;
        this.user_playmat[i].push(card);
        let old_loc = from.indexOf(card);
        from.splice(old_loc, 1);
        return;
      }
    }
    for (let i = 0; i < this.user_playmat.length; i++) {
      if (this.user_playmat[i].length == 1) {
        card.tapped = 'untapped';
        card.selected = false;
        this.user_playmat[i].push(card);
        let old_loc = from.indexOf(card);
        from.splice(old_loc, 1);
        return;
      }
    }
    for (let i = 0; i < this.user_playmat.length; i++) {
      if (this.user_playmat[i].length == 2) {
        card.tapped = 'untapped';
        card.selected = false;
        this.user_playmat[i].push(card);
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
      this.user.deck.push(card);
    }
    else if (location == 0) {
      this.user.deck.unshift(card);
    }
    else {
      this.user.deck.splice(this.user.deck.length - (location - 1), 0, card); //this assumes # from the top
    }
    let old_loc = from.indexOf(card);
    from.splice(old_loc, 1);
    if (this.selected_cards.length > 0) {
      for (let card of this.selected_cards) {
        if (card.card != card) {
          if (location == -1) { //going to bottom
            this.user.deck.push(card.card);
          }
          else if (location == 0) {
            this.user.deck.unshift(card.card);
          }
          else {
            this.user.deck.splice(this.user.deck.length - (location - 1), 0, card.card); //this assumes # from the top
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
      if(this.user.deck.length > 0) {
        this.user.hand.push(this.user.deck[0]);
        this.user.deck.splice(0, 1);
      }
    }
    this.current_draw = 1;
  }

  drawToZone(count: number, type: string) {
    for (let i = 0; i < count; i++) {
      if (this.user.deck.length > 0) {
        if (type === 'play') {
          this.sendToPlay(this.user.deck[0], this.user.deck);
        }
        else if (type === 'grave') {
          this.sendToGrave(this.user.deck[0], this.user.deck);
        }
        else if (type === 'exile') {
          this.sendToExile(this.user.deck[0], this.user.deck);
        }
        else if (type === 'temp_zone') {
          this.sendToTempZone(this.user.deck[0], this.user.deck, this.user);
        }
      }
    }
    this.current_drawto = 1;
  }

  drawToOtherTempZone(count: number, player: any) {
    if (player) {
      for (let i = 0; i < count; i++) {
        if (this.user.deck.length > 0) {
          this.sendToTempZone(this.user.deck[0], this.user.deck, player);
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
    for (let spot of this.user_playmat) {
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
    this.getSidenavSort(this.user.deck)
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
      this.getSidenavSort(this.sidenav_selected_player.deck);
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
