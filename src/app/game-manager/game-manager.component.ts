import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-game-manager',
  templateUrl: './game-manager.component.html',
  styleUrls: ['./game-manager.component.scss']
})
export class GameManagerComponent implements OnInit {

  games: any[] = [1, 2];

  constructor() { }

  ngOnInit(): void {
  }

}
