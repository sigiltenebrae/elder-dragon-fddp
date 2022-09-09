import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {MatMenuTrigger} from "@angular/material/menu";
import { RightclickHandlerServiceService } from "../../services/rightclick-handler-service.service";
import {MatSelectionListChange} from "@angular/material/list";

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
  current_turn = 0;

  players: any[] = [
    {
      name: "David",
      life: 40,
      infect: 0,
      selected: false,
      turn: 0,
      hand: [
        {
          name: "Mayael the Anima",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/3/0/309d95ad-e46c-4407-894d-d4cfdc7017f8.jpg?1562905228",
          text: "{R}{G}{W}, {T}: Look at the top five cards of your library. You may put a creature card with power 5 or greater from among them onto the battlefield. Put the rest on the bottom of your library in any order.",
          mana: "{R}{G}{W}",
          tapped: 'untapped',
        },
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
      grave: [],
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
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
      ],
      deck_name: "Enrage",
      deck: [
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
        {
          name: "Gishath, Sun's Avatar",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
          text: "Vigilance, trample, haste\n" +
            "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
          mana: "(5){R}{G}{W}",
          tapped: 'untapped',
        },
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
      grave: [],
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
      grave: [],
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
        {
          name: "Muldrotha, the Gravetide",
          image: "https://c1.scryfall.com/file/scryfall-cards/large/front/c/6/c654737d-34ac-42ff-ae27-3a3bbb930fc1.jpg?1591204580",
          text: "During each of your turns, you may play a land and cast a permanent spell of each permanent type from your graveyard. ",
          mana: "(3){B}{G}{U}",
          tapped: 'untapped',
        },
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
      grave: [],
      exile: [],
      temp_zone: []
    },
  ]

  hovered_card: any = null;
  rightclicked_item: any = null;
  current_draw = 1;
  current_drawto = 1;

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
      if (event.container.data.length < 3) {
        /*if (event.container.data.length > 0) {
          event.previousContainer.data[event.previousIndex].tapped = event.container.data[0].tapped
        }
        else {
          event.previousContainer.data[event.previousIndex].tapped = 'untapped';
        }*/
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      }
    }
  }

  moveCardToHand(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  moveCardToDeck(event: CdkDragDrop<any>) {
    if (event.previousContainer !== event.container) {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0,
      );
    }
  }

  moveCardToGrave(event: CdkDragDrop<any>) {
    if (event.previousContainer !== event.container) {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0,
      );
    }
  }

  moveCardToExile(event: CdkDragDrop<any>) {
    if (event.previousContainer !== event.container) {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0,
      );
    }
  }

  moveCardToTempZone(event: CdkDragDrop<any>) {
    if (event.previousContainer !== event.container) {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        0,
      );
    }
  }

  sendToField(card: any, from: any[]) {
    for (let i = 0; i < this.user_playmat.length; i++) {
      if (this.user_playmat[i].length == 0) {
        this.user_playmat[i].push(card);
        let old_loc = from.indexOf(card);
        from.splice(old_loc, 1);
        return;
      }
    }
    for (let i = 0; i < this.user_playmat.length; i++) {
      if (this.user_playmat[i].length == 1) {
        this.user_playmat[i].push(card);
        let old_loc = from.indexOf(card);
        from.splice(old_loc, 1);
        return;
      }
    }
    for (let i = 0; i < this.user_playmat.length; i++) {
      if (this.user_playmat[i].length == 2) {
        this.user_playmat[i].push(card);
        let old_loc = from.indexOf(card);
        from.splice(old_loc, 1);
        return;
      }
    }
  }

  sendToGrave(card: any, from: any[]) {
    this.user.grave.push(card);
    let old_loc = from.indexOf(card);
    from.splice(old_loc, 1);
  }

  sendToExile(card: any, from: any[]) {
    this.user.exile.push(card);
    let old_loc = from.indexOf(card);
    from.splice(old_loc, 1);
  }

  sendToTempZone(card: any, from: any[], player: any) {
    if (player) {
      player.temp_zone.push(card);
      let old_loc = from.indexOf(card);
      from.splice(old_loc, 1);
      console.log(this.players);
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
          this.sendToField(this.user.deck[0], this.user.deck);
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

  drawToActive() {
    if (this.selected_player != null) {
      if(this.user.deck.length > 0) {
        this.selected_player.hand.push(this.user.deck[0]);
        this.user.deck.splice(0, 1);
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
