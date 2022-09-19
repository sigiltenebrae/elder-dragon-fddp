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

  /**------------------------------------------------
   *                  Variables                     *
   ------------------------------------------------**/
  game_id = -1;
  current_user: any = null;
  received: any[] = [];
  game_data: any = null;

  user: any = null;
  selected_player: any = null;
  sidenav_selected_player: any = null;

  hovered_card: any = null;
  card_preview_data: any = {shift_pressed: false, control_pressed: false}
  preview = false;

  scrying = false;

  draw_to_count = '1';
  draw_until = '';

  rightclicked_item: any = null;
  sidenav_type: any = null;
  sidenav_sort_type: string = '';
  selected_cards: any[] = [];
  sidenav_sort = '';
  sidenav_scry_count = 0;

  hidden = false;
  loading = false;

  zone_transfers: any[] = [];
  counter_buffer = false;

  /**------------------------------------------------
   *           General Helper Functions             *
   ------------------------------------------------**/

  /**
   * Sleep functions for the desired amount of time
   * @param ms
   */
  sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }


  /**------------------------------------------------
   *              Game Setup Functions              *
   ------------------------------------------------**/
  constructor(private rightClickHandler: RightclickHandlerServiceService, private fddp_data: FddpApiService,
              private snackbar: MatSnackBar, public dialog: MatDialog, private route: ActivatedRoute,
              private tokenStorage: TokenStorageService, private WebsocketService: FddpWebsocketService,
              private router: Router) { }

  ngOnInit(): void {

    this.rightClickHandler.overrideRightClick();

    const routeParams = this.route.snapshot.paramMap;
    this.game_id = Number(routeParams.get('gameid'));

    this.current_user = this.tokenStorage.getUser();

    this.WebsocketService.messages.subscribe(msg => {
      let json_data = msg;
      console.log('got a message');
      if (json_data.game_data) { //is the entire board request
        if (!json_data.game_data.id) {
          console.log('game does not exist')
          this.router.navigate(['/']);
        }
        console.log('got game')
        this.game_data = json_data.game_data;
        console.log(this.game_data);
        if (this.game_data.players){
          for (let player of this.game_data.players) {
            console.log(player.name);
            if (player.id == this.current_user.id) {
              this.user = player;
              console.log('user loaded: ' + this.user.name);
            }
          }
        }
        if (this.user == null) { //user is not in the game
          console.log('registering user');
          if(this.game_data.turn_count == 0) { //it is the start of the game
            console.log('select deck');
            this.openDeckSelectDialog();
            console.log('deck selected');
          }
          else {
            console.log('game in progress, attempting to spectate');
            //console.log('game in progress. spectating not supported, kicking player');
            //this.router.navigate(['/']);
            this.createSpectator(this.current_user.name, this.current_user.id);
          }
        }
      }
      else if (json_data.player_data) { //is it a player data request (deck change, etc)
        console.log('player data received');
        if (json_data.player_data != {}) {
          let found = false;
          if (this.game_data) {
            for (let i = 0; i < this.game_data.players.length; i++) {
              if (this.game_data.players[i].id == json_data.player_data.id) {
                console.log('player ' + json_data.player_data.id + ' found. Updating data.');
                found = true;
                this.game_data.players[i] = json_data.player_data;
                if (this.game_data.players[i].id == this.current_user.id) { //was the updated player you
                  this.user = this.game_data.players[i];
                }
                if (this.selected_player != null && this.game_data.players[i].id == this.selected_player.id ) { //was the updated player your selected
                  this.selected_player = this.game_data.players[i];
                  console.log('updated player was selected.');
                }
                break;
              }
            }
            console.log('user found in game?: ' + found);
            if (!found) {
              console.log('adding player to game');
              this.game_data.players.push(json_data.player_data);
              let p_id = json_data.player_data.id;
              this.fixVisibility(p_id);
              if (json_data.player_data.id == this.current_user.id) {
                console.log('setting player as user');
                for (let player of this.game_data.players) {
                  if (player.id == this.current_user.id) {
                    this.user = player;
                    break;
                  }
                }
              }
            }
          }
        }
      }
      else if (json_data.player_temp_data) {
        console.log('multiple players modified.');
        for (let i = 0; i < this.game_data.players.length; i++) {
          if (this.game_data.players[i].id === json_data.player_temp_data.id){
            this.game_data.players[i] = json_data.player_temp_data;
            console.log('main player data updated.');
            if (this.selected_player != null && this.game_data.players[i].id == this.selected_player.id ) { //was the updated player your selected
              this.selected_player = this.game_data.players[i];
              console.log('updated player was selected.');
            }
          }
          if (this.game_data.players[i].id === json_data.temp_id) {
            console.log('updating zone for player ' + json_data.temp_id + ': ' + json_data.temp_zone_name);
            switch (json_data.temp_zone_name) {
              case 'grave':
                this.game_data.players[i].grave = json_data.temp_zone;
                break;
              case 'exile':
                this.game_data.players[i].exile = json_data.temp_zone;
                break;
              case 'temp_zone':
                this.game_data.players[i].temp_zone = json_data.temp_zone;
                break;
              case 'hand':
                this.game_data.players[i].hand = json_data.temp_zone;
                break;
              case 'deck':
                this.game_data.players[i].deck.cards = json_data.temp_zone;
                break;
              case 'commander':
                this.game_data.players[i].deck.commander = json_data.temp_zone;
                break;
            }
          }
        }
      }
      else if (json_data.play_order) {
        console.log('play order received');
        for (let play of json_data.play_order) {
          for (let player of this.game_data.players) {
            if (player.id == play.id) {
              player.turn = play.turn;
            }
          }
        }
        this.game_data.players.sort((a: any, b: any) => (a.turn > b.turn) ? 1: -1);
        this.game_data.turn_count = 1;
      }
      else if (json_data.turn_data) {
        console.log('turn update received');
        this.game_data.turn_count = json_data.turn_data.turn_count;
        this.game_data.current_turn = json_data.turn_data.current_turn;
      }
      else if (json_data.shake_data) {
        console.log('shake received');
        this.cardShake(json_data.shake_data.cardid, json_data.shake_data.userid, json_data.shake_data.location);
      }
    });


    this.sleep(1500).then(() => {
      this.sendMsg({
        request: 'game_data',
        game_id: this.game_id
      });
    });
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


  /**
   * Sends a message to the web socket to add / update the deck for a player
   * @param name name of the player
   * @param id id of the player
   * @param deckid id of the selected deck
   */
  setPlayerDeck(name: string, id: number, deckid: number): Promise<void> {
    console.log(this.current_user.id)
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
          out_player.deck = deck;
          out_player.deck.commander = [];
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
          out_player.card_preview = { position : {x: 0, y: 0}}
          out_player.play_counters = [];
          for (let i = 0; i < 36; i++) {
            out_player.playmat.push([])
          }
          out_player.hand = [];
          out_player.grave = [];
          out_player.exile = [];
          out_player.temp_zone = [];
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
              out_player.deck.commander.push(card);
            }
          })
          out_player.deck.commander_saved = [];
          out_player.deck.commander.forEach((card: any) => {
            out_player.deck.commander_saved.push(card);
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

  createSpectator(name: string, id: number) {
    console.log(this.current_user.id)
    let out_player: any = {};
    out_player.scooped = true;
    out_player.deck = null;
    out_player.name = name;
    out_player.id = id;
    out_player.playmat = []
    out_player.turn = -1;
    out_player.card_preview = { position : {x: 0, y: 0}}
    out_player.play_counters = [];
    for (let i = 0; i < 36; i++) {
      out_player.playmat.push([])
    }
    out_player.hand = [];
    out_player.grave = [];
    out_player.exile = [];
    out_player.temp_zone = [];
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
  }

  setPreviewPosition(event: any) {
    if (this.user != null) {
      this.user.card_preview.position = { ...(<any>event.source._dragRef)._passiveTransform };
      this.sendPlayerUpdate();
    }
  }

  setCounterPosition(event: any, counter: any) {
    if (this.user != null) {
      counter.position = { ...(<any>event.source._dragRef)._passiveTransform };
      console.log(counter);
      this.sendPlayerUpdate();
    }
  }

  startGame() {
    this.sendMsg({start: true, game_id: this.game_id});
  }

  endTurn() {
    if (this.game_data.current_turn == this.user.turn) {
      this.sendMsg({
        request: 'end_turn',
        game_id: this.game_id,
      });
    }
  }

  sendScoopUpdate() {
    if (this.user.scooped) {
      this.sendMsg({
        request: 'player_change',
        game_id: this.game_id,
        player_data:
          {
            id: this.current_user.id,
            player: this.user
          }
      });
    }
  }

  sendPlayerUpdate() {
    if (!this.user.scooped) {
      this.sendMsg({
        request: 'player_change',
        game_id: this.game_id,
        player_data:
          {
            id: this.current_user.id,
            player: this.user
          }
      });
    }
  }

  sendPlayerAndZoneUpdate(zone: string, new_zone: any, to_id: number) {
    if (!this.user.scooped) {
      this.sendMsg({
        request: 'player_and_temp_change',
        game_id: this.game_id,
        player_data:
          {
            id: this.current_user.id,
            player: this.user
          },
        temp_id: to_id,
        temp_zone_name: zone,
        temp_zone: new_zone
      });
    }
  }

  sendPlayerAndZoneUpdateBulk() {
    if (!this.user.scooped) {
      for (let zone of this.zone_transfers) {
        this.sendPlayerAndZoneUpdate(zone.zone, zone.new_zone, zone.to_id);
      }

    }
    this.zone_transfers = [];
  }

  fixVisibility(p_id: number) {
    if (this.user && !this.user.scooped) {
      for (let spot of this.user.playmat) {
        for (let card of spot) {
          if (!card.facedown) {
            card.visible.push(p_id);
          }
        }
      }
      for (let card of this.user.grave) {
        card.visible.push(p_id);
      }
      for (let card of this.user.exile) {
        if (!card.facedown) {
          card.visible.push(p_id);
        }
      }
      for (let card of this.user.temp_zone) {
        if (!card.facedown) {
          card.visible.push(p_id);
        }
      }
      this.sendPlayerUpdate();
    }
  }

  /**------------------------------------------------
   *      Player-Interaction Helper Functions        *
   ------------------------------------------------**/

  reversePlaymat(array: any[]){
    return array.map((item,idx) => array[array.length-1-idx])
  }

  selectPlayer(selector: any) {
    if (this.isOpponent(selector)) {
      this.selected_player = selector;
    }
    else {
      this.selected_player = null;
    }
  }

  getPlayer(player: number) {
    for(let cur_player of this.game_data.players) {
      if (cur_player.id === player) {
        return cur_player;
      }
    }
    return null;
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
      }
    });
  }

  cardShake(cardid: number, userid: number, location: string) {
    let shake_player = this.getPlayer(userid);
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

  // @ts-ignore
  activePlayers(ignore_scoop?: boolean) {
    if (!this.user.scooped || ignore_scoop) {
      let count = 0;
      for (let player of this.game_data.players) {
        if (!player.scooped) {
          count++;
        }
      }
      return count;
    }
    else if (this.user.scooped) {
      let count = 0;
      for (let player of this.game_data.players) {
        if (!player.scooped) {
          if(this.selected_player != null && player.id == this.selected_player.id) {

          }
          else {
            count++;
          }
        }
      }
      return count;
    }
    else {
      return 0;
    }
  }

  printData(obj: any) {
    console.log(obj);
  }

  /**------------------------------------------------
   *      Keybind Functions        *
   ------------------------------------------------**/

  @HostListener('document:keydown.shift', ['$event']) onShiftDown(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.card_preview_data.shift_pressed = !this.card_preview_data.shift_pressed;
    }
  }

  @HostListener('document:keydown.control', ['$event']) onCtrlDown(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.card_preview_data.control_pressed = true;
    }
  }

  @HostListener('document:keyup.control', ['$event']) onCtrlUp(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.card_preview_data.control_pressed = false;
    }
  }

  @HostListener('document:keydown.escape', ['$event']) onEscape(event: any) {
    if (event.target.nodeName !== "INPUT") {
      this.clearSelection();
    }
  }

  @HostListener('document:keydown.d', ['$event']) ondDown(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.drawX(1);
    }
  }

  @HostListener('document:keydown.p', ['$event']) onpDown(event: any) {
    console.log(event);
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.togglePreview()
    }
  }

  @HostListener('document:keydown.o', ['$event']) onODown(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      if(this.user != null) {
        this.user.card_preview.position = {x: 0, y: 0};
      }
    }
  }

  @HostListener('document:keydown.m', ['$event']) onmDown(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.mulliganHand(7);
    }
  }

  @HostListener('document:keydown.e', ['$event']) oneDown(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.endTurn();
    }
  }

  @HostListener('document:keydown.s', ['$event']) onsDown(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.shuffleDeck(this.user.deck.cards, true);
    }
  }

  @HostListener('document:keydown.x', ['$event']) onxDown(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.untapAll();
    }
  }

  @HostListener('document:keydown.f', ['$event']) onfDown(event: any) {
    if (event.target.nodeName !== "INPUT" && event.target.nodeName !== 'TEXTAREA') {
      this.openSideNav('deck');
    }
  }

  @HostListener('document:keydown.enter', ['$event']) onEnterDown(event: any) {
    if (this.matMenuTrigger.menuOpen) {
      this.matMenuTrigger.closeMenu();
    }
  }

  togglePreview() {
    this.preview = !this.preview;
  }

  /**------------------------------------------------
   *      Board-Interaction Helper Functions        *
   ------------------------------------------------**/

  isSelected(card: any) {
    if (card.selected) {
      return true;
    }
    for (let cur_card of this.selected_cards) {
      if (cur_card.card == card) {
        return true;
      }
    }
    return false;
  }

  isOpponent(player: any) {
    return player.id !== this.current_user.id
  }

  tapSpot(spot: any) {
    for (let card of spot) {
      card.tapped = card.tapped === 'tapped'? 'untapped': 'tapped';
    }
    this.sendPlayerUpdate();
  }

  tapCard(card: any) {
    card.tapped = card.tapped === 'tapped'? 'untapped': 'tapped';
    this.sendPlayerUpdate();
  }

  invertCard(card:any) {
    card.inverted = !card.inverted;
    this.sendPlayerUpdate();
  }

  flipCard(card:any) {
    card.facedown = !card.facedown;
    card.visible = [];
    this.sendPlayerUpdate();
  }

  flipTop() {
    this.user.top_flipped = !this.user.top_flipped;
    this.sendPlayerUpdate();
  }

  tapSelected() {
    for (let card_select of this.selected_cards) {
      this.tapCard(card_select.card);
    }
    this.clearSelection();
    this.sendPlayerUpdate();
  }

  untapAll() {
    for (let spot of this.user.playmat) {
      for (let card of spot) {
        if (!card.locked) {
          card.tapped = 'untapped';
        }
      }
    }
    this.sendPlayerUpdate();
  }

  /**
   * Add or remove the card from the selected list for group actions.
   * @param card Card to add to the list
   * @param from Current location of the card
   * @param enable whether or not to allow the card to be selected (in the case of non-visible cards in the sidenav)
   */
  toggleCardSelect(card: any, from: any, enable?: boolean) {
    if (typeof enable === 'undefined' || enable) {
      for (let selected of this.selected_cards) {
        if (selected.card == card && selected.from == from) {
          this.selected_cards.splice(this.selected_cards.indexOf(selected), 1);
          card.selected = false;
          return;
        }
      }
      this.selected_cards.push({
        card: card,
        from: from
      });
      card.selected = true;
    }
  }

  selectCard(card: any, from: any, commander?: boolean) {
    if (commander) { //if it is the commander being cast
      if (from.indexOf(card) != -1) {
        if (!card.selected) {
          card.selected = true;
          this.selected_cards.push({
            card: card,
            from: from
          });
          card.selected = true;
        }
      }
    }
    else {
      if (!card.selected) {
        card.selected = true;
        this.selected_cards.push({
          card: card,
          from: from
        });
        card.selected = true;
      }
    }
  }

  clearSelection(besides?: any) {
    let saving:any = null;
    for (let card of this.selected_cards) {
      if (besides) {
        if (card.card == besides) {
          saving = card;
        }
        else {
          card.card.selected = false;
        }
      }
      else {
        card.card.selected = false;
      }
    }
    this.selected_cards = saving? [saving]: [];
  }

  selectRandom(zone: any[]) {
    if (zone.length == 1) {
      this.snackbar.open('Selected ' + zone[0].name + ' at random.',
        'dismiss', {duration: 3000});
    }
    else if (zone.length > 1) {
      this.snackbar.open('Selected ' + '"' + zone[Math.floor(Math.random() * zone.length)].name + '"' + ' at random.',
        'dismiss', {duration: 3000});
    }
  }

  getZone(zone: string) {
    switch(zone) {
      case 'grave':
        return this.user.grave;
      case 'exile':
        return this.user.exile;
      case 'temp_zone':
        return this.user.temp_zone;
      case 'hand':
        return this.user.hand;
      case 'deck':
        return this.user.deck.cards;
    }
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
    this.sendPlayerUpdate();
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

  shuffleDeck(cards: any[], update?: boolean) {
    for (let i = 0; i < cards.length; i++) {
      let r = i + Math.floor(Math.random() * (cards.length - i));
      let temp = cards[r];
      cards[r] = cards[i];
      cards[i] = temp;
    }
    if (update) {
      this.sendPlayerUpdate();
    }
  }

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

  devotionCount(player: any, color: string) {
    let count = 0;
    if (player) {
      for (let spot of player.playmat) {
        for (let card of spot) {
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
        players = [player];
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
    this.sendPlayerUpdate();
  }

  deleteCounter(counter: any) {
    this.user.play_counters.splice(this.user.play_counters.indexOf(counter), 1);
    this.sendPlayerUpdate();
  }

  deleteAllCounters() {
    this.user.play_counters = [];
    this.sendPlayerUpdate();
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
    this.sendPlayerUpdate();
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
      this.sendPlayerUpdate();
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
          this.sendPlayerUpdate();
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
      this.sendPlayerUpdate();
      return;
    });

  }

  getCardImages(name: string): Promise<any> {
    return new Promise<any>((resolve) => {
      this.fddp_data.getImagesForCard(name).then((image_data: any) => {
        resolve(image_data.images);
      });
    })
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

  editNotes(card: any) {
    const noteDialogRef = this.dialog.open(NoteDialog, {
      width: '500px',
      data: {card: card}
    });
    noteDialogRef.afterClosed().subscribe(result => {
      if (result) {
        card.notes = result;
        this.sendPlayerUpdate();
      }
    })

  }

  selectDeck(deck: any) {
    this.clearSelection();
    this.setPlayerDeck(this.current_user.name, this.current_user.id, deck.id);
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

  scoopDeck(): void {
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
    this.sendAllTo(this.user.hand, 'deck');
    this.sendAllTo(this.user.grave, 'deck');
    this.sendAllTo(this.user.exile, 'deck');
    this.sendAllTo(this.user.temp_zone, 'deck');
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
    this.sendScoopUpdate();
  }

  updateCounter() {
    if (!this.counter_buffer) {
      this.counter_buffer = true;
      setTimeout(() => {this.counter_buffer = false; this.sendPlayerUpdate()}, 3000);
    }
  }


  /**------------------------------------------------
   *          Card Transfer Helper Functions        *
   ------------------------------------------------**/

  selectAllBlank(type: string) {
    this.clearSelection();
    for (let spot of this.user.playmat) {
      for (let card of spot) {
        if (type !== '') {
          if (card.types) {
            for (let card_type of card.types) {
              if (type.toLowerCase() === card_type.toLowerCase()) {
                this.selectCard(card, spot);
                break;
              }
            }
          }
        }
        else {

        }
      }
    }
  }

  /**
   * Drag event handler for moving a card
   * @param event
   * @param location string value of where to move the card.
   * Accepts: 'hand', 'deck', 'grave', 'exile', 'temp_zone', 'command_zone' or 'play'
   */
  moveCardToZone(event: any, location: string, sidebar?: boolean, facedown?: boolean, noupdate?: boolean, index?: number) {
    //Hand, Command Zone, Deck, Grave, Exile, Temp Zone, Play
    if (location !== 'play') {
      for (let card_select of this.selected_cards) {
        switch(location) {
          case 'hand':
            if (card_select.card.is_token) {
              card_select.from.splice(card_select.from.indexOf(card_select.card), 1);
              break;
            }
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).hand) { //If it is already in hand
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex);
            }
            else {
              card_select.card.visible = [card_select.card.owner];
              card_select.facedown = false;
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).hand, card_select.from.indexOf(card_select.card), event.currentIndex);
              if (card_select.card.owner != this.user.id) { //it went to someone else's
                let found = false;
                for (let i = 0; i < this.zone_transfers.length; i++) {
                  if (this.zone_transfers[i].zone === 'hand' && this.zone_transfers[i].to_id == card_select.card.owner) { //zone already has an update queued
                    this.zone_transfers[i] = { zone: 'hand', new_zone: this.getPlayer(card_select.card.owner).hand, to_id: card_select.card.owner}
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  this.zone_transfers.push({ zone: 'hand', new_zone: this.getPlayer(card_select.card.owner).hand, to_id: card_select.card.owner});
                }
              }
            }
            break;
          case 'deck':
            console.log('deck');
            if (card_select.card.is_token) {
              card_select.from.splice(card_select.from.indexOf(card_select.card), 1);
              break;
            }
            card_select.card.visible = [];
            card_select.card.facedown = false;
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).deck.cards) { //If it is already in the deck
              if (!(sidebar && this.sidenav_sort !== '')) { //if it is trying to move in a sorted sidebar, prevent
                if (index) {
                  if (index < 0) {
                    index ++;
                    index = card_select.from.length - index;
                  }
                  if (index > 0) {
                    index --;
                  }
                  moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), index);
                }
                else {
                  moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex);
                }
              }
            }
            else {
              if (sidebar) {
                if (!(sidebar && this.sidenav_sort !== '')) {
                  if (index) {
                    if (index < 0) {
                      index ++;
                      index = this.getPlayer(card_select.card.owner).deck.cards.length - index;
                    }
                    if (index > 0) {
                      index --;
                    }
                    transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), index);
                  }
                  else {
                    transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), event.currentIndex);
                  }
                  if (card_select.card.owner != this.user.id) { //it went to someone else's
                    let found = false;
                    for (let i = 0; i < this.zone_transfers.length; i++) {
                      if (this.zone_transfers[i].zone === 'deck' && this.zone_transfers[i].to_id == card_select.card.owner) { //zone already has an update queued
                        this.zone_transfers[i] = { zone: 'deck', new_zone: this.getPlayer(card_select.card.owner).deck.cards, to_id: card_select.card.owner}
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      this.zone_transfers.push({ zone: 'deck', new_zone: this.getPlayer(card_select.card.owner).deck.cards, to_id: card_select.card.owner});
                    }
                  }
                }
              }
              else {
                if (index) {
                  if (index < 0) {
                    index ++;
                    index = this.getPlayer(card_select.card.owner).deck.cards.length + index;
                  }
                  else if (index > 0) {
                    index --;
                  }
                  // @ts-ignore
                  transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), index);
                }
                else {
                  transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), 0);
                }
                if (card_select.card.owner != this.user.id) { //it went to someone else's
                  let found = false;
                  for (let i = 0; i < this.zone_transfers.length; i++) {
                    if (this.zone_transfers[i].zone === 'deck' && this.zone_transfers[i].to_id == card_select.card.owner) { //zone already has an update queued
                      this.zone_transfers[i] = { zone: 'deck', new_zone: this.getPlayer(card_select.card.owner).deck.cards, to_id: card_select.card.owner}
                      found = true;
                      break;
                    }
                  }
                  if (!found) {
                    this.zone_transfers.push({ zone: 'deck', new_zone: this.getPlayer(card_select.card.owner).deck.cards, to_id: card_select.card.owner});
                  }
                }
              }
            }
            break;
          case 'deck_bottom': //this should never happen from a drag event, only from a 'send'
            if (card_select.card.is_token) {
              card_select.from.splice(card_select.from.indexOf(card_select.card), 1);
              break;
            }
            card_select.card.visible = [];
            card_select.card.facedown = false;
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).deck.cards) { //If it is already in the deck
              card_select.card.sidenav_visible = false;
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), this.getPlayer(card_select.card.owner).deck.cards.length)
            }
            else {
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), this.getPlayer(card_select.card.owner).deck.cards.length);
              if (card_select.card.owner != this.user.id) { //it went to someone else's
                let found = false;
                for (let i = 0; i < this.zone_transfers.length; i++) {
                  if (this.zone_transfers[i].zone === 'deck' && this.zone_transfers[i].to_id == card_select.card.owner) { //zone already has an update queued
                    this.zone_transfers[i] = { zone: 'deck', new_zone: this.getPlayer(card_select.card.owner).deck.cards, to_id: card_select.card.owner}
                    found = true;
                    break;
                  }

                }
                if (!found) {
                  this.zone_transfers.push({ zone: 'deck', new_zone: this.getPlayer(card_select.card.owner).deck.cards, to_id: card_select.card.owner});
                }
              }
            }
            break;
          case 'grave':
            if (card_select.card.is_token) {
              card_select.from.splice(card_select.from.indexOf(card_select.card), 1);
              break;
            }
            card_select.card.visible = [];
            for (let player of this.game_data.players) {
              card_select.card.visible.push(player.id);
            }
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).grave) { //If it is already in grave
              if (!(sidebar && this.sidenav_sort !== '')) {
                moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
              }
            }
            else {
              if (sidebar) {
                if(this.sidenav_sort === '' && this.sidenav_sort_type === '') {
                  transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).grave, card_select.from.indexOf(card_select.card), event.currentIndex);
                  if (card_select.card.owner != this.user.id) { //it went to someone else's
                    let found = false;
                    for (let i = 0; i < this.zone_transfers.length; i++) {
                      if (this.zone_transfers[i].zone === 'grave' && this.zone_transfers[i].to_id == card_select.card.owner) { //zone already has an update queued
                        this.zone_transfers[i] = { zone: 'grave', new_zone: this.getPlayer(card_select.card.owner).grave, to_id: card_select.card.owner}
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      this.zone_transfers.push({ zone: 'grave', new_zone: this.getPlayer(card_select.card.owner).grave, to_id: card_select.card.owner});
                    }
                  }
                }
              }
              else {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).grave, card_select.from.indexOf(card_select.card), 0);
                if (card_select.card.owner != this.user.id) { //it went to someone else's
                  let found = false;
                  for (let i = 0; i < this.zone_transfers.length; i++) {
                    if (this.zone_transfers[i].zone === 'grave' && this.zone_transfers[i].to_id == card_select.card.owner) { //zone already has an update queued
                      this.zone_transfers[i] = { zone: 'grave', new_zone: this.getPlayer(card_select.card.owner).grave, to_id: card_select.card.owner}
                      found = true;
                      break;
                    }
                  }
                  if (!found) {
                    this.zone_transfers.push({ zone: 'grave', new_zone: this.getPlayer(card_select.card.owner).grave, to_id: card_select.card.owner});
                  }
                }
              }
            }
            break;
          case 'exile':
            if (card_select.card.is_token) {
              card_select.from.splice(card_select.from.indexOf(card_select.card), 1);
              break;
            }
            card_select.card.visible = [];
            if (facedown) {
              card_select.facedown = true;
            }
            else {
              card_select.facedown = false;
              for (let player of this.game_data.players) {
                card_select.card.visible.push(player.id);
              }
            }
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).exile) { //If it is already in exile
              if (!(sidebar && this.sidenav_sort !== '')) {
                moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
              }
            }
            else {
              if (sidebar) {
                if (!(sidebar && this.sidenav_sort !== '')) {
                  transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).exile, card_select.from.indexOf(card_select.card), event.currentIndex);
                  if (card_select.card.owner != this.user.id) { //it went to someone else's
                    let found = false;
                    for (let i = 0; i < this.zone_transfers.length; i++) {
                      if (this.zone_transfers[i].zone === 'exile' && this.zone_transfers[i].to_id == card_select.card.owner) { //zone already has an update queued
                        this.zone_transfers[i] = { zone: 'exile', new_zone: this.getPlayer(card_select.card.owner).exile, to_id: card_select.card.owner}
                        found = true;
                        break;
                      }
                    }
                    if (!found) {
                      this.zone_transfers.push({ zone: 'exile', new_zone: this.getPlayer(card_select.card.owner).exile, to_id: card_select.card.owner});
                    }
                  }
                }
              }
              else {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).exile, card_select.from.indexOf(card_select.card), 0);
                if (card_select.card.owner != this.user.id) { //it went to someone else's
                  let found = false;
                  for (let i = 0; i < this.zone_transfers.length; i++) {
                    if (this.zone_transfers[i].zone === 'exile' && this.zone_transfers[i].to_id == card_select.card.owner) { //zone already has an update queued
                      this.zone_transfers[i] = { zone: 'exile', new_zone: this.getPlayer(card_select.card.owner).exile, to_id: card_select.card.owner}
                      found = true;
                      break;
                    }
                  }
                  if (!found) {
                    this.zone_transfers.push({ zone: 'exile', new_zone: this.getPlayer(card_select.card.owner).exile, to_id: card_select.card.owner});
                  }
                }
              }
            }
            break;
          case 'temp_zone':
            if (card_select.from === event.container.data) { //If it is already in temp zone
              if (!(sidebar && this.sidenav_sort !== '')) {
                moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
              }
            }
            else {
              if (facedown) {
                card_select.visible = [];
                card_select.card.facedown = true;
              }
              else if (card_select.card.facedown) {

              }
              else {
                card_select.visible = [];
                for (let player of this.game_data.players) {
                  card_select.card.visible.push(player.id);
                }
              }
              if (sidebar) {
                if (!(sidebar && this.sidenav_sort !== '')) {
                  transferArrayItem(card_select.from, event.container.data, card_select.from.indexOf(card_select.card), event.currentIndex);
                }
              }
              else {
                transferArrayItem(card_select.from, event.container.data, card_select.from.indexOf(card_select.card), 0);
              }
            }
            break;
          case 'command_zone':
            if (card_select.card.iscommander) {
              card_select.card.visible = [];
              card_select.card.facedown = false;
              for (let player of this.game_data.players) {
                card_select.card.visible.push(player.id);
              }
              if (card_select.from !== this.getPlayer(card_select.card.owner).deck.commander) { //Do not allow moving commanders via drag
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.commander, card_select.from.indexOf(card_select.card), 0);
              }
              break;
            }
            break;
          case 'selected':
            if (this.selected_player != null) {
              card_select.card.visible = [];
              if (facedown) {
                card_select.facedown = true;
              }
              else {
                card_select.facedown = false;
                for (let player of this.game_data.players) {
                  card_select.card.visible.push(player.id);
                }
              }
              if (card_select.from !== this.selected_player.temp_zone) { //If it is already in their zone
                transferArrayItem(card_select.from, this.selected_player.temp_zone, card_select.from.indexOf(card_select.card), 0);
                card_select.card.selected = false;
                this.sendPlayerAndZoneUpdate('temp_zone', this.selected_player.temp_zone, this.selected_player.id);
                let found = false;
                for (let i = 0; i < this.zone_transfers.length; i++) {
                  if (this.zone_transfers[i].zone === 'temp_zone' && this.zone_transfers[i].to_id == card_select.card.owner) { //zone already has an update queued
                    this.zone_transfers[i] = { zone: 'temp_zone', new_zone: this.selected_player.temp_zone, to_id: this.selected_player.id}
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  this.zone_transfers.push({ zone: 'temp_zone', new_zone: this.selected_player.temp_zone, to_id: this.selected_player.id});
                }
              }
            }
            break;
          case 'scry':
            if (card_select.from === this.getPlayer(card_select.card.owner).deck.cards) { //If it is already in the deck
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex);
            }
            break;
        }
        card_select.card.selected = false;
      }
    }
    else { //card is being moved to play
      //Get the index on the playmat of the spot you are moving to
      let spot_index = this.user.playmat.indexOf(event.container.data);
      for (let card_select of this.selected_cards) {
        card_select.card.selected = false;
        if (card_select.from != event.container.data) { //if the card is already there, skip it
          for (let spot_offset = 0; spot_offset < this.user.playmat.length; spot_offset++) {
            //start at the spot you are trying to insert on and loop around
            let current_index = spot_index + spot_offset;
            if (current_index >= this.user.playmat.length) { current_index -= this.user.playmat.length }
            if (this.user.playmat[current_index].length < 3) {
              if (facedown) { //card is being sent to play face down
                card_select.card.visible = [];
                card_select.card.facedown = true;
              }
              else if (card_select.card.facedown) { //card is already in play, but face down
                //don't change the visibility
              }
              else { //card is entering play not facedown
                card_select.card.visible = [];
                for (let player of this.game_data.players) {
                  card_select.card.visible.push(player.id);
                }
              }
              this.user.playmat[current_index].push(card_select.card);
              card_select.from.splice(card_select.from.indexOf(card_select.card), 1);
              break;
            }
          }
        }
        else { //visibility won't change
          moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        }
      }
    }
    this.selected_cards = [];
    if (noupdate) {

    }
    else {
      if (this.zone_transfers.length > 0) {
        this.sendPlayerAndZoneUpdateBulk();
      }
      else {
        this.sendPlayerUpdate();
      }
    }
  }

  /**
   * Manual handler for moving a card. Constructs a drag event and passes into the drag handler.
   * @param card card to move
   * @param from location of card to move
   * @param location string value of where to move the card.
   * Accepts: 'hand', 'deck_top', 'deck_bottom', 'grave', 'exile', 'temp_zone', 'selected', 'command_zone' or 'play'
   */
  sendCardToZone(card: any, from: any[], location: string, noupdate?: boolean, index?: any) {
    let event:any = {}
    event.previousContainer = {}
    event.container = {}
    event.previousContainer.data = from;
    event.previousIndex = from.indexOf(card);
    switch (location) {
      case 'hand':
        event.container.data = this.user.hand;
        event.currentIndex = 0;
        break;
      case 'deck_top':
        location = 'deck'
        event.container.data = this.user.deck.cards;
        event.currentIndex = 0;
        break;
      case 'deck':
        event.container.data = this.user.deck.cards;
        event.currentIndex = 0;
        break;
      case 'deck_bottom':
        event.container.data = this.user.deck.cards;
        event.currentIndex = 0;
        break;
      case 'grave':
        event.container.data = this.user.grave;
        event.currentIndex = 0;
        break;
      case 'exile':
        event.container.data = this.user.exile;
        event.currentIndex = 0;
        break;
      case 'temp_zone':
        event.container.data = this.user.temp_zone;
        event.currentIndex = 0;
        break;
      case 'selected':
        if (this.selected_player) {
          location = 'selected';
          event.container.data = this.selected_player.temp_zone;
          event.currentIndex = 0;
        }
        break;
      case 'command_zone':
        event.container.data = this.user.deck.commander;
        event.currentIndex = 0;
        break;
      case 'play':
        event.container.data = this.user.playmat[0];
        event.currentIndex = 0;
        break;
    }
    if (noupdate) {
      this.moveCardToZone(event, location, undefined, undefined, noupdate);
    }
    if (index && Number(index)) {
      console.log(index);
      this.moveCardToZone(event, location, undefined, undefined, undefined, Number(index));
    }
    else {
      this.moveCardToZone(event, location);
    }
  }

  sendAllTo(from: any[], dest: string) {
    if (from.length > 0) {
      this.clearSelection();
      for (let card of from) {
        this.selectCard(card, from);
      }
      this.sendCardToZone(from[0], from, dest, true);
    }
    if (this.zone_transfers.length > 0) {
      this.sendPlayerAndZoneUpdateBulk();
    }
    else {
      this.sendPlayerUpdate();
    }
  }

  revealCard(card: any, whomst: any, besides?: any, noupdate?: boolean) {
    if (whomst === 'All') {
      card.visible = [];
      for (let player of this.game_data.players) {
        card.visible.push(player.id)
      }
    }
    else if (whomst === 'None') {
      card.visible = [];
      if (besides) {
        card.visible.push(besides);
      }
    }
    else {
      if (card.visible.includes(whomst)) {
        card.visible.splice(card.visible.indexOf(whomst), 1);
      }
      else {
        card.visible.push(whomst);
      }
    }
    if (noupdate) {

    }
    else {
      this.sendPlayerUpdate();
    }
  }

  revealAllTo(from: any[], whomst: any) {
    if (from.length > 0) {
      this.clearSelection();
      for (let card of from) {
        this.revealCard(card, whomst);
      }
    }
    this.sendPlayerUpdate();
  }

  sendSelectedToSpot(destination: any, location: string) {
    let event:any = {}
    event.container = {}
    event.container.data = destination;
    this.moveCardToZone(event, location);
  }

  castCommander(commander: any) {
    if(this.user.deck.commander.includes(commander)) { //If commander is in the command zone

      this.clearSelection(commander);
      this.sendCardToZone(commander, this.user.deck.commander, 'play');
    }
    else {
      this.snackbar.open('Commander is not in the command zone!', 'Dismiss', { duration: 3000});
    }
  }

  swapCommanders() {
    if (this.user.deck.commander_saved.length == 2) {
      let temp: any = this.user.deck.commander_saved[0];
      this.user.deck.commander_saved[0] = this.user.deck.commander_saved[1];
      this.user.deck.commander_saved[1] = temp;
    }
    this.sendPlayerUpdate();
  }

  drawX(count: any) {
    this.clearSelection();
    let num_count = Number(count);
    for (let i = 0; i < num_count; i++) {
      if (this.user.deck.cards.length == 0) {
        break;
      }
      if (!this.user.deck.cards[0].visible.includes(this.user.id)) {
        this.user.deck.cards[0].visible.push(this.user.id);
      }
      this.user.hand.push(this.user.deck.cards[0]);
      this.user.deck.cards.splice(0, 1);
    }
    this.sendPlayerUpdate();
  }

  drawToX(zone: string) {
    let num_count = Number(this.draw_to_count);
    this.clearSelection();
    for (let i = 0; i < num_count; i++) {
      if (this.user.deck.cards.length == 0) {
        break;
      }
      this.selectCard(this.user.deck.cards[0], this.user.deck.cards);
      this.sendCardToZone(this.user.deck.cards[0], this.user.deck.cards, zone, true);
    }
    this.sendPlayerUpdate();
  }

  mulliganHand(count: any) {
    let num_count = Number(count);
    this.sendAllTo(this.user.hand, 'deck_bottom');
    this.shuffleDeck(this.user.deck.cards);
    this.drawX(num_count);
  }

  /**
   * Draws to the temp zone until it reaches a card of the given type
   * @param type
   */
  drawUntil(type: string) {
    while(true) {
      if (this.user.deck.cards.length > 0) {
        let cur_card = this.user.deck.cards[0];
        this.selectCard(cur_card, this.user.deck.cards);
        this.sendCardToZone(cur_card, this.user.deck.cards, 'temp_zone', true);
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
        }
        else {
          break;
        }
      }
      else {
        break;
      }
    }
    this.sendPlayerUpdate();
  }

  scryX(count: any) {
    this.clearSelection(null);
    this.sidenav_scry_count = Number(count);
    this.openSideNav('scry');
  }



  scrySendTo(card: any, type: string) {
    this.selectCard(card, this.user.temp_scry_zone);
    switch(type) {
      case 'top':
        this.sendCardToZone(card, this.user.temp_scry_zone, 'deck');
        break;
      case 'bottom':
        this.sendCardToZone(card, this.user.temp_scry_zone, 'deck_bottom');
        break;
      case 'temp_zone':
        this.sendCardToZone(card, this.user.temp_scry_zone, 'temp_zone');
        break;
    }
    this.sendPlayerUpdate();
  }

  /**
   * Draws cards to the temp zone until it reaches a non-land with a cmc lower than the given.
   * @param cmc
   */
  cascade(cmc: any) {
    cmc = Number(cmc);
    while(true) {
      if (this.user.deck.cards.length > 0) {
        let cur_card = this.user.deck.cards[0];
        this.selectCard(cur_card, this.user.deck.cards);
        this.sendCardToZone(cur_card, this.user.deck.cards, 'temp_zone', true);
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
        break;
      }
    }
    this.sendPlayerUpdate();
  }

  /**------------------------------------------------
   *               Sidenav Functions                *
   ------------------------------------------------**/

  @ViewChild('fddp_sidenav') fddp_sidenav: any;
  openSideNav(type: string) {
    this.sidenav_selected_player = this.user;
    this.sidenav_type = type;
    if (type !== 'scry') {
      this.sidenav_sort = '';
      this.sidenav_sort_type = '';
      this.getSidenavSort();
    }
    else {
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
    this.fddp_sidenav.open();
  }

  closeSideNav() {
    this.sidenav_sort = '';
    this.sidenav_selected_player = null;
    this.sidenav_type = null;
    this.clearSelection();
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
        items = this.sidenav_selected_player.grave;
        break;
      case 'exile':
        items = this.sidenav_selected_player.exile;
        break;
      case 'temp_zone':
        items = this.sidenav_selected_player.temp_zone;
        break;
      case 'deck':
        items = this.sidenav_selected_player.deck.cards;
        break;
      case 'scry':
        items = this.sidenav_selected_player.deck.cards;
    }
    return items;
  }

  /**------------------------------------------------
   *      Right-Click Replacement Functions         *
   ------------------------------------------------**/
  menuTopLeftPosition =  {x: '0', y: '0'}
  @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: any;

  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    event.stopPropagation();
    if (item.type && item.type !== 'none') {
      switch (item.type) {
        case 'life':
          item.player.life --;
          this.updateCounter();
          break;
        case 'infect':
          item.player.infect --;
          this.updateCounter();
          break;
        case 'counter_1':
          item.card.counter_1_value --;
          this.updateCounter();
          break;
        case 'counter_2':
          item.card.counter_2_value --;
          this.updateCounter();
          break;
        case 'counter_3':
          item.card.counter_3_value --;
          this.updateCounter();
          break;
        case 'multiplier':
          item.card.multiplier_value --;
          this.updateCounter();
          break;
        case 'power':
          item.card.power_mod --;
          this.updateCounter();
          break;
        case 'toughness':
          item.card.toughness_mod --;
          this.updateCounter();
          break;
        case 'loyalty':
          item.card.loyalty_mod --;
          this.updateCounter();
          break;
        case 'command_tax_1':
          this.user.command_tax_1 --;
          this.updateCounter();
          break;
        case 'command_tax_2':
          this.user.command_tax_2 --;
          this.updateCounter();
          break;
        case 'custom_counter':
          item.counter.value--;
          this.updateCounter();
          break;
        default:
          this.rightclicked_item = item;
          this.menuTopLeftPosition.x = event.clientX + 'px';
          this.menuTopLeftPosition.y = event.clientY + 'px';
          this.matMenuTrigger.openMenu();
      }
    }
  }
}

@Component({
  selector: 'token-insert-dialog',
  templateUrl: 'token-insert-dialog.html',
})
export class TokenInsertDialog {
  constructor(
    public dialogRef: MatDialogRef<TokenInsertDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fddp_data: FddpApiService
  ) {}

  results: any[] = [];
  name = '';

  async searchToken(token: string) {
    this.results = [];
    //const values = await Scry.Cards.search('"' + token + '"', {include_extras: true}).waitForAll();
    this.fddp_data.getImagesForCard(token).then((values: any) => {
      for (let val of values.images) {
        this.results.push(val)
      }
      this.name = token;
    });
  }

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  createToken(res: any) {
    let out_token = {name: this.name, image: res}
    this.dialogRef.close(out_token);
  }
}

@Component({
  selector: 'token-select-dialog',
  templateUrl: 'token-select-dialog.html',
})
export class TokenSelectDialog {
  constructor(
    public dialogRef: MatDialogRef<TokenSelectDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  createToken(res: any) {
    this.dialogRef.close(res);
  }
}

@Component({
  selector: 'deck-select-dialog',
  templateUrl: 'deck-select-dialog.html',
})
export class DeckSelectDialog {

  decks: any[] = [];
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<DeckSelectDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fddp_data: FddpApiService
  )
  {
    this.loading = true;
    this.fddp_data.getDecksBasic(this.data.user).then((decks: any) => {
      let temp_decks = decks;
      let deck_promises: any[] = [];
      temp_decks.forEach((deck: any) => {
        deck_promises.push(this.getDeckData(deck.id));
      });
      Promise.all(deck_promises).then(() => {
        for (let deck of this.decks) {
          deck.hovered = false;
        }
        this.loading = false;
      });
    });
  }

  getDeckData(deckid: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.fddp_data.getDeckForPlay(deckid).then((deck) => {
        deck.commander = [];
        deck.cards.forEach((card: any) => {
          if (card.iscommander) {
            deck.commander.push(card);
          }
        });
        deck.commander.forEach((card: any) => {
          deck.cards.splice(deck.cards.indexOf(card), 1);
        });
        deck.colors = this.getDeckColors(deck);
        this.decks.push(deck);
        resolve();
      })
    })
  }

  getDeckColors(deck: any) {
    let colors: any = null;
    for (let commander of deck.commander) {
      if (commander.color_identity) {
        if (colors == null) {
          colors = [];
        }
        for (let mana of commander.color_identity) {
          if (mana === 'W' || mana === 'U' || mana === 'B' || mana === 'R' || mana === 'G'){
            colors.push(mana);
          }
        }
      }
    }
    return colors;
  }

  selectDeck(deck: any) {
    this.dialogRef.close(deck);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'note-dialog',
  templateUrl: 'notes-dialog.html',
})
export class NoteDialog {
  constructor(
    public dialogRef: MatDialogRef<NoteDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  note = this.data.card.notes;

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  saveNote() {
    this.dialogRef.close(this.note);
  }
}
