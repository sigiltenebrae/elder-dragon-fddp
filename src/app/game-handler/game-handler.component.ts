import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {animate, state, style, transition, trigger, useAnimation} from "@angular/animations";
import {MatMenuTrigger} from "@angular/material/menu";
import {RightclickHandlerServiceService} from "../../services/rightclick-handler-service.service";
import {FddpApiService} from "../../services/fddp-api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MatDialog} from "@angular/material/dialog";
import {shakeX, flash} from 'ng-animate';
import {ActivatedRoute, Router} from "@angular/router";
import {TokenStorageService} from "../../services/token-storage.service";
import {FddpWebsocketService} from "../../services/fddp-websocket.service";
import {NgScrollbar} from "ngx-scrollbar";
import {
  CounterSetDialog,
  DeckSelectDialog,
  EndGameDialog,
  NoteDialog,
  SelectColorsDialog,
  TokenInsertDialog,
  TokenSelectDialog,
  TwoHeadedTeamsDialog,
  HelpDialog
} from "./game-handler-addons.component";
import {Howl} from 'howler'

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
    trigger('shakeCard', [transition('false => true', useAnimation(shakeX))]),
    trigger('alarmCard', [transition('false => true', useAnimation(flash)), transition('true => false', [])])
  ],
})
export class GameHandlerComponent implements OnInit {

  constructor(private rightClickHandler: RightclickHandlerServiceService, private fddp_data: FddpApiService,
              private snackbar: MatSnackBar, public dialog: MatDialog, private route: ActivatedRoute,
              private tokenStorage: TokenStorageService, private WebsocketService: FddpWebsocketService,
              private router: Router) { }

  default_card_back = 'https://drive.google.com/uc?export=view&id=1-Hp4xnjvn6EU-khUQEHn4R0T7n46Pt84';

  //Page Interaction
  rightclicked_item: any = null; //Set to the object that triggers the right click event.
  menuTopLeftPosition =  {x: '0', y: '0'} //The top left position of the 'right click' menu
  notification_sound: any = null;
  counterupdates: any[] = [];

  //Game Data
  game_id = -1; //The game id (from the url)
  planes: any[] = [];
  monarch_data: any = null;
  initiative_data: any = null;
  game_data: any = null; //The full game data object
  users_list: any[] = []; //The list of all users in the db
  current_user: any = null; //The currently logged-in user
  user: any = null; //The game data for the currently logged-in user
  game_started: any = null;
  last_turn: any = null;
  game_start_string = '';
  last_turn_string = '';

  //Board Interaction
  magnified_card: any = null; //Pointer to the card object
  magnifier_data: any = { shift_pressed: false, control_pressed: false, command_zone: false }
  currently_dragging: any = null; //The cdkDrag object that is currently being dragged
  teammate_view: boolean = false; //True if the player is viewing their partner's field (in partner game modes)
  autoscroll = true; //Whether to autoscroll the action log
  selected_player: any = null; //The currently higlighted player
  sidenav_selected_player: any = null; //The player whose zone you are currently viewing
  draw_count: any = 1;
  draw_until = '';
  teamview = false;
  deck_test_player_index = 0;
  gridlines = false;

  //Sidenav
  sidenav_type: any = null;
  sidenav_sort_type: string = '';
  sidenav_sort = '';
  sidenav_scry_count = 0;
  sidenav_spot: any = null;

  //Messaging
  counter_buffer: any = false; //True if a counter update is in the message queue. Prevents counter updates from spamming
  team_counter = false;

  ping: any;
  game_timer: any;
  counter_timer: any;
  fast_game_counter: any;

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.notification_sound = new Howl({
        src: ['assets/sound/synth-twinkle-alert-sound-001-8436.mp3']
      });

      this.rightClickHandler.overrideRightClick();

      this.fddp_data.getUsers().then((users: any) => {
        this.users_list = users;

        for (let user of this.users_list) {
          if (user.id == this.tokenStorage.getUser().id) {
            this.current_user = user;
            break;
          }
        }

        this.fddp_data.getPlanes().then((planes: any) => {
          this.planes = planes;
        });

        this.fddp_data.getCardInfo("The Monarch").then((monarch: any) => {
          this.monarch_data = monarch;
        });

        this.fddp_data.getCardInfo("The Initiative // Undercity").then((initiative: any) => {
          this.initiative_data = initiative;
        });

        const routeParams = this.route.snapshot.paramMap;
        this.game_id = Number(routeParams.get('gameid'));


        this.gridlines = this.current_user.gridlines;

        this.WebsocketService.messages.subscribe(msg => {
          let json_data = msg;
          if (json_data.get) {
            if (json_data.get.game_data) {
              if (json_data.get.game_data.id) {
                this.game_data = json_data.get.game_data;
                this.game_started = this.game_data.started;
                this.last_turn = this.game_data.last_turn;
                if (this.game_data.players) {
                  for (let player of this.game_data.players) {
                    if (player.id == this.current_user.id) {
                      this.user = player;
                      if (this.user.turn != null && this.game_data.current_turn == this.user.turn) {
                        if (this.isFastGame()) {
                          if (new Date().getTime() - this.last_turn < 60000) {
                            this.notification_sound.play();
                            this.fast_game_counter = setInterval(() => {
                              console.log('burn!')
                              this.fastGameEndTurn();
                            }, 60000 - (new Date().getTime() - this.last_turn));
                          }
                          else {
                            this.fastGameEndTurn();
                          }
                        }
                      }
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
                this.router.navigate(['/games']);
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
                  this.game_data.spectators.push(json_data.get.spectator_data);
                  if (json_data.get.spectator_data.id == this.current_user.id) {
                    this.user = json_data.get.spectator_data.id;
                  }
                  this.fixVisibility();
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
            if (json_data.get.kick_vote != null) { //only occurs when vote starts, not when someone votes
              this.game_data.kick_vote = json_data.get.kick_vote;
            }
            if (json_data.get.cancel_kick) {
              this.game_data.kick_vote = null;
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
              if (json_data.get.scoop_data.id == this.user.id) {
                this.user = json_data.scoop_data;
                this.logAction('scoop', null);
              }
              if (this.game_data.type == 2) {
                this.getTeam(json_data.get.scoop_data.id).scooped = false;
              }
            }
            if (json_data.get.end_game != null && json_data.get.end_game) {
              this.router.navigate(['games']);
            }
            if (json_data.get.turn_update != null) {
              this.game_data.current_turn = json_data.get.turn_update;
              this.game_data.last_turn = new Date().getTime();
              this.last_turn = new Date().getTime();
              if (this.user.turn != null && this.game_data.current_turn == this.user.turn && !this.isDeckTest()) {
                this.notification_sound.play();
                this.activateAlarms();
                if (this.isFastGame()) {
                  this.fast_game_counter = setInterval(() => {
                    console.log('burn!')
                    this.fastGameEndTurn();
                  }, 60000);
                }
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
          if (json_data.pong) {
            //console.log('pong');
          }
        });

        this.sleep(1500).then(() => {
          this.messageSocket({
            game_id: this.game_id,
            get: { game: this.game_id },
            post: { join: true }
          });
        });

        this.ping = setInterval(() => {
          this.messageSocket({
            game_id: this.game_id,
            ping: true
          });
        }, 30000);
        this.game_timer = setInterval(() => {
          //this.game_start_string = this.secondsToString(this.game_started);
          //this.last_turn_string = this.secondsToString(this.last_turn);
        }, 1000);

        this.counter_timer = setInterval(() => {
          this.checkCounters();
        }, 1000);
      });
    }
  }

  ngOnDestroy() {
    if (this.ping) {
      clearInterval(this.ping);
    }
    if (this.game_timer) {
      clearInterval(this.game_timer);
    }
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
    let user = this.isDeckTest() ? this.currentPlayer(): this.user;
    switch(type) {
      case 'move':
        if (data.source.name !== data.dest.name) {
          let out_card: any = JSON.parse(JSON.stringify(data.card))
          if (data.hand_fix) {
            this.setVisibility(out_card, 'play');
          }
          log_action = [
            //Maybe fix for deck?
            {text: user.name, type: 'player'},
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
            {text: user.name, type: 'player'},
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
            {text: user.name, type: 'player'},
            {text: data.card.tapped, type: 'tap'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'untap_all':
        if (data.cards) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: 'untapped', type: 'tap'},
            {text: '', type: 'card_list', cards: data.cards}
          ]
        }
        break;
      case 'counter':
        if (data.name && data.before != null && data.after != null) {
          if (data.options && data.options.card) {
            log_action = [
              {text: user.name, type: 'player'},
              {text: 'changed', type: 'regular'},
              {text: data.name, type: 'counter'},
              {text: 'on', type: 'regular'},
              {text: data.options.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.options.card))},
              {text: 'from', type: 'regular'},
              {text: data.before, type: 'value'},
              {text: 'to', type: 'regular'},
              {text: data.after, type: 'value'},
            ]
          }
          else {
            log_action = [
              {text: user.name, type: 'player'},
              {text: 'changed', type: 'regular'},
              {text: data.name, type: 'counter'},
              {text: 'from', type: 'regular'},
              {text: data.before, type: 'value'},
              {text: 'to', type: 'regular'},
              {text: data.after, type: 'value'}
            ]
          }
        }
        break;
      case 'invert':
        if (data.card) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: '', type: 'invert'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'flip':
        if (data.card) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: '', type: 'flip'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'alt_face':
        if (data.card) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: '', type: 'alt_face'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'note':
        log_action = [
          {text: user.name, type: 'player'},
          {text: 'updated note on', type: 'regular'},
          {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
        ]
        break;
      case 'shake':
        if (data.card) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: '', type: 'shake'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'clone':
        if (data.card) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: '', type: 'clone'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))}
          ]
        }
        break;
      case 'token':
        if (data.card) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: 'created ', type: 'regular'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))},
            {text: 'token', type: 'regular'}
          ]
        }
        break;
      case 'random':
        if (data.card && data.zone) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: 'selected', type: 'regular'},
            {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))},
            {text: 'at random from', type: 'regular'},
            {text: data.zone.name, type: 'location'},
          ]
        }
        break;
      case 'shuffle':
        log_action = [
          {text: user.name, type: 'player'},
          {text: '', type: 'shuffle'},
          {text: 'their library', type: 'regular'}
        ]
        break;
      case 'mulligan':
        if (data.count) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: 'mulliganed for', type: 'regular'},
            {text: data.count, type: 'number'}
          ]
        }
        break;
      case 'flipped_top':
        log_action = [
          {text: user.name, type: 'player'},
          {text: 'flipped the top card of their library', type: 'regular'},
        ]
        break;
      case 'draw':
        if (data.cards) {
          log_action = [
            {text: user.name, type: 'player'},
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
              {text: user.name, type: 'player'},
              {text: 'revealed', type: 'regular'},
              {text: data.count, type: 'number'},
              {text: ' cards and failed to find cmc less than', type: 'regular'},
              {text: data.cmc, type: 'value'}
            ]
          }
          else {
            log_action = [
              {text: user.name, type: 'player'},
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
              {text: user.name, type: 'player'},
              {text: 'revealed', type: 'regular'},
              {text: data.count, type: 'number'},
              {text: ' cards and failed to find a ', type: 'regular'},
              {text: data.type, type: 'value'}
            ]
          }
          else {
            log_action = [
              {text: user.name, type: 'player'},
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
          {text: user.name, type: 'player'},
          {text: '', type: 'scry'},
          {text: 'the top ' + this.sidenav_scry_count + ' cards of their library', type: 'regular'}
        ]
        break;
      case 'search':
        log_action = [
          {text: user.name, type: 'player'},
          {text: '', type: 'search'},
          {text: 'their library', type: 'regular'}
        ]
        break;
      case 'kick_vote':
        log_action = [
          {text: user.name, type: 'player'},
          {text: 'has requested to kick', type: 'regular'},
          {text: data.player.name, type: 'player'}
        ]
        break;
      case 'vote_kick':
        if (data.vote) {
          log_action = [
            {text: user.name, type: 'player'},
            {text: 'has voted to kick', type: 'regular'},
            {text: data.kickee.name, type: 'player'}
          ]
        }
        else {
          log_action = [
            {text: user.name, type: 'player'},
            {text: 'has voted not to kick', type: 'regular'},
            {text: data.kickee.name, type: 'player'}
          ]
        }
        break;
      case 'scoop':
        log_action = [
          {text: user.name, type: 'player'},
          {text: 'has scooped their library and is now spectating', type: 'regular'}
        ]
        break;
      case 'end_turn':
        log_action = [
          {text: user.name, type: 'player'},
          {text: 'has ended the turn', type: 'regular'}
        ]
        break;
      case 'reveal':
        log_action = [
          {text: user.name, type: 'player'},
          {text: '', type: 'reveal', showed: data.showed},
          {text: data.card.name, type: 'card', card: JSON.parse(JSON.stringify(data.card))},
          {text: data.showed? ' to ': ' from ', type: 'regular'},
          {text: this.getPlayerFromId(data.whomst).name, type: 'player'},
        ]
        break;
      case 'reveal_hand':
        log_action = [
          {text: user.name, type: 'player'},
          {text: '', type: 'reveal', showed: data.showed},
          {text: data.showed? ' their hand to ': ' their hand from ', type: 'regular'},
          {text: data.whomst > 0 ? this.getPlayerFromId(data.whomst).name: 'all', type: 'player'},
        ]
        break;
      case 'plane':
        log_action = [
          {text: user.name, type: 'player'},
          {text: 'set the plane to ', type: 'regular'},
          {text: data.plane.name, type: 'plane', card: JSON.parse(JSON.stringify(data.plane))},
        ]
        break;
      case 'roll':
        log_action = [
          {text: user.name, type: 'player'},
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
   * Helper function to open the help menu dialog
   */
  helpMenu() {
    const HelpRef = this.dialog.open(HelpDialog, {
      data: {
      }
    });
    HelpRef.afterClosed().subscribe((result) => {
    });
  }

  /**
   * Sends a counter update to the websocket within a buffered timeframe.
   * @param name the name of the counter
   * @param before the old value of the counter
   * @param after the new value of the counter
   * @param options accepts 'card'
   */
  updateCounter(name: string, before: any, after: any, options?: any) {
    let hasupdate = false;
    for (let counter of this.counterupdates) {
      if (counter.name === name) {
        if (options != null && options.card != null) {
          if (counter.options != null && counter.options.card !== null) {
            if (options.card.name === counter.card.name) {
              hasupdate = true;
              counter.after = after;
              counter.last_modified = Date.now();
            }
          }
        }
        else {
          hasupdate = true;
          counter.after = after;
          counter.last_modified = Date.now();
        }
      }
    }
    if (!hasupdate) {
      this.counterupdates.push({name: name, before: before, after: after, options: options, last_modified: Date.now()});
    }
  }


  /**
   * Runs a check on the list of updated counters to see if any counters have been idle long enough to send to socket.
   */
  checkCounters() {
    for (let counter of this.counterupdates) {
      if ((Math.abs(Date.now() - counter.last_modified) / 1000) > 2) {
        if (this.game_data.type == 2) {
          this.updateSocketTeam();
        }
        this.updateSocketPlayer();
        this.logAction('counter', {name: counter.name, before: counter.before, after: counter.after, options: counter.options});
        this.counterupdates.splice(this.counterupdates.indexOf(counter), 1);
      }
    }
  }


  /**
   * Returns the real-time value of the named counter for logging
   * @param name name of the counter
   * @param options 'card' if the counter is on a card.
   */
  getCounterValue(name: string, options?: any) {
    if (name === 'Life') {
      return this.game_data.type == 2 ? this.getTeam(this.user.id).life: this.isDeckTest() ? this.currentPlayer().life: this.user.life;
    }
    else if (name === 'Infect') {
      return this.game_data.type == 2 ? this.getTeam(this.user.id).infect: this.isDeckTest() ? this.currentPlayer().infect: this.user.infect;
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

  /**
   * Messages the socket to update data with the given player object, or the current use if player is null
   * @param player
   */
  updateSocketPlayer(player?: any) {
    let player_data = null;
    if (player) {
      player_data = player;
    }
    else {
      if (this.user == this.currentPlayer() || this.isDeckTest()) {
        player_data = this.currentPlayer();
      }
    }
    this.messageSocket({
      game_id: this.game_id,
      put: {
        action:'update',
        player_data: player_data
      }
    });
  }

  /**
   * Message the socket to update data with the current team object.
   */
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

  /**
   * Message socket to update the plane
   * @param plane
   */
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

  /**
   * Message socket to update data for the given zone
   * @param zone
   */
  updateSocketZone(zone: any) {
    this.messageSocket({
      game_id: this.game_id,
      put: {
        action:'update',
        zone_data: zone
      }
    });
  }

  /**
   * Send a message to the websocket
   * @param content
   */
  messageSocket(content: any) {
    let message = {
      source: '',
      content: {}
    };
    message.source = 'localhost';
    message.content = content;
    this.WebsocketService.messages.next(message);
  }

  isDeckTest() {
    return this.game_data.test;
  }

  isFastGame() {
    return this.game_data.fast;
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
    if (id == -696969) {
      return {name: 'All'}
    }
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
    for (let user_data of this.game_data.players) {
      if (user_data.id == id) {
        return user_data;
      }
    }
    return null;
  }

  /**
   * Initialize the user using the given deck.
   * @param deck Deck object to use. Needs to be pre-generated.
   * @param user_id
   * @param user_name
   */
  setupUserForPlay(deck: any, user_id?: any, user_name?: any) {
    deck.owner = user_id == null ? this.current_user.id: user_id;
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
    out_player.star_color = this.user && this.user.star_color ? this.user.star_color : null;
    out_player.teammate_id = this.user && this.user.teammate_id ? this.user.teammate_id: null;
    out_player.playmat_image = this.current_user.playmat;
    out_player.default_sleeves = this.current_user.default_sleeves;
    out_player.deck = deck;
    out_player.deck.commander = {name: 'commander', cards: [], saved: [], owner: out_player.deck.owner};
    out_player.name = user_name == null ? this.current_user.name: user_name;
    out_player.id = deck.owner;
    out_player.life = 40;
    out_player.infect = 0;
    out_player.playmat = []
    out_player.turn = this.user && this.user.turn && this.user.turn ? this.user.turn: -1;
    out_player.command_tax_1 = 0;
    out_player.command_tax_2 = 0;
    out_player.spectating = false;
    out_player.top_flipped = false;
    out_player.play_counters = [];
    out_player.monarch = false;
    out_player.initiative = false;
    for (let i = 0; i < 36; i++) {
      out_player.playmat.push({ name: 'play', id: i, owner: 1, cards: [], stack: false });
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
      card.triggering = false;
      card.is_token = false;
      card.tapped = 'untapped';
      card.visible = [];
      card.sidenav_visible = false;
      card.alt = false;
      card.facedown = false;
      card.shaken = false;
      card.inverted = false;
      card.notes = '';
      card.exiled_for = null;
      if (card.iscommander) {
        out_player.deck.commander.cards.push(card);
      }
    })
    out_player.deck.commander.cards.forEach((card: any) => {
      out_player.deck.commander.saved.push(card);
      out_player.deck.cards.splice(deck.cards.indexOf(card), 1);
    });
    this.shuffleDeck(out_player.deck.cards, {nolog: true, noupdate: true});
    for (let i = 0; i < this.game_data.players.length; i++) {
      if (this.game_data.players[i].id == deck.owner) {
        this.game_data.players[i] = out_player;
        if (this.game_data.players[i].id == this.current_user.id) {
          this.user = this.game_data.players[i];
        }
        break;
      }
    }
    this.updateSocketPlayer(out_player);
  }

  /**
   * Helper function to initialize user. Generates the deck necessary using given id.
   * @param deckid
   * @param user_id
   * @param user_name
   */
  initializePlayerDeck(deckid: number, user_id?: any, user_name?: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getDeckForPlay(deckid).then((deck_data: any) => {
        if (deck_data) {
          if (user_id && user_name) {
            this.setupUserForPlay(deck_data, user_id, user_name);
            resolve();
          }
          else {
            this.setupUserForPlay(deck_data);
            resolve();
          }
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Star game mode function to send the player colors to the web socket.
   */
  selectColors() {
    const selectColorsRef = this.dialog.open(SelectColorsDialog, {
      data: {
        players: this.game_data.players
      }
    });
    selectColorsRef.afterClosed().subscribe((result) => {
      if (result != null) {
        this.messageSocket({
          game_id: this.game_id,
          put: {
            action: 'colors',
            colors: result.colors,
          }
        });
      }
    });
  }

  /**
   * Message the web socket to start the game.
   */
  startGame() {
    if (this.game_data.type != 2) {
      this.game_data.turn_count = 1;
      this.messageSocket(
        {
          game_id: this.game_data.id,
          put: {
            action: 'start',
          }
        });
    }
    else {
      this.selectTeams();
    }
  }

  /**
   * Two Headed Giant function for selecting the teams.
   */
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

  /**
   * Helper function to select the deck to play with.
   */
  openDeckSelectDialog(): void {
    if (this.dialog.openDialogs.length == 0) {
      const deckDialogRef = this.dialog.open(DeckSelectDialog, {
        width: '1600px',
        data: {user: this.current_user.id, game_type: this.game_data.type, test: this.game_data.test, fast: this.game_data.fast, max_players: this.game_data.max_players}
      });

      deckDialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log(result);
          this.selectDeck(result);
        }
      })
    }
  }

  /**
   * Helper function to set up and initialize user with the given deck
   * @param deck
   */
  selectDeck(deck: any) {
    if (this.isDeckTest()) { //deck test
      if (deck.length && deck.length == this.game_data.max_players) {
        if (this.game_data.players && this.game_data.players.length && this.game_data.players.length == this.game_data.max_players) {
          let deck_promises = [];
          for (let i = 0; i < deck.length; i++) {
            if (this.game_data.type == 4 || this.game_data.type == 7) { //random
              deck_promises.push(new Promise<void>((resolve) => {
                this.setupUserForPlay(deck[i], this.game_data.players[i].id, this.game_data.players[i].name);
                resolve();
              }));
            }
            else {
              deck_promises.push(new Promise<void>((resolve) => {
                this.initializePlayerDeck(deck[i].id, this.game_data.players[i].id, this.game_data.players[i].name).then(() => {
                  resolve();
                });
              }));
            }
          }
          Promise.all(deck_promises);
        }
      }
    }
    else {
      if (this.game_data.type == 4 || this.game_data.type == 7) { //random
        this.setupUserForPlay(deck);
      }
      else {
        this.initializePlayerDeck(deck.id);
      }
    }
  }

  /**
   * Remove user from the game.
   */
  scoopDeck(): void {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      if (this.game_data.players.length == 1) {
        this.endGame();
      }
      else {
        let spectator = {
          id: this.currentPlayer().id,
          name: this.currentPlayer().name,
          spectating: true,
          play_counters: [],
          turn: this.currentPlayer().turn,
          deck_id: this.currentPlayer().deck.id
        }
        this.messageSocket({
          game_id: this.game_id,
          put: {
            action:'scoop',
            player_data: this.currentPlayer()
          }
        });
        if (this.game_data.type == 2) {
          let teammate = this.getTeammate();
          let spectator2 = {
            id: teammate.id,
            name: teammate.name,
            spectating: true,
            play_counters: [],
            deck_id: teammate.deck.id
          }
          this.game_data.players.splice(this.game_data.players.indexOf(teammate), 1);
          this.game_data.spectators.push(spectator2);
          this.getTeam(this.user.id).scooped = true;
        }
        this.logAction('scoop', null);
        this.game_data.players.splice(this.game_data.players.indexOf(this.currentPlayer()), 1);
        if (this.isDeckTest()) {
          this.deckTestNextPlayer(1);
        }
        else {
          this.user = spectator;
        }
        this.game_data.spectators.push(spectator);
      }
    }
  }

  /**
   * Start a vote to kick the given player from the game.
   * @param player
   */
  kickVote(player: any) {
    if (!this.isDeckTest()) {
      if (this.game_data.kick_vote == null) {
        this.game_data.kick_vote = {
          kicker: this.user,
          kickee: player,
          votes: [
            {
              player: this.user,
              kick: true
            }
          ]
        }
        this.messageSocket({
          game_id: this.game_id,
          put: {
            action: 'kick_vote',
            kicker: this.user,
            kickee: player,
            votes: [
              {
                player: this.user,
                kick: true
              }
            ]
          }
        });
        this.logAction('kick_vote', {player: player});
      }
    }
  }

  /**
   * Message socket with a vote to kick a player from the game.
   * @param vote
   */
  voteKick(vote: boolean) {
    if (!this.isDeckTest()) {
      if (this.game_data.kick_vote) {
        let kickee = this.game_data.kick_vote.kickee;
        if (vote) {
          this.game_data.kick_vote.votes.push({player: this.user, kick: vote});
        }
        else {
          this.game_data.kick_vote = null;
        }
        this.messageSocket({
          game_id: this.game_id,
          put: {
            action: 'vote_kick',
            vote: {player: this.user, kick: vote}
          }
        });
        this.logAction('vote_kick', {vote: vote, kickee: kickee});
      }
    }
  }

  /**
   * Checks if the user has voted on the current kick vote.
   */
  hasKickVoted() {
    if (this.game_data.kick_vote != null && this.game_data.kick_vote.votes) {
      if (this.game_data.kick_vote.kickee.name === this.user.name) {
        return true;
      }
      for (let vote of this.game_data.kick_vote.votes) {
        if (vote.player.name === this.user.name) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Select winners and message the web socket to end the game.
   */
  endGame() {
    if (!this.isDeckTest()) {
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
              winners: result.winners
            }
          });
        }
      });
    }
    else {
      this.messageSocket({
        game_id: this.game_id,
        put: {
          action:'end',
          winners: []
        }
      });
    }
  }

  /**
   * End turn helper function for fast game
   */
  fastGameEndTurn() {
    let old_life = this.user.life;
    this.user.life -= 5;
    this.updateCounter('Life', old_life, this.user.life);
    this.endTurn();
  }

  /**
   * Message the socket to end the turn for the current user
   */
  endTurn() {
    if (this.game_data.type != 2) {
      if (this.user == this.currentPlayer() || this.isDeckTest()) {
        if (this.game_data.current_turn == this.currentPlayer().turn) {
          this.messageSocket({
            game_id: this.game_id,
            put: {
              action:'end_turn',
            }
          });
          this.logAction('end_turn', {});
        }
        if (this.isFastGame()) {
          clearInterval(this.fast_game_counter);
        }
      }
    }
    else if (this.game_data.type == 2) {
      if (this.game_data.current_turn == this.getTeam(this.user.id).turn) {
        this.messageSocket({
          game_id: this.game_id,
          put: {
            action:'end_turn',
          }
        });
        this.logAction('end_turn', {});
      }
    }
  }

  /**
   * Select a plane at random
   */
  setPlane() {
    let new_plane = this.planes[Math.floor(Math.random() * (this.planes.length))];
    this.fddp_data.getCardInfo(new_plane).then((plane_data: any) => {
      this.getCardImages(new_plane).then((image_data: any) => {
        let images = image_data;
        let new_plane: any = plane_data;
        new_plane.plane = true;
        new_plane.image = images.length > 0 ? images[0].image: null;
        this.game_data.current_plane = plane_data;
        this.updateSocketPlane(plane_data);
        this.logAction('plane', {plane: plane_data});
      });
    });
  }

  /**
   * Generate a random from 1-6
   */
  rollD6() {
    let roll = Math.floor(Math.random() * 6) + 1;
    this.logAction('roll', {roll: roll, type: 'd6'});
  }

  /**
   * Generate a random from 1-20
   */
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
    else if (this.isDeckTest()) {
      return this.game_data.players[this.deck_test_player_index];
    }
    else if (this.user && this.user.deck) {
      return this.user;
    }
    else if (this.user.spectating) {
      return this.selected_player;
    }
    return null;
  }

  /**
   * Function to increment the player being viewed in deck test
   */
  deckTestNextPlayer(direction: number) {
    if (direction > 0) {
      this.deck_test_player_index = this.deck_test_player_index == this.game_data.players.length - 1? 0: this.deck_test_player_index + 1;
    }
    else if (direction < 0) {
      this.deck_test_player_index = this.deck_test_player_index == 0? this.game_data.players.length -1: this.deck_test_player_index - 1;
    }
  }

  /**
   * Returns a list of players that are not the user.
   */
  getOtherPlayers(): any[] {
    if (this.game_data != null && this.game_data.players != null && this.user != null) {
      let out_players: any[] = [];
      for (let player of this.game_data.players) {
        if (this.currentPlayer() == null || player != this.currentPlayer()) {
          out_players.push(player);
        }
      }
      return out_players;
    }
    return [];

  }

  /**
   * Helper function to highlight a player
   * @param selector
   */
  selectPlayer(selector: any) {
    if (this.isOpponent(selector) || this.isTeammate(selector)) {
      this.selected_player = selector;
    }
    else {
      this.selected_player = null;
    }
  }

  /**
   * Helper function for taunting
   * @param player
   */
  tauntPlayer(player: any) {

  }

  /**
   * Helper function to check if the given player is an opponent of the user
   * @param player
   */
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

  /**
   * Two Headed Giant helper function to return the player object of the user's teammate
   */
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

  /**
   * Helper function for two headed giant to check if the given player is the user's teammate
   * @param player
   */
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

  /**
   * Helper function for star to check if the color of the given player is an ally color with the user.
   * @param player
   */
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

  /**
   * Clear all modifiers on card.
   * @param card
   */
  clearCard(card: any, options?: any) {
    card.tapped = 'untapped';
    card.power_mod = 0;
    card.toughness_mod = 0;
    card.loyalty_mod = 0;
    card.counter_1 = false;
    card.counter_1_value = 0;
    card.counter_2 = false;
    card.counter_2_value = 0;
    card.counter_3 = false;
    card.counter_3_value = 0;
    card.multiplier = false;
    card.multiplier_value = 0;
    card.exiled_for = null;
    card.locked = false;
    card.primed = false;
    card.triggered = false;
    card.triggering = false;
    card.facedown = options != null && options.facedown != null && options.facedown == true;
    card.shaken = false;
    card.inverted = false;
    //card.notes = '';
    if (card.alt) {
      this.altFaceCard(card);
    }
  }

  /**
   * Clear modifiers on token but leave multiplier displayed and set to 1
   * @param token
   */
  clearToken(token: any) {
    this.clearCard(token);
    token.multiplier = true;
    token.multiplier_value = 1;
  }

  /**
   * Detects if a given card is a copy of a real card.
   * @param card card object to check
   */
  isClone(card: any): boolean {
    if (card.types) {
      return card.is_token && !card.types.includes('Token') && !card.types.includes('Emblem');
    }
    else {
      return false;
    }
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

  /**
   * Returns if card is an artifact or enchantment
   * @param card
   */
  isUnnatural(card: any) {
    if (card.types) {
      return card.types.includes("Artifact") ||
        card.types.includes("Enchantment");
    }
  }

  /**
   * Returns if the card is historic
   * @param card
   */
  isHistoric(card: any) {
    if (card.types) {
      return card.types.includes("Legendary") ||
        card.types.includes("Artifact") ||
        card.types.includes("Saga");
    }
  }

  isNonland(card: any) {
    if (card.types) {
      return !card.types.includes("Land");
    }
    return false;
  }

  isNonlandPermanent(card: any) {
    if (card.types) {
      return !(card.types.includes("Instant") || card.types.includes("Sorcery") || card.types.includes("Land"));
    }
    return false;
  }

  isNonPermanent(card: any) {
    if (card.types) {
      return (card.types.includes("Instant") || card.types.includes("Sorcery"));
    }
  }

  /**
   * Toggles the tap state of an input card
   * @param card
   */
  toggleCardTap(card: any) {
    console.log(this.rightclicked_item);
    if (card.tapped === 'tapped') {
      card.tapped = 'untapped';
    }
    else {
      card.tapped = 'tapped';
    }
    this.updateSocketPlayer();
    this.logAction('tap', {card: card});
  }

  /**
   * Untap all unlocked cards on the user's playmat
   */
  untapAll() {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      let cards = [];
      for (let spot of this.currentPlayer().playmat) {
        for (let card of spot.cards) {
          if (!card.locked) {
            if (card.tapped !== 'untapped') {
              cards.push(card);
              card.tapped = 'untapped';
            }
          }
        }
      }
      if (cards.length > 0) {
        this.updateSocketPlayer();
        this.logAction('untap_all', {cards: cards});
      }
    }
  }

  /**
   * Invert the card image
   * @param card
   */
  invertCard(card:any) {
    card.inverted = !card.inverted;
    this.updateSocketPlayer();
    this.logAction('invert', {card: card});
  }

  /**
   * Flip the card face down
   * @param card
   */
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

  /**
   * Flip the card onto it's alt face
   * @param card
   */
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

  /**
   * Edit the notes on the card
   * @param card
   */
  editNotes(card: any) {
    const noteDialogRef = this.dialog.open(NoteDialog, {
      width: '500px',
      data: {card: card}
    });
    noteDialogRef.afterClosed().subscribe(result => {
      if (result) {
        card.notes = result;
        this.updateSocketPlayer();
        this.logAction('note', {card:card});
      }
    })
  }

  clearNotes(card: any) {
    card.notes = '';
    this.logAction('note', {card:card});
    this.updateSocketPlayer();
  }

  /**
   * Message the socket to shake the given card.
   * @param card
   * @param id
   * @param location
   */
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

  /**
   * Animate the shaking of the given card.
   * @param cardid
   * @param userid
   * @param location
   */
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

  /**
   * Toggle the alarm status on the card
   * @param card
   */
  primeCard(card: any) {
    card.primed = !card.primed;
    this.updateSocketPlayer();
  }

  /**
   * Activate alarm animation on all primed cards on the users playmat
   */
  activateAlarms() {
    if (!this.isDeckTest()) {
      if (this.user != null) {
        for (let spot of this.user.playmat) {
          for (let card of spot.cards) {
            if (card.primed) {
              this.setAlarm(card, true);
            }
          }
        }
      }
    }
  }

  /**
   * Helper function for displaying the alarm animation on a loop
   * @param card
   * @param alarm
   */
  setAlarm(card: any, alarm: boolean) {
    card.triggered = alarm;
    if (card.triggered) {
      card.triggering = !card.triggering;
    }
  }

  /**
   * Helper function for displaying the alarm animation on a loop
   * @param card
   */
  onAlarmDone(card) {
    if (card.triggered) {
      card.triggering = !card.triggering;
    }
  }

  stackRotate(arr, event:any, options?: any) {
    if (event.wheelDelta < 0) arr.unshift(arr.pop());
    else arr.push(arr.shift());
    if (options != null && options.noupdate) {

    }
    else {
      if (this.user == this.currentPlayer() || this.isDeckTest()) {
        this.updateSocketPlayer();
      }
    }
  }

  toggleStack(spot) {
    spot.stack = true;
  }

  /**
   * Create a token copy of the card.
   * @param card
   */
  cloneCard(card: any, options?: any) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      let card_clone = JSON.parse(JSON.stringify(card));
      card_clone.is_token = true;
      card_clone.owner = this.currentPlayer().id;
      this.clearToken(card_clone);
      this.setVisibility(card_clone, 'play');
      card_clone.notes = options != null && options.notes != null? options.notes: '';
      this.currentPlayer().temp_zone.cards.push(card_clone);
      this.updateSocketPlayer();
      this.logAction('clone', {card: card_clone});
    }
  }

  /**
   * Helper function to get the list of all tokens associated with the given card.
   * @param card
   */
  getTokenList(card): any[] {
    let out_tokens = [];
    for (let token of card.tokens) {
      let have = false;
      for (let old_tok of out_tokens) {
        if (token.name === old_tok.name) {
          have = true;
          break;
        }
      }
      if (!have) {
        out_tokens.push(token);
      }
    }
    return out_tokens;
  }

  /**
   * Comparison function to check if 2 token objects are equal.
   * @param card1
   * @param card2
   */
  isEqualToken(card1: any, card2: any) {
    return card1.name.toLowerCase() === card2.name.toLowerCase() &&
      card1.power === card2.power &&
      card1.toughness === card2.toughness &&
      card1.colors.includes("W") == card2.colors.includes("W") &&
      card1.colors.includes("U") == card2.colors.includes("U") &&
      card1.colors.includes("B") == card2.colors.includes("B") &&
      card1.colors.includes("R") == card2.colors.includes("R") &&
      card1.colors.includes("G") == card2.colors.includes("G")
  }

  /**
   * Attempts to insert a token with the given string name from the tokens already in the user's deck. If the
   * token is not in the deck, does nothing.
   * @param token
   */
  quickCreateToken(token: string) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      let out_tokens = [];
      for (let tok of this.currentPlayer().deck.tokens) {
        if (tok.name.toLowerCase() === token.toLowerCase()) {
          let out_token: any = null;
          out_token = JSON.parse(JSON.stringify(tok));
          out_token.is_token = true;
          out_token.owner = -1;
          this.clearToken(out_token);
          this.setVisibility(out_token, 'play');
          out_tokens.push(out_token);
        }
      }
      if (out_tokens.length == 1) {
        this.currentPlayer().temp_zone.cards.unshift(out_tokens[0]);
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
            this.currentPlayer().temp_zone.cards.unshift(result);
            this.updateSocketPlayer();
            this.logAction('token', {card: result});
          }
        });
      }
      else {
        this.snackbar.open('token not found in deck.', 'close', {
          horizontalPosition: 'end',
          verticalPosition: 'top'
        })
      }
    }
  }

  /**
   * Open the token creation dialog and insert a token.
   * @param token
   */
  createToken(token: any) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      let out_tokens: any[] = [];
      for (let tok of this.currentPlayer().deck.tokens) {
        if (this.isEqualToken(tok, token)) {
          let out_token: any = null;
          out_token = JSON.parse(JSON.stringify(tok));
          out_token.is_token = true;
          out_token.owner = -1;
          this.clearToken(out_token);
          this.setVisibility(out_token, 'play');
          out_tokens.push(out_token);
        }
      }
      if (out_tokens.length == 1) {
        this.currentPlayer().temp_zone.cards.unshift(out_tokens[0]);
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
            this.currentPlayer().temp_zone.cards.unshift(result);
            this.updateSocketPlayer();
            this.logAction('token', {card: result});
          }
        });
      }
      else {
        let out_token = JSON.parse(JSON.stringify(token));
        out_token.is_token = true;
        out_token.owner = -1;
        this.clearToken(out_token);
        this.setVisibility(out_token, 'play');
        this.currentPlayer().temp_zone.cards.unshift(out_token);
        this.updateSocketPlayer();
        this.logAction('token', {card: out_token});
      }
    }
  }

  /**
   * Helper function to open the token create dialog
   */
  openTokenDialog(): void {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      const tokDialogRef = this.dialog.open(TokenInsertDialog, {
        width: '800px',
        data: {
          deck_tokens: this.currentPlayer().deck.tokens
        },
      });

      tokDialogRef.afterClosed().subscribe(result => {
        if (result) {
          let out_token = JSON.parse(JSON.stringify(result));
          out_token.is_token = true;
          out_token.owner = -1;
          this.clearToken(out_token);
          this.setVisibility(out_token, 'play');
          this.currentPlayer().temp_zone.cards.unshift(out_token);
          this.updateSocketPlayer();
          this.logAction('token', {card: out_token});
        }
      });
    }
  }

  /**
   * Get all available images for the given card name.
   * @param name
   */
  getCardImages(name: string): Promise<any> {
    return new Promise<any>((resolve) => {
      this.fddp_data.getImagesForCard(name).then((image_data: any) => {
        resolve(image_data.images);
      });
    })
  }

  /**
   * Flip the top card of the library face up.
   */
  flipTop() {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      this.currentPlayer().top_flipped = !this.currentPlayer().top_flipped;
      this.updateSocketPlayer();
      this.logAction('flipped_top', null);
    }
  }

  /**
   * Shuffle the given array of cards.
   * @param cards
   * @param options
   */
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

  /**
   * Visibility helper function for changing view permissions on a card.
   * @param card
   * @param whomst
   * @param options
   */
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

  /**
   * Visibility helper function for revealing entire hand to players.
   * @param whomst
   */
  revealHandToggle(whomst: number) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      let showed = false;
      if (whomst == -6969) {
        showed = true;
        this.currentPlayer().hand_preview = [];
        for (let player of this.game_data.players) {
          this.currentPlayer().hand_preview.push(player.id);
        }
        for (let player of this.game_data.spectators) {
          this.currentPlayer().hand_preview.push(player.id);
        }
        for (let card of this.currentPlayer().hand.cards) {
          this.toggleCardReveal(card, whomst, {nolog: true, noupdate: true, forcevisible: true});
        }
      }
      else if (whomst == -1) {
        this.currentPlayer().hand_preview = [this.currentPlayer().id];
        for (let card of this.currentPlayer().hand.cards) {
          this.toggleCardReveal(card, whomst, {nolog: true, noupdate: true});
        }
      }
      else {
        if (this.currentPlayer().hand_preview.includes(whomst)) {
          this.currentPlayer().hand_preview.splice(this.currentPlayer().hand_preview.indexOf(whomst), 1);
          for (let card of this.currentPlayer().hand.cards) {
            this.toggleCardReveal(card, whomst, {nolog: true, noupdate: true, forceinvisible: true});
          }
        }
        else {
          this.currentPlayer().hand_preview.push(whomst);
          showed = true;
          for (let card of this.currentPlayer().hand.cards) {
            this.toggleCardReveal(card, whomst, {nolog: true, noupdate: true, forcevisible: true});
          }
        }
      }
      this.updateSocketPlayer();
      this.logAction('reveal_hand', {whomst: whomst, showed: showed});
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

  /**
   * Checks to see if the card has the given type in its type line
   * @param card
   * @param type
   */
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
   * @param type type to look for, or 'historic', 'unnatural', 'permanent', 'nlpermanent'
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
          if (play.playmat) {
            for (let spot of play.playmat) {
              for (let card of spot.cards) {
                if ((type.toLowerCase() === 'permanent' && this.isPermanent(card)) ||
                  (type.toLowerCase() === 'unnatural' && this.isUnnatural(card)) ||
                  (type.toLowerCase() === 'historic'  && this.isHistoric(card)) ||
                  (type.toLowerCase() === 'nlpermanent'  && this.isNonlandPermanent(card)) ||
                  (type.toLowerCase() === 'nonpermanent'  && this.isNonPermanent(card)) ||
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
        }
        else {
          let cur_zone: any = this.getPlayerZone(play.id, zone);
          if (cur_zone != null) {
            for (let card of cur_zone.cards) {
              if ((type.toLowerCase() === 'permanent' && this.isPermanent(card)) ||
                (type.toLowerCase() === 'unnatural' && this.isUnnatural(card)) ||
                (type.toLowerCase() === 'historic'  && this.isHistoric(card)) ||
                (type.toLowerCase() === 'nlpermanent'  && this.isNonlandPermanent(card)) ||
                (type.toLowerCase() === 'nonpermanent'  && this.isNonPermanent(card)) ||
                (this.hasType(card, type))) {
                count ++;
              }
            }
          }
        }
      }
    }
    return count;
  }

  /**
   * Create a randomly colored counter
   * @param type
   */
  createCounter(type: string) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      this.currentPlayer().play_counters.push({
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        value: 0,
        search_type: '',
        search_player: this.currentPlayer().id,
        search_zone: 'play',
        type: type,
        position: {x: 20, y: 20}
      });
      this.updateSocketPlayer();
    }
  }

  /**
   * Remove the given counter from play
   * @param counter
   */
  deleteCounter(counter: any) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      this.currentPlayer().play_counters.splice(this.currentPlayer().play_counters.indexOf(counter), 1);
      this.updateSocketPlayer();
    }
  }

  /**
   * Clear out all counters.
   */
  deleteAllCounters() {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      this.currentPlayer().play_counters = [];
      this.updateSocketPlayer();
    }
  }

  /**
   * Stores the new location of a counter after it has been dragged
   * @param event the drag event
   * @param counter the counter being updated
   */
  setCounterPosition(event: any, counter: any) {
    if (this.user != null && (this.user == this.currentPlayer() || this.isDeckTest())) {
      counter.position = { ...(<any>event.source._dragRef)._passiveTransform };
      this.updateSocketPlayer();
    }
  }

  /**
   * Select a card at random from the given zone
   * @param zone
   */
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

  /**
   * Helper function to determine if keyboard shortcuts are currently allowed
   * @param event
   */
  keyAllowed(event: any): boolean {
    if (event.target.nodeName !== "INPUT" &&
      event.target.nodeName !== 'TEXTAREA' &&
      !this.matMenuTrigger.menuOpen &&
      this.dialog.openDialogs.length == 0 && (this.user == this.currentPlayer() || this.isDeckTest())) {
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
        case "r":
          this.openSideNav(this.currentPlayer().exile);
          break;
        case "t":
          this.openTokenDialog();
          break;
        case "o":
          break;
        case "s":
          this.shuffleDeck(this.currentPlayer().deck.cards);
          break;
        case "d":
          this.draw_count = 1;
          this.drawToX(this.currentPlayer().hand);
          break;
        case "f":
          this.openSideNav(this.currentPlayer().deck);
          break;
        case "g":
          this.openSideNav(this.currentPlayer().grave);
          break;
        case "x":
          this.untapAll();
          break;
        case "m":
          this.mulliganHand(7);
          break;
        case "h":
          this.helpMenu();
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
            this.updateCounter('Life', item.player.life + 1, item.player.life);
          }
          else if (item.team) {
            item.team.life--;
            this.updateCounter('Life', item.team.life + 1, item.team.life, {team: true});
          }
          break;
        case 'infect':
          if (item.player) {
            item.player.infect--;
            this.updateCounter('Infect', item.player.infect + 1, item.player.infect);
          }
          else if (item.team) {
            item.team.infect--;
            this.updateCounter('Infect', item.team.infect + 1, item.team.infect, {team: true});
          }
          break;
        case 'counter_1':
          item.card.counter_1_value--;
          this.updateCounter('Counter 1', item.card.counter_1_value + 1, item.card.counter_1_value, {card: item.card});
          break;
        case 'counter_2':
          item.card.counter_2_value--;
          this.updateCounter('counter 2', item.card.counter_2_value + 1, item.card.counter_2_value, {card: item.card});
          break;
        case 'counter_3':
          item.card.counter_3_value--;
          this.updateCounter('counter 3', item.card.counter_3_value + 1, item.card.counter_3_value, {card: item.card});
          break;
        case 'multiplier':
          item.card.multiplier_value--;
          this.updateCounter('Multiplier', item.card.counter_multiplier_value + 1, item.card.counter_multiplier_value, {card: item.card});
          break;
        case 'power':
          item.card.power_mod--;
          this.updateCounter('Power',item.card.power_mod + item.card.power + 1, item.card.power_mod + item.card.power, {card: item.card});
          break;
        case 'toughness':
          item.card.toughness_mod--;
          this.updateCounter('Toughness', item.card.toughness_mod + item.card.toughness + 1, item.card.toughness_mod + item.card.toughness, {card: item.card});
          break;
        case 'loyalty':
          item.card.loyalty_mod--;
          this.updateCounter('Loyalty', item.card.loyalty_mod + item.card.loyalty + 1, item.card.loyalty_mod + item.card.loyalty, {card: item.card});
          break;
        case 'command_tax_1':
          if (this.user == this.currentPlayer() || this.isDeckTest()) {
            this.currentPlayer().command_tax_1--;
            this.updateCounter('Command Tax', this.currentPlayer().command_tax_1 + 1, this.currentPlayer().command_tax_1);
          }
          break;
        case 'command_tax_2':
          if (this.user == this.currentPlayer() || this.isDeckTest()) {
            this.currentPlayer().command_tax_2--;
            this.updateCounter('Command Tax 2', this.currentPlayer().command_tax_2 + 1, this.currentPlayer().command_tax_2);
          }
          break;
        case 'custom_counter':
          item.counter.value--;
          this.updateCounter('', null, null);
          break;
        case 'team_life':
          item.team.life--;
          this.updateCounter('Life', item.team.life + 1, item.team.life);
          break;
        case 'team_infect':
          item.team.infect--;
          this.updateCounter('Infect', item.team.infect + 1, item.team.infect);
          break;
        default:
          this.rightclicked_item = item;
          this.menuTopLeftPosition.x = event.clientX + 'px';
          this.menuTopLeftPosition.y = event.clientY + 'px';
          this.matMenuTrigger.openMenu();
      }
    }
  }

  /**
   * Helper function for incrementing counters
   * @param event
   * @param counter
   */
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
          this.updateCounter('', null, null);
        }
      });
    }
    else {
      counter.value = counter.value + 1;
      this.updateCounter('', null, null);
    }
  }

  /**
   * Helper function for incrementing life
   * @param event
   * @param player
   */
  lifeClick(event: any, player: any) {
    let old_life = player.life;
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
            this.updateCounter('Life', old_life, player.life, {team: true});
          }
          else {
            this.updateCounter('Life', old_life, player.life);
          }

        }
      });
    }
    else {
      player.life = player.life + 1;
      if (this.game_data.type == 2) {
        this.updateCounter('Life', old_life, player.life, {team: true});
      }
      else {
        this.updateCounter('Life', old_life, player.life);
      }
    }
  }

  /**
   * Helper function to increment infect counters
   * @param event
   * @param player
   */
  infectClick(event: any, player: any) {
    let old_infect = player.infect;
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
            this.updateCounter('Infect', old_infect, player.infect, {team: true});
          }
          else {
            this.updateCounter('Infect', old_infect, player.infect);
          }
        }
      });
    }
    else {
      player.infect = player.infect + 1;
      if (this.game_data.type == 2) {
        this.updateCounter('Infect', old_infect, player.infect, {team: true});
      }
      else {
        this.updateCounter('Infect', old_infect, player.infect);
      }
    }
  }

  /**------------------------------------------------
   *               Sidenav Functions                *
   ------------------------------------------------**/

  @ViewChild('fddp_sidenav') fddp_sidenav: any;
  openSideNav(zone: any, options?: any) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      this.sidenav_selected_player = this.currentPlayer();
      this.sidenav_type = zone.name === this.currentPlayer().deck.name ? 'deck': zone.name;

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
      else if (options && options.spot != null) {
        let items = options.spot.cards;
        for (let i = 0; i < items.length; i++) {
          items[i].sidenav_visible = true;
        }
        this.sidenav_sort = '';
        this.sidenav_sort_type = '';
        this.sidenav_spot = options.spot;
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
  }

  closeSideNav() {
    this.sidenav_sort = '';
    this.sidenav_sort_type = '';
    this.sidenav_selected_player = null;
    this.sidenav_type = null;
    this.fddp_sidenav.close();
    this.sidenav_spot = null;
  }

  /**
   * Sort and filter the sidenav with the selected options.
   */
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
          if (!item.visible.includes(this.currentPlayer().id)) {
            item.sidenav_visible = false;
          }
        }
      }
    }
  }

  /**
   *
   */
  getSidenavSearchList() {
    return this.getSidenavList();
  }


  /**
   * Get the zone data and load it into the sidenav
   */
  getSidenavList(options?: any) {
    let items: any[] = []
    switch(this.sidenav_type) {
      case 'grave':
        items = this.sidenav_selected_player.grave.cards;
        break;
      case 'exile':
        if (this.sidenav_selected_player == null) {
          items = this.getSharedExile();
        }
        else {
          items = this.sidenav_selected_player.exile.cards;
        }
        break;
      case 'temp_zone':
        items = this.sidenav_selected_player.temp_zone.cards;
        break;
      case 'deck':
        items = this.sidenav_selected_player.deck.cards;
        break;
      case 'scry':
        items = this.sidenav_selected_player.deck.cards;
        break;
      case 'stack':
        items = this.sidenav_spot.cards;
        break;
    }
    return items;
  }

  /**
   * Gets exiled cards from other players to display on sidenav
   */
  getSharedExile() {
    let items: any[] = [];
    if (this.sidenav_type !== 'exile') {
      return [];
    }
    for (let player of this.game_data.players) {
      if (player.id !== this.currentPlayer().id) {
        for (let card of this.getPlayerZone(player.id, 'exile').cards) {
          if (card.exiled_for === this.currentPlayer().id || card.exiled_for == -696969) {
            items.push(card);
          }
        }
      }
    }
    return items;
  }

  getSidenavContainer() {
    return this.getPlayerZone(this.sidenav_selected_player.id, this.sidenav_type);
  }

  sidenavPredicate() {
    return (this.sidenav_sort === '' || this.sidenav_sort === undefined) && (this.sidenav_sort_type === '' || this.sidenav_sort === undefined);
  }

  /**------------------------------------------------
   *           Card Relocation Functions            *
   ------------------------------------------------**/

  /**
   * Returns the source container for a drag event array.
   * @param array array to locate
   */
  getContainer(array: any[]) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      if (array == this.currentPlayer().deck.cards) {
        return this.currentPlayer().deck;
      }
      else if (array == this.currentPlayer().grave.cards) {
        return this.currentPlayer().grave;
      }
      else if (array == this.currentPlayer().exile.cards) {
        return this.currentPlayer().exile;
      }
      else if (array == this.currentPlayer().deck.commander.cards) {
        return this.currentPlayer().deck.commander;
      }
      else if (array == this.currentPlayer().hand.cards) {
        return this.currentPlayer().hand;
      }
      else if (array == this.currentPlayer().temp_zone.cards) {
        return this.currentPlayer().temp_zone;
      }
      else { //Play
        for (let spot of this.currentPlayer().playmat) {
          if (array == spot.cards) {
            return spot;
          }
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
    if (this.getPlayerFromId(id)) {
      switch (zone) {
        case 'deck':
          return this.getPlayerFromId(id).deck;
        case 'scry':
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
        case 'stack':
          return this.sidenav_spot;
      }
    }
    else {
      return null;
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
   * Fix the visibility of the card as it changes zones (cards in grave cannot be facedown, so they are flipped)
   */
  fixVisibility() {
    for (let player of this.game_data.players) {
      for (let card of player.grave.cards) {
        this.setVisibility(card, 'grave');
      }
      for (let card of player.exile.cards) {
        this.setVisibility(card, 'exile');
      }
      for (let card of player.temp_zone.cards) {
        this.setVisibility(card, 'temp_zone');
      }
      for (let card of player.commander.cards) {
        this.setVisibility(card, 'commander');
      }
      for (let spot of player.playmat) {
        for (let card of spot.cards) {
          this.setVisibility(card, 'play');
        }
      }
    }
  }

  /**
   * Drag a card from one array to another.
   * @param card the object being dragged.
   * @param dest the destination container, containing the destination array.
   * @param event the drag event.
   */
  dragCard(card: any, dest: any, event: any, options?: any) {
    if (options && options.top) {
      this.sendCardToZone(card, this.getContainer(event.previousContainer.data), dest,
        event.previousContainer.data.indexOf(card), 0, options);
    }
    else if (event.previousContainer.data == this.getSidenavList()) {
      this.sendCardToZone(card, this.getContainer(event.previousContainer.data), dest,
        this.getSidenavList().indexOf(card), event.currentIndex, options);
      this.getSidenavSort();
    }
    else {
      this.sendCardToZone(card, this.getContainer(event.previousContainer.data), dest,
        event.previousContainer.data.indexOf(card), event.currentIndex, options);
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

    if (dest.name === 'hand' || dest.name === 'grave' || dest.name === 'exile') {
      this.clearCard(card, options);
    }

    if (dest.name === 'exile' && options != null && options.exiled_for != null) {
      card.exiled_for = options.exiled_for;
    }

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
                this.logAction('move', {card: card, source: source, dest: dest, hand_fix: dest == this.currentPlayer().hand && source != this.currentPlayer().deck});
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
          //if (dest.cards.length < 3) {
          if (dest.cards.length < 100) {
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

  /**
   * Send all cards from one zone into another
   * @param source
   * @param dest
   * @param options
   */
  sendAllTo(source: any, dest: any, options?: any) {
    let cards = [];
    while (source.cards.length > 0) {
      cards.push(source.cards[0]);
      if (options && options.bottom) {
        this.sendCardToZone(source.cards[0], source, dest, 0, dest.cards.length, {nolog: true, noupdate: true,
          exiled_for: options != null && options.exiled_for != null? options.exiled_for: null});

      }
      else {
        this.sendCardToZone(source.cards[0], source, dest, 0, 0, {nolog: true, noupdate: true,
          exiled_for: options != null && options.exiled_for != null? options.exiled_for: null});
      }
    }
    if (options && options.nolog) {}
    else {
      this.logAction('move_all', {cards: cards, source: source, dest: dest, hand_fix: dest == this.currentPlayer().hand && source != this.currentPlayer().deck});
    }
    if (options && options.noupdate) {}
    else {
      this.updateSocketPlayer();
    }
  }

  /**
   * Move a card to a specific deck position
   * @param card
   * @param source
   * @param dest
   * @param previousIndex
   * @param currentIndex
   * @param options
   */
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
    if (this.user != this.currentPlayer() && !this.isDeckTest()) {
      return;
    }
    let num_count = Number(this.draw_count);
    let cards = [];
    for (let i = 0; i < num_count; i++) {
      if (this.currentPlayer().deck.cards.length > 0) {
        cards.push(this.currentPlayer().deck.cards[0]);
        if (options!= null && options.facedown != null && options.facedown == true) {
          this.currentPlayer().deck.cards[0].facedown=true; this.currentPlayer().deck.cards[0].visible = [];
        }
        this.sendCardToZone(this.currentPlayer().deck.cards[0], this.currentPlayer().deck, dest, 0, 0,
          {nolog: true, noupdate: true,
          exiled_for: options != null && options.exiled_for != null? options.exiled_for: null,
          facedown: options!= null && options.facedown != null && options.facedown == true});
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

  /**
   * Execute a mulligan and then draw count cards.
   * @param count
   */
  mulliganHand(count: any) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      this.draw_count = Number(count);
      this.sendAllTo(this.currentPlayer().hand, this.currentPlayer().deck, {nolog: true, noupdate: true});
      this.shuffleDeck(this.currentPlayer().deck.cards, {nolog: true, noupdate: true});
      this.drawToX(this.currentPlayer().hand, {nolog: true, noupdate: true});
      this.updateSocketPlayer();
      this.logAction('mulligan', {count: count});
    }
  }

  /**
   * Draws cards from the top of the deck to the temp zone until it reveals a non-land card with cmc less than value.
   * @param value the cmc of the current cascade.
   */
  cascade(value: any) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      let cmc = Number(value);
      let count = 0;
      let failed = false;
      while(true) {
        if (this.currentPlayer().deck.cards.length > 0) {
          count ++;
          let cur_card = this.currentPlayer().deck.cards[0];
          this.sendCardToZone(cur_card, this.currentPlayer().deck, this.currentPlayer().temp_zone, 0, 0,
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
  }

  /**
   * Draws cards from the top of the deck to the temp zone until it reveals a card of the chosen type.
   * @param type the type string to look for, or 'permanent', 'historic' or 'unnatural'
   */
  drawUntil(type: string) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      let count = 0;
      let failed = false;
      while(true) {
        if (this.currentPlayer().deck.cards.length > 0) {
          count++;
          let cur_card = this.currentPlayer().deck.cards[0];
          this.sendCardToZone(cur_card, this.currentPlayer().deck, this.currentPlayer().temp_zone, 0, 0,
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
            }
            if (type.toLowerCase() === 'nlpermanent') {
              if (this.isNonlandPermanent(cur_card)) {
                break;
              }
            }
            if (type.toLowerCase() === 'nonpermanent') {
              if (this.isNonPermanent(cur_card)) {
                break;
              }
            }
            else {
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
  }

  /**
   * Loads count cards into the sidenav display
   * @param count
   */
  scryX(count: any) {
    if (this.user == this.currentPlayer() || this.isDeckTest()) {
      this.sidenav_scry_count = Number(count);
      this.openSideNav(this.currentPlayer().deck, {scry: true});
      this.logAction('scry', null);
    }
  }

  toggleMonarch() {
    this.user.monarch = this.user.monarch != null ? !this.user.monarch : true;
    this.updateSocketPlayer();
  }

  toggleInitiative() {
    this.user.initiative = this.user.initiative != null ? !this.user.initiative : true;
    this.updateSocketPlayer();
  }
}
