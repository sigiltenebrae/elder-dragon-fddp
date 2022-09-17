import { Component, OnInit } from '@angular/core';
import {FddpWebsocketService} from "../../services/fddp-websocket.service";

@Component({
  selector: 'app-game-manager',
  templateUrl: './game-manager.component.html',
  styleUrls: ['./game-manager.component.scss']
})
export class GameManagerComponent implements OnInit {

  games: any[] = [];
  received: any[] = [];

  constructor(private WebsocketService: FddpWebsocketService) {
  }

  sendMsg(content: any) {
    let message = {
      source: '',
      content: {}
    };
    message.source = 'localhost';
    message.content = content;
    this.WebsocketService.messages.next(message);
  }

  createGame(name: string, max_players: any, type?: string) {
    this.sendMsg(
      {
        create: {
          name: name,
          max_players: Number(max_players),
          type: type ? type: 'commander'
        }
      }

    );
  }

  ngOnInit(): void {
    this.WebsocketService.messages.subscribe(msg => {
      let json_data = msg;
      this.received.push(json_data);
    });
    //replace this with a refresh button?
    let game_interval = setInterval(() => {
      this.sendMsg({request: 'games'});
      console.log('received games');
      this.games = this.received[0];
      this.received.splice(0, 1);
    }, 5000);
  }

}
