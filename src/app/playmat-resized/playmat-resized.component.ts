import { Component, OnInit } from '@angular/core';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {animate, state, style, transition, trigger} from "@angular/animations";

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

  user: any = {
    name: "Christian",
    hand:  [
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
    ]
  }

  players: any[] = [
    {
      name: "Christian"
    },
    {
      name: "David"
    },
    {
      name: "Liam"
    },
    {
      name: "George"
    },
    {
      name: "Ray"
    },
    {
      name: "Ryan"
    },
  ]

  hovered_card: any = null;

  constructor() { }

  ngOnInit(): void {
    for (let i = 0; i < 36; i++) {
      this.user_playmat.push([])
    }
  }

  moveCard(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      if (event.container.data.length < 3) {
        if (event.container.data.length > 0) {
          event.previousContainer.data[event.previousIndex].tapped = event.container.data[0].tapped
        }
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
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
}
