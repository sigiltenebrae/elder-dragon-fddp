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
  displayedColumns = ['id', 'name', 'created', 'status', 'winners', 'edit'];
  users = [];
  deck_list = [];

  constructor(private tokenStorage: TokenStorageService, private router: Router, private fddp_data: FddpApiService) { }

  @ViewChild(MatTable) table: MatTable<any>;

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.fddp_data.getUsers().then((users) => {
        this.users = users;
        this.fddp_data.getDeckList().then((deck_list) => {
          this.deck_list = deck_list.deck_list;
          this.fddp_data.getGames().then((games) => {
            this.games = games;
            this.games.forEach((game) => {
              let winners = [];
              let losers = [];
              if (!game.active) {
                for (let player of game.players) {
                  if (player.winner) {
                    winners.push({player: this.getPlayerName(player.player_id),
                      deck: this.getDeckOwner(player.deck_id) === player.player_id ? this.getDeckName(player.deck_id):
                        this.getDeckName(player.deck_id) + ' (' + this.getPlayerName(this.getDeckOwner(player.deck_id)) + ')',
                      deck_id: player.deck_id});
                  }
                  else {
                    losers.push({player: this.getPlayerName(player.player_id), deck: this.getDeckOwner(player.deck_id) === player.player_id ? this.getDeckName(player.deck_id):
                        this.getDeckName(player.deck_id) + ' (' + this.getPlayerName(this.getDeckOwner(player.deck_id)) + ')',
                      deck_id: player.deck_id});
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
        });
      });
    }
  }

  getPlayerName(player_id) {
    for (let user of this.users) {
      if (user.id === player_id) {
        return user.name;
      }
    }
    return '';
  }

  getDeckName(deck_id) {
    for (let deck of this.deck_list) {
      if (deck.id === deck_id) {
        return deck.name;
      }
    }
    return '';
  }

  getDeckOwner(deck_id) {
    for (let deck of this.deck_list) {
      if (deck.id === deck_id) {
        return deck.owner;
      }
    }
    return -1;
  }

}
