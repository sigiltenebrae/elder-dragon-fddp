import { Component, OnInit } from '@angular/core';
import {CdkDrag, CdkDragDrop, CdkDragEnd, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";

@Component({
  selector: 'app-playmat',
  templateUrl: './playmat.component.html',
  styleUrls: ['./playmat.component.scss']
})

export class PlaymatComponent implements OnInit {

  hovered_card: any = null;

  user: any = {
    name: "Christian"
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
  ]

  user_playmat: any[] = Array.from({ length: 18 } , () => ([]))
  user_hand: any[] = [
    {
      name: "Gishath, Sun's Avatar",
      image: "https://c1.scryfall.com/file/scryfall-cards/large/front/7/3/7335e500-342d-476d-975c-817512e6e3d6.jpg?1562558022",
      text: "Vigilance, trample, haste\n" +
        "Whenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
      mana: "(5){R}{G}{W}"
    },
    {
      name: "Hubris",
      image: "https://c1.scryfall.com/file/scryfall-cards/large/front/0/5/05f5b473-edad-43a9-b4e7-b6d3fc877cf2.jpg?1593095462",
      text: "Return target creature and all Auras attached to it to their owners' hands.",
      mana: "(1){U}"
    },
    {
      name: "Solitude",
      image: "https://c1.scryfall.com/file/scryfall-cards/large/front/f/e/febad44a-eaf0-4122-87c5-a12d17f28392.jpg?1628337214",
      text: "Flash\n" +
        "Lifelink\n" +
        "When Solitude enters the battlefield, exile up to one other target creature. That creature's controller gains life equal to its power.\n" +
        "Evoke—Exile a white card from your hand.",
      mana: "(3){W}{W}"
    }
  ];

  constructor() { }

  ngOnInit(): void {

  }

  reverse(array: any[]){
    return array.map((item,idx) => array[array.length-1-idx])
  }

  isOpponent(player: any) {
    return player.name !== this.user.name
  }

  moveCard(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
    else {
      if (event.container.data.length < 3) {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      }
    }
  }

}
