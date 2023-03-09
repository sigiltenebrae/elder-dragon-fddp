import { Component, OnInit } from '@angular/core';
import {TokenStorageService} from "../../services/token-storage.service";
import {ActivatedRoute, Router} from "@angular/router";
import {FddpApiService} from "../../services/fddp-api.service";
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";

@Component({
  selector: 'app-game-history-manager',
  templateUrl: './game-history-manager.component.html',
  styleUrls: ['./game-history-manager.component.scss']
})
export class GameHistoryManagerComponent implements OnInit {

  users = [];
  deck_list = [];

  winners = [];
  losers = [];

  gameid = -1;

  constructor(private tokenStorage: TokenStorageService, private router: Router,
              private route: ActivatedRoute, private fddp_data: FddpApiService) { }

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      const routeParams = this.route.snapshot.paramMap;
      this.gameid = Number(routeParams.get('gameid'));
      if (this.gameid > -1) {
        this.fddp_data.getUsers().then((users) => {
          this.users = users;
          this.fddp_data.getDeckList().then((deck_list) => {
            this.deck_list = deck_list.deck_list;
            this.fddp_data.getGameResults(this.gameid).then((results) => {
              for (let player of results) {
                if (player.winner) {
                  this.winners.push(player);
                }
                else {
                  this.losers.push(player);
                }
              }
            })
          })
        })
      }
    }
  }

  /**
   * Drop event handler
   * @param event
   */
  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  /**
   * Helper function to display player name given id
   * @param player_id
   */
  getPlayerName(player_id) {
    for (let user of this.users) {
      if (user.id === player_id) {
        return user.name;
      }
    }
    return '';
  }

  /**
   * Helper function to display deck name given id
   * @param deck_id
   */
  getDeckName(deck_id, player_id) {
    for (let deck of this.deck_list) {
      if (deck.id === deck_id) {
        if (deck.owner == player_id) {
          return deck.name;
        }
        else {
          return deck.name + ' (' + this.getPlayerName(deck.owner) + ')'
        }
      }
    }
    return '';
  }

  /**
   * Helper function to display the owner of the deck with given deck_id
   * @param deck_id
   */
  getDeckOwner(deck_id) {
    for (let deck of this.deck_list) {
      if (deck.id === deck_id) {
        return deck.owner;
      }
    }
    return -1;
  }

  /**
   * Update the winners for the game in the db.
   */
  submit_winners() {
    let results = [];
    for (let player of this.winners) {
      player.winner = true;
      results.push(player);
    }
    for (let player of this.losers) {
      player.winner = this.winners.length == 0 ? null: false;
      results.push(player);
    }
    this.fddp_data.updateGameResults(this.gameid, results).then(() => {
      this.router.navigate(['/history']);
    })

  }


}
