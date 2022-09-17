import {AfterContentInit, AfterViewInit, Component, OnInit} from '@angular/core';
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

  refresh() {
    this.sendMsg({request: 'games'});
  }

  ngOnInit(): void {
    this.WebsocketService.messages.subscribe(msg => {
      let json_data = msg;
      if (json_data.games) {
        this.games = json_data.games;
      }
    });
    this.sleep(1500).then(() => {
      this.refresh();
    })
  }

  sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}