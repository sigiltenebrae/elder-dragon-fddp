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


  constructor(private tokenStorage: TokenStorageService, private router: Router,
              private route: ActivatedRoute, private fddp_data: FddpApiService) { }

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      const routeParams = this.route.snapshot.paramMap;
      const gameid = Number(routeParams.get('gameid'));
      if (gameid > -1) {
        this.fddp_data.getUsers().then((users) => {
          this.users = users;
          this.fddp_data.getDeckList().then((deck_list) => {
            this.deck_list = deck_list.deck_list;
            this.fddp_data.getGameResults(gameid).then((results) => {
              console.log(results);
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

  getPlayerName(player_id) {
    for (let user of this.users) {
      if (user.id === player_id) {
        return user.name;
      }
    }
    return '';
  }

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

  getDeckOwner(deck_id) {
    for (let deck of this.deck_list) {
      if (deck.id === deck_id) {
        return deck.owner;
      }
    }
    return -1;
  }

  submit_winners() {

  }

}
