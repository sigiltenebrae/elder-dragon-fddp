import { Component, OnInit } from '@angular/core';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";

@Component({
  selector: 'app-playmat-resized',
  templateUrl: './playmat-resized.component.html',
  styleUrls: ['./playmat-resized.component.scss']
})
export class PlaymatResizedComponent implements OnInit {

  user_playmat: any[] = [
    [],[],[],[],[],[],[],[],[],[],[],[],
    [],[],[],[],[],[],[],[],[],[],[],[],
    [],[],[],[],[],[],[],[],[],[],[],[]
  ]

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

  hovered_card: any = null;

  constructor() { }

  ngOnInit(): void {
    console.log(this.user_playmat);
    for (let row of this.user_playmat) {
      for (let col of row) {
        console.log('test')
      }
    }
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
