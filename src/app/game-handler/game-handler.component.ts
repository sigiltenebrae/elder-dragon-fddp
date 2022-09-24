import {Component, HostListener, Inject, Injectable, OnInit, ViewChild} from '@angular/core';
import {CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {animate, state, style, transition, trigger, useAnimation} from "@angular/animations";
import {MatMenuTrigger} from "@angular/material/menu";
import { RightclickHandlerServiceService } from "../../services/rightclick-handler-service.service";
import {MatSelectionListChange} from "@angular/material/list";
import {MatSidenav} from "@angular/material/sidenav";
import {FddpApiService} from "../../services/fddp-api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {HttpClient} from "@angular/common/http";
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  of,
  OperatorFunction,
  switchMap,
  tap
} from 'rxjs';
import * as Scry from "scryfall-sdk";
import { shakeX } from 'ng-animate';
import {ActivatedRoute, Router} from "@angular/router";
import {TokenStorageService} from "../../services/token-storage.service";
import {FddpWebsocketService} from "../../services/fddp-websocket.service";
import {Scrollbar} from "ngx-scrollbar/lib/scrollbar/scrollbar";
import {NgScrollbar, NgScrollbarModule} from "ngx-scrollbar";
import {TokenInsertDialog, TokenSelectDialog, NoteDialog, DeckSelectDialog, CounterSetDialog, TwoHeadedTeamsDialog} from "./game-handler-addons.component";

@Component({
  selector: 'app-game-handler',
  templateUrl: './game-handler.component.html',
  styleUrls: ['./game-handler.component.scss'],
  animations: [
    // Each unique animation requires its own trigger. The first argument of the trigger function is the name
    trigger('userTappedState', [
      state('untapped', style({ transform: 'rotate(0)' })),
      state('tapped', style({ transform: 'rotate(90deg)' })),
      transition('tapped => untapped', animate('250ms ease-out')),
      transition('untapped => tapped', animate('250ms ease-in'))
    ]),
    trigger('opponentTappedState', [
      state('untapped', style({ transform: 'rotate(0)' })),
      state('tapped', style({ transform: 'rotate(90deg)' })),
      transition('tapped => untapped', animate('250ms ease-out')),
      transition('untapped => tapped', animate('250ms ease-in'))
    ]),
    trigger('shakeCard', [transition('false => true', useAnimation(shakeX))])
  ]
})
export class GameHandlerComponent implements OnInit {

  constructor(private rightClickHandler: RightclickHandlerServiceService, private fddp_data: FddpApiService,
              private snackbar: MatSnackBar, public dialog: MatDialog, private route: ActivatedRoute,
              private tokenStorage: TokenStorageService, private WebsocketService: FddpWebsocketService,
              private router: Router) { }

  //Page Interaction
  rightclicked_item: any = null; //Set to the object that triggers the right click event.
  menuTopLeftPosition =  {x: '0', y: '0'} //The top left position of the 'right click' menu

  //Game Data
  game_id = -1; //The game id (from the url)
  game_data: any = null; //The full game data object
  users_list: any[] = []; //The list of all users in the db
  current_user: any = null; //The currently logged-in user
  user: any = null; //The game data for the currently logged-in user

  //Board Interaction
  magnified_card: any = null; //Pointer to the card object
  magnifier_data: any = { shift_pressed: false, control_pressed: false }
  currently_dragging: any = null; //The cdkDrag object that is currently being dragged
  teammate_view: boolean = false; //True if the player is viewing their partner's field (in partner game modes)
  autoscroll = true; //Whether to autoscroll the action log
  selected_player: any = null; //The currently higlighted player
  sidenav_selected_player: any = null; //The player whose zone you are currently viewing

  //Messaging
  counter_buffer: any = false; //True if a counter update is in the message queue. Prevents counter updates from spamming

  ngOnInit(): void {
    this.rightClickHandler.overrideRightClick();

    this.fddp_data.getUsers().then((users: any) => {
      this.users_list = users;
    });

    const routeParams = this.route.snapshot.paramMap;
    this.game_id = Number(routeParams.get('gameid'));

    this.current_user = this.tokenStorage.getUser();

    this.WebsocketService.messages.subscribe(msg => {
      let json_data = msg;
    });

    this.sleep(1500).then(() => {
      this.sendMsg({
        request: 'game_data',
        game_id: this.game_id
      });
    });
  }

  /**
   * Sleep functions for the desired amount of time
   * @param ms time in ms
   */
  sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }


  /**------------------------------------------------
   *        Game Data Management Functions          *
   ------------------------------------------------**/

  /**
   * Returns the player with the given id from the game data, null if player
   * is not found.
   * @param id number representing the id of the player
   */
  getPlayerFromId(id: number) {
    for (let player of this.game_data.players) {
      if (player.id == id) {
        return player;
      }
    }
    return null;
  }

  getTeam(player: number) {
    for (let team of this.game_data.team_data) {
      for (let team_player of team.players) {
        if (player == team_player) {
          return team;
        }
      }
    }
    return null;
  }

  /**
   * Returns the data for a given user from the database, null if not found
   * @param id id of the user to search
   */
  getUserTableData(id: number) {
    for (let user_data of this.users_list) {
      if (user_data.id == id) {
        return user_data;
      }
    }
    return null;
  }

  initializePlayerDeck(name: string, id: number, deckid: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getDeckForPlay(deckid).then((deck_data: any) => {
        if (deck_data) {
          let deck: any = deck_data;
          let temp_sideboard: any[] = [];
          deck.cards.forEach((card: any) => { //Take the cards with multiples and split
            if (card.count > 1) {
              for (let i = 1; i < card.count; i++) {
                temp_sideboard.push(JSON.parse(JSON.stringify(card)));
              }
            }
          });
          temp_sideboard.forEach((temp_card) => { //change the id so they don't appear equivalent
            temp_card.id *= Math.random();
            deck.cards.push(temp_card);
          });
          deck.cards.forEach((card: any) => {
            card.count = 1;
          });

          let out_player: any = {};
          out_player.star_color = null;
          out_player.teammate_id = null;
          out_player.deck = deck;
          out_player.deck.commander = {name: 'commander', cards: [], saved: [], owner: out_player.deck.owner};
          out_player.name = name;
          out_player.id = id;
          out_player.life = 40;
          out_player.infect = 0;
          out_player.playmat = []
          out_player.turn = -1;
          out_player.command_tax_1 = 0;
          out_player.command_tax_2 = 0;
          out_player.scooped = false;
          out_player.top_flipped = false;
          out_player.card_preview = { position : {x: 1502, y: 430}}
          out_player.play_counters = [];
          for (let i = 0; i < 36; i++) {
            out_player.playmat.playmat.push({ name: 'play', id: i, owner: 1, cards: [] })
          }
          out_player.hand = {owner: out_player.deck.owner, name: 'hand', cards: []};
          out_player.hand_preview = [out_player.id];
          out_player.grave = {owner: out_player.deck.owner, name: 'grave', cards: []};;
          out_player.exile = {owner: out_player.deck.owner, name: 'exile', cards: []};;
          out_player.temp_zone = {owner: out_player.deck.owner, name: 'temp_zone', cards: []};;
          out_player.deck.cards.forEach((card: any) => {
            card.counter_1 = false;
            card.counter_2 = false;
            card.counter_3 = false;
            card.multiplier = false;
            card.counter_1_value = 0;
            card.counter_2_value = 0;
            card.counter_3_value = 0;
            card.multiplier_value = 0;
            card.owner = out_player.deck.owner;
            card.power_mod = 0;
            card.toughness_mod = 0;
            card.loyalty_mod = 0;
            card.locked = false;
            card.primed = false;
            card.triggered = false;
            card.is_token = false;
            card.tapped = 'untapped';
            card.sidenav_visible = true;
            card.visible = [];
            card.alt = false;
            card.facedown = false;
            card.shaken = false;
            card.inverted = false;
            card.notes = '';
            if (card.iscommander) {
              out_player.deck.commander.cards.push(card);
            }
          })
          out_player.deck.commander.forEach((card: any) => {
            out_player.deck.commander.saved.push(card);
            out_player.deck.cards.splice(deck.cards.indexOf(card), 1);
          })
          this.shuffleDeck(out_player.deck.cards);

          this.sendMsg({
            request: 'player_change',
            game_id: this.game_id,
            player_data:
              {
                id: id,
                player: out_player,
                new_deck: true
              }
          });
          console.log(out_player);
          resolve();
        } else {
          resolve();
        }
      });
    });
  }

  initializeSpectator(name: string, id: number) {
    let out_player: any = {};
    out_player.scooped = true;
    out_player.deck = null;
    out_player.name = name;
    out_player.id = id;
    out_player.playmat = []
    out_player.turn = -1;
    out_player.card_preview = { position : {x: 0, y: 0}}
    out_player.play_counters = [];
    out_player.hand = null;
    out_player.grave = null;
    out_player.exile = null;
    out_player.temp_zone = null;
    this.sendMsg({
      request: 'player_change',
      game_id: this.game_id,
      player_data:
        {
          id: id,
          player: out_player,
          new_deck: true
        }
    });
  }

  startGame() {
    if (this.game_data.type == 1 || this.game_data.type == 3) {
      this.sendMsg({start: true, game_id: this.game_id, message: 'starting the game!'});
      this.game_data.turn_count = 1;
    }
    else if (this.game_data.type == 2) {
      this.selectTeams();
    }
  }

  selectTeams(): void {
    let p: any[] = [];
    for (let player of this.game_data.players) {
      if (!player.scooped) {
        p.push(player);
      }
    }
    if (p.length % 2 == 0) {
      let team_array: any[] = []
      for (let i = 0; i < p.length / 2; i++){
        team_array.push([]);
        console.log(team_array);
      }
      const teamDialogRef = this.dialog.open(TwoHeadedTeamsDialog, {
        data: {
          players: p,
          team_array: team_array
        }
      });
      teamDialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.sendMsg({start: true, game_id: this.game_id, teams: result});
        }
      });
    }
    else {
      this.snackbar.open('Cannot make teams with an odd number of active players.',
        'dismiss', {duration: 3000});
    }
  }

  openDeckSelectDialog(): void {
    const deckDialogRef = this.dialog.open(DeckSelectDialog, {
      width: '1600px',
      data: {user: this.current_user.id}
    });

    deckDialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectDeck(result);
      }
    })
  }

  selectDeck(deck: any) {
    this.clearSelection();
    this.setPlayerDeck(this.current_user.name, this.current_user.id, deck.id);
  }

  scoopDeck(noUpdateTeam?: boolean): void {
    this.clearSelection();
    for (let player of this.game_data.players) {
      for (let spot of player.playmat) {
        for (let card of spot) {
          if (card.owner == this.user.id) {
            this.sendCardToZone(card, spot, 'deck', true);
          }
        }
      }
    }
    this.sendAllTo(this.user.hand, 'hand', 'deck');
    this.sendAllTo(this.user.grave, 'grave', 'deck');
    this.sendAllTo(this.user.exile, 'exile', 'deck');
    this.sendAllTo(this.user.temp_zone, 'temp_zone', 'deck');
    for (let spot of this.user.playmat) {
      for(let card of spot) {
        this.selectCard(card, spot);
        if (card.owner != this.user.id) {
          this.sendCardToZone(card, spot, 'temp_zone', true);
        }
        else {
          this.sendCardToZone(card, spot, 'deck', true);
        }
      }
    }
    this.user.deck = null;
    this.user.scooped = true;
    this.sendScoopUpdate(noUpdateTeam);
  }

  endGame(winner: any, winner_two: any) {
    this.sendMsg({end: true, game_id: this.game_id, winner: winner, winner_two: winner_two, message: 'ending the game!'});
  }

  endTurn() {
    if (this.game_data.type == 1 || this.game_data.type == 3) {
      console.log('trying to end turn');
      if (this.game_data.current_turn == this.user.turn) {
        this.sendMsg({
          request: 'end_turn',
          game_id: this.game_id,
        });
      }
    }
    else if (this.game_data.type == 2) {
      console.log('ending turn');
      if (this.game_data.current_turn == this.getTeam(this.user.id).turn) {
        console.log('sending turn end message');
        this.sendMsg({
          request: 'end_turn',
          game_id: this.game_id,
        });
      }
    }
  }



  /**------------------------------------------------
   *      Playmat Display Utility Functions         *
   ------------------------------------------------**/

  /**
   * Helper function for changing whose board is being displayed.
   */
  currentPlayer() {
    return this.user;
  }

  selectPlayer(selector: any) {
    if (this.isOpponent(selector) || this.isTeammate(selector)) {
      this.selected_player = selector;
    }
    else {
      this.selected_player = null;
    }
  }

  isOpponent(player: any) {
    if (this.game_data.type == 2) {
      if (player.id == this.current_user.id) {
        return false;
      }
      else if (this.user != null && player.id == this.user.teammate_id) {
        return false;
      }
      return true;
    }
    else {
      return player.id !== this.current_user.id
    }
  }

  isTeammate(player: any) {
    if (this.user != null && player.id == this.user.teammate_id) {
      return true;
    }
    else {
      return false;
    }
  }

  /**
   * Detects if a given card is a copy of a real card.
   * @param card card object to check
   */
  isClone(card: any): boolean {
    return card.is_token && !card.types.includes('Token') && !card.types.includes('Emblem');
  }


  /**
   * Detects if a given card is a permanent by reading its types.
   * @param card card object to check.
   */
  isPermanent(card: any) {
    if (card.types) {
      return card.types.includes("Creature") ||
        card.types.includes("Artifact") ||
        card.types.includes("Enchantment") ||
        card.types.includes("Land");
    }
  }

  isUnnatural(card: any) {
    if (card.types) {
      return card.types.includes("Artifact") ||
        card.types.includes("Enchantment");
    }
  }

  isHistoric(card: any) {
    if (card.types) {
      return card.types.includes("Legendary") ||
        card.types.includes("Artifact") ||
        card.types.includes("Saga");
    }
  }

  /**
   * Toggles the tap state of an input card
   * @param card
   */
  toggleCardTap(card: any) {
    if (card.tapped === 'tapped') {
      card.tapped = 'untapped';
    }
    else {
      card.tapped = 'tapped';
    }
  }

  invertCard(card:any) {
    card.inverted = !card.inverted;
    this.sendPlayerUpdate('*' + this.user.name + '*' + ' {invert} ' + card.name);
  }

  flipCard(card:any) {
    if (card.facedown) {
      card.facedown = false;
      for(let player of this.game_data.players) {
        card.visible.push(player.id);
      }
    }
    else {
      card.facedown = true;
      card.visible = [];
    }
    this.sendPlayerUpdate('*' + this.user.name + '*' + ' {flip} ' + card.name);
  }

  altFaceCard(card: any) {
    if (card.back_face) {
      let temp_image = card.image;
      let temp_mana_cost = card.mana_cost;
      let temp_types = card.types;
      let temp_oracle_text = card.oracle_text;
      let temp_power = card.power;
      let temp_toughness = card.toughness;
      let temp_loyalty = card.loyalty;

      card.image = card.back_image;
      card.mana_cost = card.back_mana_cost;
      card.types = card.back_types;
      card.oracle_text = card.back_oracle_text;
      card.power = card.back_power;
      card.toughness = card.back_toughness;
      card.loyalty = card.back_loyalty;

      card.back_image = temp_image;
      card.back_mana_cost = temp_mana_cost;
      card.back_types = temp_types;
      card.back_oracle_text = temp_oracle_text;
      card.back_power = temp_power;
      card.back_toughness = temp_toughness;
      card.back_loyalty = temp_loyalty;

      card.alt = !card.alt;
    }
    this.sendPlayerUpdate('*' + this.user.name + '* {alt} ' + card.name);
  }

  editNotes(card: any) {
    const noteDialogRef = this.dialog.open(NoteDialog, {
      width: '500px',
      data: {card: card}
    });
    noteDialogRef.afterClosed().subscribe(result => {
      if (result) {
        card.notes = result;
        this.sendPlayerUpdate('*' + this.user.name + '* {edit_note} on ' + card.name);
      }
    })

  }

  shakeCard(card: any, id: number, location: string) {
    card.shaken = true;
    setTimeout(() => {
      card.shaken = false;
    }, 3000);
    this.sendMsg({
      request: 'shake',
      game_id: this.game_id,
      card: {
        id: card.id,
        user: id,
        location: location
      },
      message: '*' + this.user.name + '* has {shake} [[' + card.name + ']] in ' + this.getPlayer(id).name + " 's " + location
    });
  }

  cardShake(cardid: number, userid: number, location: string) {
    let shake_player = this.getPlayerFromId(userid);
    if (shake_player) {
      switch (location) {
        case 'hand':
          for (let card of shake_player.hand) {
            if (card.id == cardid) {
              card.shaken = true;
              setTimeout(() => {
                card.shaken = false;
              }, 3000);
              break;
            }
          }
          break;
        case 'play':
          for (let spot of shake_player.playmat) {
            for (let card of spot) {
              if (card.id == cardid) {
                card.shaken = true;
                setTimeout(() => {
                  card.shaken = false;
                }, 3000);
                return;
              }
            }
          }
          break;
        default:
          console.log('shake');
          break;
      }
    }
  }

  cloneCard(card: any) {
    let card_clone = JSON.parse(JSON.stringify(card));
    card_clone.is_token = true;
    card_clone.selected = false;
    this.clearCard(card_clone);
    card_clone.visible = [];
    for(let player of this.game_data.players) {
      card_clone.visible.push(player.id);
    }
    this.user.temp_zone.push(card_clone);
    this.sendPlayerUpdate('*' + this.user.name + '* {clone} ' + card.name);
  }

  createToken(token: any) {
    let out_tokens: any[] = [];
    for (let tok of this.user.deck.tokens) {
      if (tok.name.toLowerCase() === token.name.toLowerCase()) {
        let out_token: any = null;
        out_token = JSON.parse(JSON.stringify(tok));
        out_token.is_token = true;
        out_token.selected = false;
        out_token.owner = -1;
        this.clearCard(out_token);
        out_token.visible = [];
        for(let player of this.game_data.players) {
          out_token.visible.push(player.id);
        }
        out_tokens.push(out_token);
      }
    }
    if (out_tokens.length == 1) {
      this.user.temp_zone.push(out_tokens[0]);
      this.clearSelection();
      this.sendPlayerUpdate('*' + this.user.name + '* {create_token} ' + token.name);
    }
    else if (out_tokens.length > 1) {
      const tokDialogRef = this.dialog.open(TokenSelectDialog, {
        width: '800px',
        data: {tokens: out_tokens},
      });
      tokDialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.createTokenFromImage(result);
        }
      });
    }
    else {
      this.fddp_data.getCardInfo(token.name).then((token_data: any) => {
        this.getCardImages(token.name).then((image_data: any) => {
          let images = image_data;
          let out_token = token_data;
          out_token.is_token = true;
          out_token.selected = false;
          out_token.image = images.length > 0 ? images[0]: null;
          this.clearCard(out_token);
          this.user.temp_zone.push(out_token);
          this.sendPlayerUpdate('*' + this.user.name + '* {create_token} ' + token.name);
          return;
        });
      })
    }
  }

  createTokenFromImage(result: any) {
    this.clearSelection();
    this.fddp_data.getCardInfo(result.name).then((token_data: any) => {
      let out_token: any = token_data;
      out_token.is_token = true;
      out_token.selected = false;
      out_token.image = result.image;
      this.clearCard(out_token);
      out_token.visible = [];
      for(let player of this.game_data.players) {
        out_token.visible.push(player.id);
      }
      this.user.temp_zone.push(out_token);
      this.sendPlayerUpdate('*' + this.user.name + '* {create_token} ' + result.name);
      return;
    });

  }

  openTokenDialog(): void {
    const tokDialogRef = this.dialog.open(TokenInsertDialog, {
      width: '800px',
      data: {},
    });

    tokDialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createTokenFromImage(result);
      }
    });
  }

  getCardImages(name: string): Promise<any> {
    return new Promise<any>((resolve) => {
      this.fddp_data.getImagesForCard(name).then((image_data: any) => {
        resolve(image_data.images);
      });
    })
  }

  untapAll() {
    let log = '*' + this.user.name + '*' + ' {untap}';
    for (let spot of this.user.playmat) {
      for (let card of spot) {
        if (!card.locked) {
          card.tapped = 'untapped';
          log += ' ' + card.name
        }
      }
    }
    this.sendPlayerUpdate(log);
  }

  flipTop() {
    this.user.top_flipped = !this.user.top_flipped;
    this.sendPlayerUpdate('*' + this.user.name + '*' + '{flip_top}');
  }

  shuffleDeck(cards: any[], update?: boolean) {
    for (let i = 0; i < cards.length; i++) {
      let r = i + Math.floor(Math.random() * (cards.length - i));
      let temp = cards[r];
      cards[r] = cards[i];
      cards[i] = temp;
    }
    if (update) {
      this.sendPlayerUpdate('*' + this.user.name + '* {shuffle}');
    }
  }

  /**
   * Returns the devotion count of a given color on the given player's board.
   * @param player player to check
   * @param color 'W', 'U', 'B', 'R', or 'G' are accepted
   */
  devotionCount(player: any, color: string) {
    let count = 0;
    if (player) {
      for (let spot of player.playmat) {
        for (let card of spot.cards) {
          if (this.isPermanent(card) && !card.is_token) {
            if (card.mana_cost) {
              card.mana_cost.forEach((mana: any) => { if(mana === color) { count++ }});
            }
          }
        }
      }
    }
    return count;
  }

  typeCount(player: any, zone: string, type: string) {
    let count = 0;
    if (player && zone && type && zone !== '' && type !== '') {
      let players = []
      if (player === 'All')
      {
        players = this.game_data.players;
      }
      else {
        if (this.getPlayer(player)) {
          players = [this.getPlayer(player)];
        }
      }
      for (let play of players) {
        if (zone === 'grave') {
          for (let card of play.grave) {
            if (type.toLowerCase() === 'permanent') {
              if (this.isPermanent(card)) {
                count++;
              }
            }
            else if (type.toLowerCase() === 'unnatural') {
              if (this.isUnnatural(card)) {
                count++;
              }
            }
            else if (type.toLowerCase() === 'historic') {
              if (this.isHistoric(card)) {
                count++;
              }
            }
            else {
              if (card.types) {
                for (let card_type of card.types) {
                  if (type.toLowerCase() === card_type.toLowerCase()) {
                    count++;
                  }
                }
              }
            }
          }
        }
        else if (zone === 'exile') {
          for (let card of play.exile) {
            if (type.toLowerCase() === 'permanent') {
              if (this.isPermanent(card)) {
                count++;
              }
            }
            else if (type.toLowerCase() === 'unnatural') {
              if (this.isUnnatural(card)) {
                count++;
              }
            }
            else if (type.toLowerCase() === 'historic') {
              if (this.isHistoric(card)) {
                count++;
              }
            }
            else {
              if (card.types) {
                for (let card_type of card.types) {
                  if (type.toLowerCase() === card_type.toLowerCase()) {
                    count++;
                  }
                }
              }
            }
          }
        }
        else if (zone === 'play') {
          for (let spot of play.playmat) {
            for (let card of spot) {
              if (type.toLowerCase() === 'permanent') {
                if (this.isPermanent(card)) {
                  if (card.multiplier) {
                    count += card.multiplier_value;
                  }
                  else {
                    count++;
                  }
                }
              }
              else if (type.toLowerCase() === 'unnatural') {
                if (this.isUnnatural(card)) {
                  if (card.multiplier) {
                    count += card.multiplier_value;
                  }
                  else {
                    count++;
                  }
                }
              }
              else if (type.toLowerCase() === 'historic') {
                if (this.isHistoric(card)) {
                  if (card.multiplier) {
                    count += card.multiplier_value;
                  }
                  else {
                    count++;
                  }
                }
              }
              else {
                if (card.types) {
                  for (let card_type of card.types) {
                    if (type.toLowerCase() === card_type.toLowerCase()) {
                      if (card.multiplier) {
                        count += card.multiplier_value;
                      }
                      else {
                        count++;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return count;
  }

  createCounter(type: string) {
    this.user.play_counters.push({
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      value: 0,
      search_type: '',
      search_player: this.user.id,
      search_zone: 'play',
      type: type,
      position: {x: 20, y: 20}
    });
    this.sendPlayerUpdate(null);
  }

  deleteCounter(counter: any) {
    this.user.play_counters.splice(this.user.play_counters.indexOf(counter), 1);
    this.sendPlayerUpdate(null);
  }

  deleteAllCounters() {
    this.user.play_counters = [];
    this.sendPlayerUpdate(null);
  }

  /**
   * Stores the new location of a counter after it has been dragged
   * @param event the drag event
   * @param counter the counter being updated
   */
  setCounterPosition(event: any, counter: any) {
    if (this.user != null) {
      counter.position = { ...(<any>event.source._dragRef)._passiveTransform };
      console.log(counter);
      this.sendPlayerUpdate(null);
    }
  }

  selectRandom(zone: any[], location: string) {
    let rand_card: any = {};
    if (zone.length == 1) {
      rand_card = zone[0];
      this.snackbar.open('Selected ' + zone[0].name + ' at random.',
        'dismiss', {duration: 3000});
    }
    else if (zone.length > 1) {
      rand_card = zone[Math.floor(Math.random() * zone.length)]
      this.snackbar.open('Selected ' + '"' + rand_card.name + '"' + ' at random.',
        'dismiss', {duration: 3000});
    }
    this.sendRandomUpdate(location, rand_card);
  }

  /**------------------------------------------------
   *          Message Handling Functions            *
   ------------------------------------------------**/

  @ViewChild('action_scroll') action_scroll: NgScrollbar;
  logAction(type: string, data: any) {
    switch(type) {
      case 'move':
        if (data.source.name !== data.dest.name) {
          this.game_data.action_log.push([
            {text: this.user.name, type: 'player'},
            {text: 'moved', type: 'regular'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}, //copy card so it isn't a pointer
            {text: 'from', type: 'regular'},
            {text: data.source.name, type: 'location'},
            {text: 'to', type: 'regular'},
            {text: data.dest.name, type: 'location'},
          ]);
          break;
        }
    }
    if (this.autoscroll) {
      this.action_scroll.scrollTo({ bottom: 0, duration: 600});
    }
  }

  updateCounter(name: string, after: any, options?: any) {
      if (!this.counter_buffer) {
        this.counter_buffer = true;
        setTimeout(() => {this.counter_buffer = false;
          if (options && options.team) {
            if (options.card) {

            }
            //this.sendTeamUpdate('*' + this.user.name + '* {counter_change} ' + name + ' to ' + after);
          }
          else {
            if (name !== '' && after != null) {
              //this.sendPlayerUpdate('*' + this.user.name + '* {counter_change} ' + name + ' to ' + after)
            }
            else {
              //this.sendPlayerUpdate(null);
            }
          }
        }, 3000);
      }
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

  sendRandomUpdate(zone: any, card: any) {
    if (!this.user.scooped) {
      this.sendMsg({
        game_id: this.game_data.id,
        user: this.user.name,
        request: 'select_random',
        zone: zone,
        card: card,
        message: '*' + this.user.name + '* has selected [[' + card.name + ']] at random from ' + zone
      })
    }
  }

  sendScoopUpdate(noUpdateTeam?: boolean) {
    if (this.user.scooped) {
      this.sendMsg({
        request: 'player_change',
        game_id: this.game_id,
        player_data:
          {
            id: this.current_user.id,
            player: this.user
          },
        message: '*' + this.user.name + '* has scooped their deck and left the game'
      });
      if (this.game_data.type == 2 && (noUpdateTeam == undefined || !noUpdateTeam)) {
        console.log('scooping deck')
        this.getTeam(this.user.id).scooped = true;
        console.log(this.getTeam(this.user.id));
        this.sendTeamScoopUpdate();
      }
    }
  }

  sendPlayerUpdate(message: any) {
    if (!this.user.scooped) {
      this.sendMsg({
        request: 'player_change',
        game_id: this.game_id,
        player_data:
          {
            id: this.current_user.id,
            player: this.user
          },
        message: message
      });
    }
  }

  sendTeamScoopUpdate() {
    if (this.getTeam(this.user.id).scooped) {
      this.sendMsg({
        request: 'team_change',
        game_id: this.game_id,
        team_data: this.getTeam(this.user.id),
      });
    }
  }

  sendTeamUpdate(message: any) {
    if (!this.getTeam(this.user.id).scooped) {
      this.sendMsg({
        request: 'team_change',
        game_id: this.game_id,
        team_data: this.getTeam(this.user.id),
        message: message
      });
    }
  }

  /**------------------------------------------------
   *    Input Detection/Replacement Functions       *
   ------------------------------------------------**/

  keyAllowed(event: any): boolean {
    if (event.target.nodeName !== "INPUT" &&
      event.target.nodeName !== 'TEXTAREA' &&
      !this.matMenuTrigger.menuOpen &&
      this.dialog.openDialogs.length == 0) {
      return true;
    }
    return false;
  }

  @HostListener('document:keydown', ['$event']) onKeyDown(event: any) {
    if (this.keyAllowed(event)) {
      switch (event.key) {
        case "Escape":
          this.clearSelection();
          break;
        case "Shift":
          this.card_preview_data.shift_pressed = !this.card_preview_data.shift_pressed;
          break;
        case "Control":
          this.card_preview_data.control_pressed = true;
          break;
        case "e":
          this.endTurn();
          break;
        case "o":
          if(this.user != null) {
            this.user.card_preview.position = {x: 0, y: 0};
          }
          break;
        case "p":
          this.togglePreview()
          break;
        case "s":
          this.shuffleDeck(this.user.deck.cards, true);
          break;
        case "d":
          this.drawX(1);
          break;
        case "f":
          this.openSideNav('deck');
          break;
        case "x":
          this.untapAll();
          break;
        case "m":
          this.mulliganHand(7);
          break;
      }
    }
    else if (event.key === "Enter") {
      if (this.matMenuTrigger.menuOpen) {
        this.matMenuTrigger.closeMenu();
      }
    }
  }

  @HostListener('document:keyup', ['$event']) onKeyUp(event: any) {
    if (this.keyAllowed(event)) {
      switch (event.key) {
        case "Control":
          this.card_preview_data.control_pressed = false;
          break;
      }
    }
  }

  @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: any;
  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    event.stopPropagation();
    this.rightclicked_item = item;
    this.menuTopLeftPosition.x = event.clientX + 'px';
    this.menuTopLeftPosition.y = event.clientY + 'px';
    this.matMenuTrigger.openMenu();
  }

  counterClick(event: any, counter: any) {
    if (event.ctrlKey) {
      const counterDialogRef = this.dialog.open(CounterSetDialog, {
        width: '500px',
        data: {
          value: counter.value
        }
      });
      counterDialogRef.afterClosed().subscribe(result => {
        if (result) {
          counter.value = result;
          this.updateCounter('', null);
        }
      });
    }
    else {
      counter.value = counter.value + 1;
      this.updateCounter('', null);
    }
  }

  lifeClick(event: any, player: any, team?: boolean) {
    if (event.ctrlKey) {
      const counterDialogRef = this.dialog.open(CounterSetDialog, {
        width: '500px',
        data: {
          value: player.life
        }
      });
      counterDialogRef.afterClosed().subscribe(result => {
        if (result) {
          player.life = result;
          this.updateCounter('life', player.life, team);
        }
      });
    }
    else {
      player.life = player.life + 1;
      this.updateCounter('life', player.life, team);
    }
  }

  infectClick(event: any, player: any, team?: boolean) {
    if (event.ctrlKey) {
      const counterDialogRef = this.dialog.open(CounterSetDialog, {
        width: '500px',
        data: {
          value: player.infect
        }
      });
      counterDialogRef.afterClosed().subscribe(result => {
        if (result) {
          player.infect = result;
          this.updateCounter('infect', player.infect, team);
        }
      });
    }
    else {
      player.infect = player.infect + 1;
      this.updateCounter('infect', player.infect, team);
    }
  }

  /**------------------------------------------------
   *           Card Relocation Functions            *
   ------------------------------------------------**/

  /**
   * Returns the source container for a drag event array.
   * @param array array to locate
   */
  getContainer(array: any[]) {
    if (array == this.user.deck.cards) {
      return this.user.deck;
    }
    else if (array == this.user.grave.cards) {
      return this.user.grave;
    }
    else if (array == this.user.exile.cards) {
      return this.user.exile;
    }
    else if (array == this.user.deck.commander.cards) {
      return this.user.deck.commander;
    }
    else if (array == this.user.hand.cards) {
      return this.user.hand;
    }
    else if (array == this.user.temp_zone.cards) {
      return this.user.temp_zone;
    }
    else { //Play
      for (let spot of this.user.playmat) {
        if (array == spot.cards) {
          return spot;
        }
      }
    }
  }

  /**
   * Get the zone with a given name for a player with given id
   * @param id id of player to search
   * @param zone name of the zone to get
   */
  getPlayerZone(id: number, zone: string) {
    switch (zone) {
      case 'deck':
        return this.getPlayerFromId(id).deck;
      case 'grave':
        return this.getPlayerFromId(id).grave;
      case 'exile':
        return this.getPlayerFromId(id).exile;
      case 'commander':
        return this.getPlayerFromId(id).deck.commander;
      case 'hand':
        return this.getPlayerFromId(id).hand;
      case 'temp_zone':
        return this.getPlayerFromId(id).temp_zone;
      case 'play':
        return this.getPlayerFromId(id).playmat;
      case this.getPlayerFromId(id).deck.name:
        return this.getPlayerFromId(id).deck;
    }
  }

  /**
   * Set the visibility for a card as it changes zones
   * @param card object to modify
   * @param dest_type string representing the destination
   */
  setVisibility(card: any, dest_type: string) {
    /*switch(dest_type) {
      case 'deck':
        card.visible = [];
        break;
      case 'grave':
        card.visible = [];
        if (this.game_data.players) {
          for (let player of this.game_data.players) {
            card.visible.push(player.id);
          }
        }
        break;
      case 'exile':
        if (!card.facedown) {
          card.visible = [];
          if (this.game_data.players) {
            for (let player of this.game_data.players) {
              card.visible.push(player.id);
            }
          }
        }
        break;
      case 'commander':
        card.visible = [];
        if (this.game_data.players) {
          for (let player of this.game_data.players) {
            card.visible.push(player.id);
          }
        }
        break;
      case 'temp_zone':
        if (!card.facedown) {
          card.visible = [];
          if (this.game_data.players) {
            for (let player of this.game_data.players) {
              card.visible.push(player.id);
            }
          }
        }
        break;
      case 'hand':
        card.visible = this.getPlayerFromId(card.owner).hand_preview;
        break;
      case 'play':
        if (!card.facedown) {
          card.visible = [];
          if (this.game_data.players) {
            for (let player of this.game_data.players) {
              card.visible.push(player.id);
            }
          }
        }
        break;
    }*/
    card.visible = [1];
  }

  /**
   * Drag a card from one array to another.
   * @param card the object being dragged.
   * @param dest the destination container, containing the destination array.
   * @param event the drag event.
   */
  dragCard(card: any, dest: any, event: any) {
    this.sendCardToZone(card, this.getContainer(event.previousContainer.data), dest,
      event.previousIndex, event.currentIndex);
  }

  /**
   * Move a card from one container to another.
   * @param card object to be moved
   * @param source the source container
   * @param dest the destination container
   * @param options supports
   * 'previousIndex': the index the object is currently at
   * 'currentIndex': the index the object is being moved to. Can be set manually for deck transfers.
   */
  sendCardToZone(card: any, source: any, dest: any, previousIndex: number, currentIndex: number, options?: any){
    //need to write an insert predicate for sidenav cdkdroplist that prevents dragging in once list is sorted.
    //Also prevents dragging in while scrying
    if (source == dest) {
      //need to check for sidenav here (options.sendTo is allowed as opposed to drag)
      moveItemInArray(source.cards, previousIndex, currentIndex);
    }
    else {
      if (dest.name !== 'play' && dest.name !== 'temp_zone' && !(dest.name === 'commander' && !card.iscommander)) {
        if (card.is_token) {
          source.cards.splice(source.cards.indexOf(card), 1);
        }
        else {
          //clear the card of counters etc.
          this.setVisibility(card, dest.name);
          if (card.owner == dest.owner) {
            if (options && options.deck && options.deck === 'bottom') {
              transferArrayItem(source.cards, dest.cards, previousIndex, dest.cards.length);
              this.logAction('move', {card: card, source: source, dest: dest});
            }
            else {
              transferArrayItem(source.cards, dest.cards, previousIndex, currentIndex);
              this.logAction('move', {card: card, source: source, dest: dest});
            }
          }
          else {
            if (options && options.deck && options.deck === 'bottom') {
              transferArrayItem(source.cards, this.getPlayerZone(card.owner, dest.name).cards, previousIndex, this.getPlayerZone(card.owner, dest.name).cards.length);
              this.logAction('move', {card: card, source: source, dest: dest});
            }
            else {
              transferArrayItem(source.cards, this.getPlayerZone(card.owner, dest.name).cards, previousIndex, 0);
              this.logAction('move', {card: card, source: source, dest: dest});
            }
          }
        }
      }
      else if (dest.name === 'play' || dest.name === 'temp_zone') {
        //It should never be possible to send/drag to someone else's playmat
        if (dest.name === 'play') {
          if (dest.cards.length < 3) {
            this.setVisibility(card, dest.name); //wait to set visibility until move is confirmed
            transferArrayItem(source.cards, dest.cards, previousIndex, currentIndex);
            this.logAction('move', {card: card, source: source, dest: dest});
          }
        }
        else if (dest.name === "temp_zone") { //You can put anything in the temp zone
          //If visibility needs to change (draw to play) you have to do it before calling the move.
          transferArrayItem(source.cards, dest.cards, previousIndex, currentIndex);
          this.logAction('move', {card: card, source: source, dest: dest});
        }
      }
    }
  }
}
