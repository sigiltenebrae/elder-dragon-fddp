import {Component, OnInit, ViewChild} from '@angular/core';
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";
import {FddpApiService} from "../../services/fddp-api.service";
import {MatTable} from "@angular/material/table";

@Component({
  selector: 'app-game-history',
  templateUrl: './game-history.component.html',
  styleUrls: ['./game-history.component.scss']
})
export class GameHistoryComponent implements OnInit {

  games = [];
  games_formatted = [];
  displayedColumns = ['id', 'name', 'created', 'status'];



  constructor(private tokenStorage: TokenStorageService, private router: Router, private fddp_data: FddpApiService) { }

  @ViewChild(MatTable) table: MatTable<any>;

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.fddp_data.getGames().then((games) => {
        this.games = games;
        this.games.forEach((game) => {
          let winners = [];
          let losers = [];
          if (!game.active) {
            for (let player of game.players) {
              if (player.winner) {
                winners.push({player_id: player.player_id, deck_id: player.deck_id});
              }
              else {
                losers.push({player_id: player.player_id, deck_id: player.deck_id});
              }
            }
          }
          this.games_formatted.push({
            id: game.id,
            name: game.name,
            created: game.created,
            winners: winners,
            losers: losers,
            status: !game.active ? "complete": !game.started ? "waiting":  "in progress"
          });
        })
        this.table.renderRows();
        console.log(this.games_formatted);
      });
    }
  }

}
