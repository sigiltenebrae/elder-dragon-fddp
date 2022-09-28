import {Component, HostListener, Inject, Injectable, OnInit, ViewChild} from '@angular/core';
import {CDK_DRAG_CONFIG, CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
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
import {
  TokenInsertDialog,
  TokenSelectDialog,
  NoteDialog,
  DeckSelectDialog,
  CounterSetDialog,
  TwoHeadedTeamsDialog,
  EndGameDialog,
  SelectColorsDialog
} from "./game-handler-addons.component";
import {Howl, Howler} from 'howler'

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
  ],
})
export class GameHandlerComponent implements OnInit {

  constructor(private rightClickHandler: RightclickHandlerServiceService, private fddp_data: FddpApiService,
              private snackbar: MatSnackBar, public dialog: MatDialog, private route: ActivatedRoute,
              private tokenStorage: TokenStorageService, private WebsocketService: FddpWebsocketService,
              private router: Router) { }

  //Page Interaction
  rightclicked_item: any = null; //Set to the object that triggers the right click event.
  menuTopLeftPosition =  {x: '0', y: '0'} //The top left position of the 'right click' menu
  notification_sound: any = null;

  //Game Data
  game_id = -1; //The game id (from the url)
  planes: any[] = [];
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
  draw_count: any = 1;
  draw_until = '';
  teamview = false;
  gridlines = false;

  //Sidenav
  sidenav_type: any = null;
  sidenav_sort_type: string = '';
  sidenav_sort = '';
  sidenav_scry_count = 0;

  //Messaging
  counter_buffer: any = false; //True if a counter update is in the message queue. Prevents counter updates from spamming
  team_counter = false;

  ngOnInit(): void {

    this.notification_sound = new Howl({
      src: ['assets/sound/synth-twinkle-alert-sound-001-8436.mp3']
    });

    this.rightClickHandler.overrideRightClick();

    this.fddp_data.getUsers().then((users: any) => {
      this.users_list = users;
    });

    this.fddp_data.getPlanes().then((planes: any) => {
      this.planes = planes;
    });

    const routeParams = this.route.snapshot.paramMap;
    this.game_id = Number(routeParams.get('gameid'));

    this.current_user = this.tokenStorage.getUser();
    this.gridlines = this.current_user.gridlines;

    this.WebsocketService.messages.subscribe(msg => {
      let json_data = msg;
      if (json_data.get) {
        if (json_data.get.game_data) {
          if (json_data.get.game_data.id) {
            this.game_data = json_data.get.game_data;
            if (this.game_data.players) {
              for (let player of this.game_data.players) {
                if (player.id == this.current_user.id) {
                  this.user = player;
                  if (this.user.deck) {
                    console.log('user loaded: ' + this.user.name);
                  }
                  if (this.user != null && !this.user.deck) {
                    this.openDeckSelectDialog();
                  }
                }
              }
            }
            if (this.user == null) {
              for (let spectator of this.game_data.spectators) {
                if (spectator.id == this.current_user.id) {
                  this.user = spectator;
                }
              }
              if (this.user == null) {
                this.messageSocket({
                  game_id: this.game_id,
                  put: {
                    action: 'update',
                    player_data: {
                      id: this.current_user.id,
                      name: this.current_user.name
                    }
                  }});
              }
            }
          }
          else {
            console.log('game does not exist');
            this.router.navigate(['/game']);
          }
        }
        if (json_data.get.player_data != null) {
          if (this.game_data) {
            for (let i = 0; i < this.game_data.players.length; i++) {
              if (this.game_data.players[i].id == json_data.get.player_data.id) {
                this.game_data.players[i] = json_data.get.player_data;
                if (this.selected_player != null && this.selected_player.id == json_data.get.player_data.id) {
                  this.selected_player = this.game_data.players[i];
                }
                break;
              }
            }
          }
        }
        if (json_data.get.spectator_data != null) {
          if (this.game_data) {
            let includes = false;
            for (let spec of this.game_data.spectators) {
              if (spec.id == json_data.get.spectator_data.id) {
                includes = true;
                break;
              }
            }
            if (!includes) {
              this.game_data.push(json_data.get.spectator_data);
              if (json_data.get.spectator_data.id == this.current_user.id) {
                this.user = json_data.get.spectator_data.id;
              }
            }
          }
        }
        if (json_data.get.zone_data) {
          for (let player of this.game_data.players) {
            if (player.id == json_data.get.zone_data.owner) {
              switch(json_data.get.zone_data.name) {
                case 'hand':
                  player.hand = json_data.get.zone_data;
                  break;
                case 'grave':
                  player.grave = json_data.get.zone_data;
                  break;
                case 'exile':
                  player.exile = json_data.get.zone_data;
                  break;
                case 'temp_zone':
                  player.temp_zone = json_data.get.zone_data;
                  break;
                case 'deck':
                  player.deck = json_data.get.zone_data;
                  break;
                case player.deck.name:
                  player.deck = json_data.get.zone_data;
                  break;
              }
            }
          }
        }
        if (json_data.get.team_data != null) {
          for (let i = 0; i < this.game_data.team_data.length; i++) {
            if (this.game_data.team_data[i].id === json_data.get.team_data.id) {
              console.log('found team to update');
              this.game_data.team_data[i] = json_data.get.team_data;
              break;
            }
          }
        }
        if (json_data.get.scoop_data != null) {
          let ind = -1;
          for (let i = 0; i < this.game_data.players.length; i++) {
            if (this.game_data.players[i].id === json_data.get.scoop_data.id) {
              ind = i;
              break;
            }
          }
          if(ind > -1) {
            this.game_data.players.splice(ind, 1);
          }
          this.game_data.spectators.push(json_data.get.scoop_data);
        }
        if (json_data.get.turn_update != null) {
          this.game_data.current_turn = json_data.get.turn_update;
          this.game_data.last_turn = new Date().getTime();
          if (this.user.turn != null && this.game_data.current_turn == this.user.turn) {
            this.notification_sound.play();
          }
        }
        if (json_data.get.shake_data != null) {
          this.cardShake(json_data.get.shake_data.card.id, json_data.get.shake_data.id, json_data.get.shake_data.location);
        }
        if (json_data.get.plane_data != null) {
          this.game_data.current_plane = json_data.get.plane_data;
        }
      }
      if (json_data.log) {
        this.game_data.action_log.push(json_data.log);
        if (this.autoscroll) {
          this.sleep(500).then(() => {
            this.action_scroll.scrollTo({ bottom: 0, duration: 600});
          })
        }
      }
    });

    this.sleep(1500).then(() => {
      this.messageSocket({
        game_id: this.game_id,
        get: { game: this.game_id },
        post: { join: true }
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
   *          Message Handling Functions            *
   ------------------------------------------------**/


  @ViewChild('action_scroll') action_scroll: NgScrollbar;

  /**
   * Logs the given action and passes it to the web socket
   * @param type type of action to log
   * @param data parameters for the action.
   */
  logAction(type: string, data: any) {
    let log_action: any = null;
    switch(type) {
      case 'move':
        if (data.source.name !== data.dest.name) {
          let out_card: any = JSON.parse(JSON.stringify(data.card))
          if (data.hand_fix) {
            this.setVisibility(out_card, 'play');
          }
          log_action = [
            //Maybe fix for deck?
            {text: this.user.name, type: 'player'},
            {text: 'moved', type: 'regular'},
            {text: data.card.name, type: 'card', card: out_card}, //copy card so it isn't a pointer
            {text: 'from', type: 'regular'},
            {text: data.source.name === 'temp_zone'? 'temp zone': data.source.name, type: 'location'},
            {text: 'to', type: 'regular'},
            {text: data.dest.name === 'temp_zone'? 'temp zone': data.dest.name, type: 'location'},
          ]
        }
        break;
      case 'move_all':
        if (data.cards) {
          let out_cards = [];
          for (let card of data.cards) {
            let out_card: any = JSON.parse(JSON.stringify(card))
            if (data.hand_fix) {
              this.setVisibility(out_card, 'play');
            }
            out_cards.push(out_card);
          }
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: 'moved', type: 'regular'},
            {text: '', type: 'card_list', cards: out_cards},
            {text: 'to', type: 'regular'},
            {text: data.dest.name === 'temp_zone'? 'temp zone': data.dest.name, type: 'location'},
          ]
        }
        break;
      case 'tap':
        if (data.card) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: data.card.tapped, type: 'tap'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'untap_all':
        if (data.cards) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: 'untapped', type: 'tap'},
            {text: '', type: 'card_list', cards: data.cards}
          ]
        }
        break;
      case 'counter':
        if (data.name && data.after) {
          if (data.options && data.options.card) {
            log_action = [
              {text: this.user.name, type: 'player'},
              {text: 'set', type: 'regular'},
              {text: data.name, type: 'counter'},
              {text: 'on', type: 'regular'},
              {text: data.options.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.options.card))},
              {text: 'to', type: 'regular'},
              {text: this.getCounterValue(data.name, {card: data.options.card}), type: 'value'}
            ]
          }
          else {
            log_action = [
              {text: this.user.name, type: 'player'},
              {text: 'set', type: 'regular'},
              {text: data.name, type: 'counter'},
              {text: 'to', type: 'regular'},
              {text: this.getCounterValue(data.name), type: 'value'}
            ]
          }
        }
        break;
      case 'invert':
        if (data.card) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: '', type: 'invert'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'flip':
        if (data.card) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: '', type: 'flip'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'alt_face':
        if (data.card) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: '', type: 'alt_face'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'shake':
        if (data.card) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: '', type: 'shake'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'clone':
        if (data.card) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: '', type: 'clone'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'token':
        if (data.card) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: 'created ', type: 'regular'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))},
            {text: 'token', type: 'regular'}
          ]
        }
        break;
      case 'random':
        if (data.card && data.zone) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: 'selected', type: 'regular'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))},
            {text: 'at random from', type: 'regular'},
            {text: data.zone.name, type: 'location'},
          ]
        }
        break;
      case 'shuffle':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: '', type: 'shuffle'},
          {text: 'their library', type: 'regular'}
        ]
        break;
      case 'mulligan':
        if (data.count) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: 'mulliganed for', type: 'regular'},
            {text: data.count, type: 'number'}
          ]
        }
        break;
      case 'flipped_top':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: 'flipped the top card of their library', type: 'regular'},
        ]
        break;
      case 'draw':
        if (data.cards) {
          log_action = [
            {text: this.user.name, type: 'player'},
            {text: 'drew', type: 'regular'},
            {text: '', type: 'card_list', cards: JSON.parse(JSON.stringify(data.cards))},
            {text: 'to', type: 'regular'},
            {text: data.dest.name === 'temp_zone'? 'temp zone': data.dest.name, type: 'location'},
          ]
        }
        break;
      case 'cascade':
        if (data.cmc && data.count) {
          if (data.failed) {
            log_action = [
              {text: this.user.name, type: 'player'},
              {text: 'revealed', type: 'regular'},
              {text: data.count, type: 'number'},
              {text: ' cards and failed to find cmc less than', type: 'regular'},
              {text: data.cmc, type: 'value'}
            ]
          }
          else {
            log_action = [
              {text: this.user.name, type: 'player'},
              {text: 'revealed', type: 'regular'},
              {text: data.count, type: 'number'},
              {text: ' cards until they revealed cmc less than', type: 'regular'},
              {text: data.cmc, type: 'value'}
            ]
          }
        }
        break;
      case 'draw_until':
        if (data.type && data.count) {
          if (data.failed) {
            log_action = [
              {text: this.user.name, type: 'player'},
              {text: 'revealed', type: 'regular'},
              {text: data.count, type: 'number'},
              {text: ' cards and failed to find a ', type: 'regular'},
              {text: data.type, type: 'value'}
            ]
          }
          else {
            log_action = [
              {text: this.user.name, type: 'player'},
              {text: 'revealed', type: 'regular'},
              {text: data.count, type: 'number'},
              {text: ' cards until they revealed a(n) ', type: 'regular'},
              {text: data.type, type: 'value'}
            ]
          }
        }
        break;
      case 'scry':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: '', type: 'scry'},
          {text: 'the top ' + this.sidenav_scry_count + ' cards of their library', type: 'regular'}
        ]
        break;
      case 'search':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: '', type: 'search'},
          {text: 'their library', type: 'regular'}
        ]
        break;
      case 'scoop':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: 'has scooped their library and is now spectating', type: 'regular'}
        ]
        break;
      case 'end_turn':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: 'has ended the turn', type: 'regular'}
        ]
        break;
      case 'reveal':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: '', type: 'reveal', showed: data.showed},
          {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))},
          {text: data.showed? ' to ': ' from ', type: 'regular'},
          {text: this.getPlayerFromId(data.whomst).name, type: 'player'},
        ]
        break;
      case 'reveal_hand':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: '', type: 'reveal', showed: data.showed},
          {text: data.showed? ' their hand to ': ' their hand from ', type: 'regular'},
          {text: data.whomst > 0 ? this.getPlayerFromId(data.whomst).name: 'all', type: 'player'},
        ]
        break;
      case 'plane':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: 'set the plane to ', type: 'regular'},
          {text: data.plane.name, type: 'plane', card: JSON.parse(JSON.stringify(data.plane))},
        ]
        break;
      case 'roll':
        log_action = [
          {text: this.user.name, type: 'player'},
          {text: '', type: 'roll'},
          {text: ' a ' + data.type + ' for', type: 'regular'},
          {text: data.roll, type: 'number'},
        ]
        break;
    }
    if (log_action != null) {
      this.game_data.action_log.push(log_action);
      this.messageSocket({
        game_id: this.game_id,
        log: log_action
      });
    }
    if (this.autoscroll) {
      this.sleep(500).then(() => {
        this.action_scroll.scrollTo({ bottom: 0, duration: 600});
      })
    }
  }

  /**
   * Sends a counter update to the websocket within a buffered timeframe.
   * @param name the name of the counter
   * @param after the new value of the counter
   * @param options accepts 'card'
   */
  updateCounter(name: string, after: any, options?: any) {
    if (!this.counter_buffer) {
      if (options && options.team) {
        this.team_counter = true;
      }
      this.counter_buffer = true;
      setTimeout(() => {this.counter_buffer = false;
        if (this.team_counter) {
          this.team_counter = false;
          this.updateSocketTeam();
        }
        this.updateSocketPlayer();
        if (name !== '' && name !== 'Command Tax' && name !== 'Command Tax 2') {
          this.logAction('counter', {name: name, after: after, options: options});
        }
      }, 3000);
    }
  }


  /**
   * Returns the real-time value of the named counter for logging
   * @param name name of the counter
   * @param options 'card' if the counter is on a card.
   */
  getCounterValue(name: string, options?: any) {
    if (name === 'Life') {
      return this.game_data.type == 2 ? this.getTeam(this.user.id).life: this.user.life;
    }
    else if (name === 'Infect') {
      return this.game_data.type == 2 ? this.getTeam(this.user.id).infect: this.user.infect;
    }
    else {
      if (options && options.card) {
        if (name === 'Counter 1') {
          return options.card.counter_1_value;
        }
        else if (name === 'Counter 2') {
          return options.card.counter_2_value;
        }
        else if (name === 'Counter 3') {
          return options.card.counter_3_value;
        }
        else if (name === 'Multiplier') {
          return options.card.multiplier_value;
        }
        else if (name === 'Power') {
          return options.card.power_mod + options.card.power;
        }
        else if (name === 'Toughness') {
          return options.card.toughness_mod + options.card.toughness;
        }
        else if (name === 'Loyalty') {
          return options.card.loyalty_mod + options.card.loyalty;
        }
      }
    }
  }

  updateSocketPlayer() {
    this.messageSocket({
      game_id: this.game_id,
      put: {
        action:'update',
        player_data: this.user
      }
    });
  }

  updateSocketTeam() {
    this.messageSocket(
      {
        game_id: this.game_id,
        put: {
          action: 'update',
          team_data: this.getTeam(this.user.id)
        }
      });
  }

  updateSocketPlane(plane: any) {
    this.messageSocket(
      {
        game_id: this.game_id,
        put: {
          action: 'update',
          plane_data: plane
        }
      });
  }

  updateSocketZone(zone: any) {
    this.messageSocket({
      game_id: this.game_id,
      put: {
        action:'update',
        zone_data: zone
      }
    });
  }

  messageSocket(content: any) {
    let message = {
      source: '',
      content: {}
    };
    message.source = 'localhost';
    message.content = content;
    this.WebsocketService.messages.next(message);
  }

  /**------------------------------------------------
   *        Game Data Management Functions          *
   ------------------------------------------------**/

  public secondsToString(time: any) {
    if (time != null) {
      let time_in_seconds = (new Date().getTime() - time) / 1000;
      let seconds: string | number = Math.floor(time_in_seconds % 60)
      let minutes: string | number = Math.floor( (time_in_seconds / 60) % 60)
      let hours: string | number = Math.floor((time_in_seconds / (60 * 60)) % 60)
      seconds = (seconds < 10) ? '0' + seconds : seconds;
      minutes = (minutes < 10) ? '0' + minutes : minutes;
      hours = (hours < 10) ? '0' + hours : hours;
      return `${hours}:${minutes}:${seconds}`;
    }
    else {
      return '00:00:00';
    }
  }

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
    for (let player of this.game_data.spectators) {
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
          out_player.playmat_image = this.current_user.playmat;
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
          out_player.spectating = false;
          out_player.top_flipped = false;
          out_player.card_preview = { position : {x: 1502, y: 430}}
          out_player.play_counters = [];
          for (let i = 0; i < 36; i++) {
            out_player.playmat.push({ name: 'play', id: i, owner: 1, cards: [] })
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
            card.visible = [];
            card.sidenav_visible = false;
            card.alt = false;
            card.facedown = false;
            card.shaken = false;
            card.inverted = false;
            card.notes = '';
            if (card.iscommander) {
              out_player.deck.commander.cards.push(card);
            }
          })
          out_player.deck.commander.cards.forEach((card: any) => {
            out_player.deck.commander.saved.push(card);
            out_player.deck.cards.splice(deck.cards.indexOf(card), 1);
          })
          this.shuffleDeck(out_player.deck.cards, {nolog: true, noupdate: true});
          for (let i = 0; i < this.game_data.players.length; i++) {
            if (this.game_data.players[i].id == this.current_user.id) {
              this.game_data.players[i] = out_player;
              this.user = this.game_data.players[i];
              break;
            }
          }
          this.updateSocketPlayer();
          resolve();
        } else {
          resolve();
        }
      });
    });
  }

  startGame() {
    if (this.game_data.type == 1) {
      this.game_data.turn_count = 1;
      this.messageSocket(
        {
          game_id: this.game_data.id,
          put: {
            action: 'start',
          }
        });
    }
    else if (this.game_data.type == 2) {
      this.selectTeams();
    }
    else if (this.game_data.type == 3) {
      const selectColorsRef = this.dialog.open(SelectColorsDialog, {
        data: {
          players: this.game_data.players
        }
      });
      selectColorsRef.afterClosed().subscribe((result) => {
        if (result != null) {
          this.game_data.turn_count = 1;
          this.messageSocket({
            game_id: this.game_id,
            put: {
              action: 'start',
              colors: result.colors,
            }
          });
        }
      });

    }
  }

  selectTeams(): void {
    let p: any[] = [];
    for (let player of this.game_data.players) {
      p.push(player);
    }
    if (p.length % 2 == 0) {
      let team_array: any[] = []
      for (let i = 0; i < p.length / 2; i++){
        team_array.push([]);
      }
      const teamDialogRef = this.dialog.open(TwoHeadedTeamsDialog, {
        data: {
          players: p,
          team_array: team_array
        }
      });
      teamDialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.messageSocket(
            {
              game_id: this.game_data.id,
              put: {
                action: 'start',
                teams: result
              }
            });
        }
      });
    }
    else {
      this.snackbar.open('Cannot make teams with an odd number of active players.',
        'dismiss', {duration: 3000});
    }
  }

  openDeckSelectDialog(): void {
    if (this.dialog.openDialogs.length == 0) {
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
  }

  selectDeck(deck: any) {
    this.initializePlayerDeck(this.current_user.name, this.current_user.id, deck.id);
  }

  scoopDeck(): void {
    let spectator = {
      id: this.user.id,
      name: this.user.name,
      spectating: true,
      play_counters: []
    }
    this.game_data.players.splice(this.game_data.players.indexOf(this.user), 1);
    this.user = spectator;
    this.game_data.spectators.push(spectator);
    this.messageSocket({
      game_id: this.game_id,
      put: {
        action:'scoop',
        player_data: this.user
      }
    });
    this.logAction('scoop', null);
  }

  endGame() {
    const endGameRef = this.dialog.open(EndGameDialog, {
      data: {
        players: this.game_data.players
      }
    });
    endGameRef.afterClosed().subscribe((result) => {
      if (result != null) {
        this.messageSocket({
          game_id: this.game_id,
          put: {
            action:'end',
            winner: result.winner1,
            winner_two: result.winner2
          }
        });
      }
    });
  }

  endTurn() {
    if (this.game_data.type == 1 || this.game_data.type == 3) {
      if (this.game_data.current_turn == this.user.turn || this.user.id == 1) {
        this.messageSocket({
          game_id: this.game_id,
          put: {
            action:'end_turn',
          }
        });
      }
    }
    else if (this.game_data.type == 2) {
      if (this.game_data.current_turn == this.getTeam(this.user.id).turn) {
      }
    }
  }


  setPlane() {
    let new_plane = this.planes[Math.floor(Math.random() * (this.planes.length))];
    this.fddp_data.getCardInfo(new_plane).then((plane_data: any) => {
      this.getCardImages(new_plane).then((image_data: any) => {
        let images = image_data;
        let new_plane: any = plane_data;
        new_plane.plane = true;
        new_plane.image = images.length > 0 ? images[0]: null;
        this.game_data.current_plane = plane_data;
        this.updateSocketPlane(plane_data);
        this.logAction('plane', {plane: plane_data});
      });
    });
  }

  rollD6() {
    let roll = Math.floor(Math.random() * 6) + 1;
    this.logAction('roll', {roll: roll, type: 'd6'});
  }

  rollD20() {
    let roll = Math.floor(Math.random() * 20) + 1;
    this.logAction('roll', {roll: roll, type: 'd20'});
  }


  /**------------------------------------------------
   *      Playmat Display Utility Functions         *
   ------------------------------------------------**/

  /**
   * Helper function for changing whose board is being displayed.
   */
  currentPlayer() {
    if (this.game_data.type == 2 && this.teamview) {
      return this.getTeammate();
    }
    else if (this.user && this.user.deck) {
      return this.user;
    }
    else if (this.user.spectating) {
      return this.selected_player;
    }
    return null;
  }

  getOtherPlayers() {
    let out_players: any[] = [];
    for (let player of this.game_data.players) {
      if (this.currentPlayer() == null || player != this.currentPlayer()) {
        out_players.push(player);
      }
    }
    return out_players;
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

  getTeammate() {
    let t = -1;
    for (let i = 0; i < this.game_data.team_data.length; i++) {
      if (this.game_data.team_data[i].players.includes(this.user.id)) {
        t = i;
        break;
      }
    }
    for (let player of this.game_data.team_data[t].players) {
      if (player != this.user.id) {
        return this.getPlayerFromId(player);
      }
    }
    return null;
  }

  isTeammate(player: any) {
    if (this.game_data.team_data) {
      if (this.user != null && player == this.getTeammate()) {
        return true;
      }
      else {
        return false;
      }
    }
    return false;
  }

  isAlly(player: any) {
    if (this.game_data.type == 3 && this.currentPlayer() != null) {
      if (this.currentPlayer().star_color === 'W') {
        return player.star_color === 'U' || player.star_color === 'G';
      }
      else if (this.currentPlayer().star_color === 'U') {
        return player.star_color === 'W' || player.star_color === 'B';
      }
      else if (this.currentPlayer().star_color === 'B') {
        return player.star_color === 'U' || player.star_color === 'R';
      }
      else if (this.currentPlayer().star_color === 'R') {
        return player.star_color === 'B' || player.star_color === 'G';
      }
      else if (this.currentPlayer().star_color === 'G') {
        return player.star_color === 'W' || player.star_color === 'R';
      }
      else {
        return false;
      }
    }
    return false;
  }

  clearCard(card: any) {
    card.tapped = 'untapped';
    card.power_mod = 0;
    card.toughness_mod = 0;
    card.loyalty = 0;
    card.loyalty_mod = 0;
    card.counter_1 = false;
    card.counter_1_value = 0;
    card.counter_2 = false;
    card.counter_2_value = 0;
    card.counter_3 = false;
    card.counter_3_value = 0;
    card.multiplier = false;
    card.multiplier_value = 0;
    card.locked = false;
    card.primed = false;
    card.triggered = false;
    card.facedown = false;
    card.shaken = false;
    card.inverted = false;
    card.notes = '';
    if (card.alt) {
      this.altFaceCard(card);
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
    this.updateSocketPlayer();
    this.logAction('tap', {card: card});
  }

  untapAll() {
    let cards = [];
    for (let spot of this.user.playmat) {
      for (let card of spot.cards) {
        if (!card.locked) {
          cards.push(card);
          card.tapped = 'untapped';
        }
      }
    }
    this.updateSocketPlayer();
    this.logAction('untap_all', {cards: cards});
  }

  invertCard(card:any) {
    card.inverted = !card.inverted;
    this.updateSocketPlayer();
    this.logAction('invert', {card: card});
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
    this.updateSocketPlayer();
    this.logAction('flip', {card: card});
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
      this.updateSocketPlayer();
      this.logAction('alt_face', {card:card});
    }
  }

  editNotes(card: any) {
    const noteDialogRef = this.dialog.open(NoteDialog, {
      width: '500px',
      data: {card: card}
    });
    noteDialogRef.afterClosed().subscribe(result => {
      if (result) {
        card.notes = result;
        this.updateSocketPlayer();
      }
    })
  }

  shakeCard(card: any, id: number, location: string) {
    card.shaken = true;
    this.messageSocket({
      game_id: this.game_id,
      put: {
        action:'shake',
        card: card,
        id: id,
        location: location
      }
    });
    this.logAction('shake', {card: card});
    setTimeout(() => {
      card.shaken = false;
    }, 3000);
  }

  cardShake(cardid: number, userid: number, location: string) {
    let shake_player = this.getPlayerFromId(userid);
    if (shake_player) {
      switch (location) {
        case 'hand':
          for (let card of shake_player.hand.cards) {
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
          for (let spot of shake_player.playmat.cards) {
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
    this.user.temp_zone.cards.push(card_clone);
    this.updateSocketPlayer();
    this.logAction('clone', {card: card_clone});
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
      this.user.temp_zone.cards.unshift(out_tokens[0]);
      this.updateSocketPlayer();
      this.logAction('token', {card: out_tokens[0]});
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
          out_token.visible = [];
          this.clearCard(out_token);
          this.user.temp_zone.cards.unshift(out_token);
          this.updateSocketPlayer();
          this.logAction('token', {card: out_token});
          return;
        });
      })
    }
  }

  createTokenFromImage(result: any) {
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
      this.user.temp_zone.cards.unshift(out_token);
      this.updateSocketPlayer();
      this.logAction('token', {card: out_token});
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

  flipTop() {
    this.user.top_flipped = !this.user.top_flipped;
    this.updateSocketPlayer();
    this.logAction('flipped_top', null);
  }

  shuffleDeck(cards: any[], options?: any) {
    for (let i = 0; i < cards.length; i++) {
      let r = i + Math.floor(Math.random() * (cards.length - i));
      let temp = cards[r];
      cards[r] = cards[i];
      cards[i] = temp;
    }
    if (options && options.noupdate) {}
    else {
      this.updateSocketPlayer();
    }
    if (options && options.nolog) {}
    else {
      this.logAction('shuffle', null);
    }
  }

  toggleCardReveal(card: any, whomst: number, options?: any) {
    let showed = false;
    if (whomst == -6969) {
      card.visible = [];
      for (let player of this.game_data.players) {
        card.visible.push(player.id);
      }
      for (let player of this.game_data.spectators) {
        card.visible.push(player.id);
      }
      showed = true;
    }
    else if (whomst == -1) {
      card.visible = [];
    }
    else {
      if (card.visible.includes(whomst)) {
        if (options && options.forcevisible) {}
        else {
          card.visible.splice(card.visible.indexOf(whomst), 1);
        }
      }
      else {
        if (options && options.forceinvisible) {}
        else{
          card.visible.push(whomst);
          showed = true;
        }
      }
    }
    if (options && options.noupdate) {}
    else {
      this.updateSocketPlayer();
    }
    if (options && options.nolog) {}
    else {
      this.logAction('reveal', {card: card, whomst: whomst, showed: showed});
    }
  }

  revealHandToggle(whomst: number) {
    let showed = false;
    if (whomst == -6969) {
      showed = true;
      this.user.hand_preview = [];
      for (let player of this.game_data.players) {
        this.user.hand_preview.push(player.id);
      }
      for (let player of this.game_data.spectators) {
        this.user.hand_preview.push(player.id);
      }
      for (let card of this.user.hand.cards) {
        this.toggleCardReveal(card, whomst, {nolog: true, noupdate: true, forcevisible: true});
      }
    }
    else if (whomst == -1) {
      this.user.hand_preview = [this.user.id];
      for (let card of this.user.hand.cards) {
        this.toggleCardReveal(card, whomst, {nolog: true, noupdate: true});
      }
    }
    else {
      if (this.user.hand_preview.includes(whomst)) {
        this.user.hand_preview.splice(this.user.hand_preview.indexOf(whomst), 1);
        for (let card of this.user.hand.cards) {
          this.toggleCardReveal(card, whomst, {nolog: true, noupdate: true, forceinvisible: true});
        }
      }
      else {
        this.user.hand_preview.push(whomst);
        showed = true;
        for (let card of this.user.hand.cards) {
          this.toggleCardReveal(card, whomst, {nolog: true, noupdate: true, forcevisible: true});
        }
      }
    }
    this.updateSocketPlayer();
    this.logAction('reveal_hand', {whomst: whomst, showed: showed});
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

  hasType(card: any, type: string) {
    if (card.types) {
      for (let card_type of card.types) {
        if (type.toLowerCase() === card_type.toLowerCase()) {
          return true;
        }
      }
    }
    return false;
  }


  /**
   * Returns the count of a given type in a specified zone.
   * @param player Player to search, or 'All'
   * @param zone zone to read
   * @param type type to look for, or 'historic', 'unnatural', 'permanent'
   */
  typeCount(player: any, zone: string, type: string) {
    let count = 0;
    if (player && zone && type && zone !== '' && type !== '') {
      let players = []
      if (player === 'All')
      {
        players = this.game_data.players;
      }
      else {
        if (this.getPlayerFromId(player)) {
          players = [this.getPlayerFromId(player)];
        }
      }
      for (let play of players) {
        if (zone === 'play') {
          for (let spot of play.playmat) {
            for (let card of spot.cards) {
              if ((type.toLowerCase() === 'permanent' && this.isPermanent(card)) ||
                (type.toLowerCase() === 'unnatural' && this.isUnnatural(card)) ||
                (type.toLowerCase() === 'historic'  && this.isHistoric(card)) ||
                (this.hasType(card, type))) {
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
        else {
          let cur_zone: any = this.getPlayerZone(play.id, zone);
          for (let card of cur_zone.cards) {
            if ((type.toLowerCase() === 'permanent' && this.isPermanent(card)) ||
              (type.toLowerCase() === 'unnatural' && this.isUnnatural(card)) ||
              (type.toLowerCase() === 'historic'  && this.isHistoric(card)) ||
              (this.hasType(card, type))) {
              count ++;
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
    this.updateSocketPlayer();
  }

  deleteCounter(counter: any) {
    this.user.play_counters.splice(this.user.play_counters.indexOf(counter), 1);
    this.updateSocketPlayer();
  }

  deleteAllCounters() {
    this.user.play_counters = [];
    this.updateSocketPlayer();
  }

  /**
   * Stores the new location of a counter after it has been dragged
   * @param event the drag event
   * @param counter the counter being updated
   */
  setCounterPosition(event: any, counter: any) {
    if (this.user != null) {
      counter.position = { ...(<any>event.source._dragRef)._passiveTransform };
      this.updateSocketPlayer();
    }
  }

  selectRandom(zone: any) {
    let rand_card: any = {};
    if (zone.cards.length == 1) {
      rand_card = zone.cards[0];
      this.snackbar.open('Selected ' + zone.cards[0].name + ' at random.',
        'dismiss', {duration: 3000});
    }
    else if (zone.cards.length > 1) {
      rand_card = zone.cards[Math.floor(Math.random() * zone.cards.length)]
      this.snackbar.open('Selected ' + '"' + rand_card.name + '"' + ' at random.',
        'dismiss', {duration: 3000});
    }
    this.logAction('random', {zone: zone, card: rand_card});
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
          break;
        case "Shift":
          this.magnifier_data.shift_pressed = !this.magnifier_data.shift_pressed;
          break;
        case "Control":
          this.magnifier_data.control_pressed = true;
          break;
        case "e":
          this.endTurn();
          break;
        case "o":
          if(this.user != null) {
            this.user.card_preview.position = {x: 0, y: 0};
          }
          break;
        case "s":
          this.shuffleDeck(this.user.deck.cards);
          break;
        case "d":
          this.draw_count = 1;
          this.drawToX(this.user.hand);
          break;
        case "f":
          break;
        case "x":
          this.untapAll();
          break;
        case "m":
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
          this.magnifier_data.control_pressed = false;
          break;
      }
    }
  }

  @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: any;
  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    event.stopPropagation();
    if (item.type && item.type !== 'none') {
      switch (item.type) {
        case 'life':
          if (item.player) {
            item.player.life--;
            this.updateCounter('Life', item.player.life);
          }
          else if (item.team) {
            item.team.life--;
            this.updateCounter('Life', item.team.life, {team: true});
          }
          break;
        case 'infect':
          if (item.player) {
            item.player.infect--;
            this.updateCounter('Infect', item.player.infect);
          }
          else if (item.team) {
            item.team.infect--;
            this.updateCounter('Infect', item.team.infect, {team: true});
          }
          break;
        case 'counter_1':
          item.card.counter_1_value--;
          this.updateCounter('Counter 1', item.card.counter_1_value, {card: item.card});
          break;
        case 'counter_2':
          item.card.counter_2_value--;
          this.updateCounter('counter 2', item.card.counter_2_value, {card: item.card});
          break;
        case 'counter_3':
          item.card.counter_3_value--;
          this.updateCounter('counter 3', item.card.counter_3_value, {card: item.card});
          break;
        case 'multiplier':
          item.card.multiplier_value--;
          this.updateCounter('Multiplier', item.card.counter_multiplier_value, {card: item.card});
          break;
        case 'power':
          item.card.power_mod--;
          this.updateCounter('Power',item.card.power_mod + item.card.power, {card: item.card});
          break;
        case 'toughness':
          item.card.toughness_mod--;
          this.updateCounter('Toughness', item.card.toughness_mod + item.card.toughness, {card: item.card});
          break;
        case 'loyalty':
          item.card.loyalty_mod--;
          this.updateCounter('Loyalty', item.card.loyalty_mod + item.card.loyalty, {card: item.card});
          break;
        case 'command_tax_1':
          this.user.command_tax_1--;
          this.updateCounter('Command Tax', this.user.command_tax_1);
          break;
        case 'command_tax_2':
          this.user.command_tax_2--;
          this.updateCounter('Command Tax 2', this.user.command_tax_2);
          break;
        case 'custom_counter':
          item.counter.value--;
          this.updateCounter('', null);
          break;
        case 'team_life':
          item.team.life--;
          this.updateCounter('Life', item.team.life);
          break;
        case 'team_infect':
          item.team.infect--;
          this.updateCounter('Infect', item.team.infect);
          break;
        default:
          this.rightclicked_item = item;
          this.menuTopLeftPosition.x = event.clientX + 'px';
          this.menuTopLeftPosition.y = event.clientY + 'px';
          this.matMenuTrigger.openMenu();
      }
    }
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

  lifeClick(event: any, player: any) {
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
          if (this.game_data.type == 2) {
            this.updateCounter('Life', player.life, {team: true});
          }
          else {
            this.updateCounter('Life', player.life);
          }

        }
      });
    }
    else {
      player.life = player.life + 1;
      if (this.game_data.type == 2) {
        this.updateCounter('Life', player.life, {team: true});
      }
      else {
        this.updateCounter('Life', player.life);
      }
    }
  }

  infectClick(event: any, player: any) {
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
          if (this.game_data.type == 2) {
            this.updateCounter('Infect', player.infect, {team: true});
          }
          else {
            this.updateCounter('Infect', player.infect);
          }
        }
      });
    }
    else {
      player.infect = player.infect + 1;
      if (this.game_data.type == 2) {
        this.updateCounter('Infect', player.infect, {team: true});
      }
      else {
        this.updateCounter('Infect', player.infect);
      }
    }
  }

  /**------------------------------------------------
   *               Sidenav Functions                *
   ------------------------------------------------**/

  @ViewChild('fddp_sidenav') fddp_sidenav: any;
  openSideNav(zone: any, options?: any) {
    this.sidenav_selected_player = this.user;
    this.sidenav_type = zone.name === this.user.deck.name ? 'deck': zone.name;
    if (options && options.scry) {
      this.sidenav_type = 'scry';
      let items = this.getSidenavList();
      for (let i = 0; i < items.length; i++) {
        if (i > this.sidenav_scry_count - 1) {
          items[i].sidenav_visible = false;
        }
        else {
          items[i].sidenav_visible = true;
        }
      }
    }
    else {
      this.sidenav_sort = '';
      this.sidenav_sort_type = '';
      this.getSidenavSort();
    }
    if (this.sidenav_type === 'deck') {
      this.logAction('search', null)
    }
    this.fddp_sidenav.open();
  }

  closeSideNav() {
    this.sidenav_sort = '';
    this.sidenav_selected_player = null;
    this.sidenav_type = null;
    this.fddp_sidenav.close();
    this.sidenav_sort = '';
  }

  getSidenavSort() {
    let items: any[] = this.getSidenavList();

    if (this.sidenav_sort && this.sidenav_sort !== '') {
      for (let item of items) {
        item.sidenav_visible = item.name.toLowerCase().includes(this.sidenav_sort.toLowerCase());
      }
    }
    else {
      for (let item of items) {
        item.sidenav_visible = true;
      }
    }
    if (this.sidenav_sort_type && this.sidenav_sort_type != '') {
      for (let item of items) {
        if (item.types) {
          let found = false;
          for (let card_type of item.types) {
            if (this.sidenav_sort_type.toLowerCase() === card_type.toLowerCase()) {
              found = true;
              break;
            }
          }
          if (item.sidenav_visible) {
            item.sidenav_visible = found;
          }
        }
        else {
          item.sidenav_visible = false;
        }
      }
    }
    if (this.sidenav_type !== 'deck') {
      if ((this.sidenav_sort && this.sidenav_sort !== '') || (this.sidenav_sort_type && this.sidenav_sort_type != '')){
        for (let item of items) {
          if (!item.visible.includes(this.user.id)) {
            item.sidenav_visible = false;
          }
        }
      }
    }
  }

  getSidenavList() {
    let items: any[] = []
    switch(this.sidenav_type) {
      case 'grave':
        items = this.sidenav_selected_player.grave.cards;
        break;
      case 'exile':
        items = this.sidenav_selected_player.exile.cards;
        break;
      case 'temp_zone':
        items = this.sidenav_selected_player.temp_zone.cards;
        break;
      case 'deck':
        items = this.sidenav_selected_player.deck.cards;
        break;
      case 'scry':
        items = this.sidenav_selected_player.deck.cards;
    }
    return items;
  }

  getSidenavContainer() {
    return this.getPlayerZone(this.sidenav_selected_player.id, this.sidenav_type);
  }

  sidenavPredicate() {
    return this.sidenav_sort === '' && this.sidenav_sort_type === '';
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
    switch(dest_type) {
      case 'deck':
        card.visible = [];
        break;
      case 'grave':
        card.visible = [];
        if (this.game_data.players) {
          for (let player of this.game_data.players) {
            card.visible.push(player.id);
          }
          for (let player of this.game_data.spectators) {
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
            for (let player of this.game_data.spectators) {
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
          for (let player of this.game_data.spectators) {
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
            for (let player of this.game_data.spectators) {
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
            for (let player of this.game_data.spectators) {
              card.visible.push(player.id);
            }
          }
        }
        break;
    }
  }

  /**
   * Drag a card from one array to another.
   * @param card the object being dragged.
   * @param dest the destination container, containing the destination array.
   * @param event the drag event.
   */
  dragCard(card: any, dest: any, event: any, options?: any) {
    if (event.previousContainer.data == this.getSidenavList()) {
      this.sendCardToZone(card, this.getContainer(event.previousContainer.data), dest,
        this.getSidenavList().indexOf(card), event.currentIndex, options);
    }
    else {
      this.sendCardToZone(card, this.getContainer(event.previousContainer.data), dest,
        event.previousIndex, event.currentIndex, options);
    }
  }

  /**
   * Move a card from one container to another.
   * @param card object to be moved
   * @param source the source container
   * @param dest the destination container
   * @param previousIndex the index of the object in the source container
   * @param currentIndex the index the object is being moved to in the destination container
   * @param options supports
   * 'previousIndex': the index the object is currently at
   * 'currentIndex': the index the object is being moved to. Can be set manually for deck transfers.
   */
  sendCardToZone(card: any, source: any, dest: any, previousIndex: number, currentIndex: number, options?: any){
    //need to write an insert predicate for sidenav cdkdroplist that prevents dragging in once list is sorted.
    //Also prevents dragging in while scrying
    if (source == dest) {
      if (options && options.sidenav) {
        if (this.sidenavPredicate()) {
          moveItemInArray(source.cards, previousIndex, currentIndex);
          this.updateSocketPlayer();
        }
      }
      else {
        moveItemInArray(source.cards, previousIndex, currentIndex);
        this.updateSocketPlayer();
      }
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
              if (options && options.nolog) {}
              else {
                this.logAction('move', {card: card, source: source, dest: dest});
              }
              if (options && options.noupdate) {}
              else {
                this.updateSocketPlayer();
              }
            }
            else {
              transferArrayItem(source.cards, dest.cards, previousIndex, currentIndex);
              if (options && options.nolog) {}
              else {
                this.logAction('move', {card: card, source: source, dest: dest, hand_fix: dest == this.user.hand && source != this.user.deck});
              }
              if (options && options.noupdate) {}
              else {
                this.updateSocketPlayer();
              }
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
            if (options && options.nolog) {}
            else {
              this.logAction('move', {card: card, source: source, dest: dest});
            }
            if (options && options.noupdate) {}
            else {
              this.updateSocketPlayer();
            }
          }
        }
        else if (dest.name === "temp_zone") { //You can put anything in the temp zone
          //If visibility needs to change (draw to play) you have to do it before calling the move.
          transferArrayItem(source.cards, dest.cards, previousIndex, currentIndex);
          if (options && options.nolog) {}
          else {
            this.logAction('move', {card: card, source: source, dest: dest});
          }
          if (options && options.noupdate) {}
          else {
            this.updateSocketPlayer();
          }
        }
      }
    }
  }

  sendAllTo(source: any, dest: any, options?: any) {
    let cards = [];
    while (source.cards.length > 0) {
      cards.push(source.cards[0]);
      if (options && options.bottom) {
        this.sendCardToZone(source.cards[0], source, dest, 0, dest.cards.length, {nolog: true, noupdate: true});
      }
      else {
        this.sendCardToZone(source.cards[0], source, dest, 0, 0, {nolog: true, noupdate: true});
      }
    }
    if (options && options.nolog) {}
    else {
      this.logAction('move_all', {cards: cards, source: source, dest: dest, hand_fix: dest == this.user.hand && source != this.user.deck});
    }
    if (options && options.noupdate) {}
    else {
      this.updateSocketPlayer();
    }
  }

  sendCardToDeckPos(card: any, source: any, dest: any, previousIndex: number, currentIndex: any, options?: any){
    let cur_ind = Number(currentIndex);
    if (cur_ind < 0) {
      cur_ind ++;
      cur_ind = this.getPlayerZone(card.owner, 'deck').cards.length + cur_ind;
    }
    else if (cur_ind > 0) {
      cur_ind --;
    }
    this.sendCardToZone(card, source, dest, previousIndex, cur_ind);
  }

  /**
   * Draws the global 'draw_count' number of cards to the desired zone.
   * @param dest the zone to draw to.
   * @param options 'nolog' and 'noupdate'
   */
  drawToX(dest: any, options?: any) {
    if (this.user != this.currentPlayer()) {
      return;
    }
    let num_count = Number(this.draw_count);
    let cards = [];
    for (let i = 0; i < num_count; i++) {
      if (this.user.deck.cards.length > 0) {
        cards.push(this.user.deck.cards[0]);
        this.sendCardToZone(this.user.deck.cards[0], this.user.deck, dest, 0, 0, {nolog: true, noupdate: true});
      }
    }
    if (options && options.noupdate){}
    else {
      this.updateSocketPlayer();
    }
    if (options && options.nolog){}
    else {
      this.logAction('draw', {cards: cards, dest: dest});
    }
  }

  mulliganHand(count: any) {
    this.draw_count = Number(count);
    this.sendAllTo(this.user.hand, this.user.deck, {nolog: true, noupdate: true});
    this.shuffleDeck(this.user.deck.cards, {nolog: true, noupdate: true});
    this.drawToX(this.user.hand, {nolog: true, noupdate: true});
    this.updateSocketPlayer();
    this.logAction('mulligan', {count: count});
  }

  /**
   * Draws cards from the top of the deck to the temp zone until it reveals a non-land card with cmc less than value.
   * @param value the cmc of the current cascade.
   */
  cascade(value: any) {
    let cmc = Number(value);
    let count = 0;
    let failed = false;
    while(true) {
      if (this.user.deck.cards.length > 0) {
        count ++;
        let cur_card = this.user.deck.cards[0];
        this.sendCardToZone(cur_card, this.user.deck, this.user.temp_zone, 0, 0,
          {nolog: true, noupdate: true})
        if (cur_card.cmc != null) {
          if (cur_card.cmc < cmc) {
            if (cur_card.cmc > 0) {
              break;
            }
            if (cur_card.types) {
              if (!cur_card.types.includes("Land")) {
                break;
              }
            }
            else {
              break;
            }
          }
        }
      }
      else {
        failed = true;
        break;
      }
    }
    this.updateSocketPlayer();
    this.logAction('cascade', {cmc: cmc, count: count, failed: failed});
  }

  /**
   * Draws cards from the top of the deck to the temp zone until it reveals a card of the chosen type.
   * @param type the type string to look for, or 'permanent', 'historic' or 'unnatural'
   */
  drawUntil(type: string) {
    let count = 0;
    let failed = false;
    while(true) {
      if (this.user.deck.cards.length > 0) {
        count++;
        let cur_card = this.user.deck.cards[0];
        this.sendCardToZone(cur_card, this.user.deck, this.user.temp_zone, 0, 0,
          {nolog: true, noupdate: true})
        if (cur_card.types) {
          if (type.toLowerCase() === 'permanent') {
            if (this.isPermanent(cur_card)) {
              break;
            }
          }
          if (type.toLowerCase() === 'unnatural') {
            if (this.isUnnatural(cur_card)) {
              break;
            }
          }
          if (type.toLowerCase() === 'historic') {
            if (this.isHistoric(cur_card)) {
              break;
            }
          } else {
            let f = false;
            for (let cur_type of cur_card.types) {
              if (cur_type.toLowerCase() === type.toLowerCase()) {
                f = true;
                break;
              }
            }
            if (f) {
              break;
            }
          }
        } else {
          break;
        }
      } else {
        failed = true;
        break;
      }
    }
    this.updateSocketPlayer();
    this.logAction('draw_until', {type: type, count: count, failed: failed});
  }

  scryX(count: any) {
    this.sidenav_scry_count = Number(count);
    this.openSideNav(this.user.deck, {scry: true});
    this.logAction('scry', null);
  }
}
