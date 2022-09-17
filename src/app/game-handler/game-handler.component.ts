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
  hoverdata: any = {shift_pressed: false, control_pressed: false, position : {x: 0, y: 0}}
  preview = false;

  scrying = false;

  draw_to_count = '1'

  rightclicked_item: any = null;
  sidenav_type: any = null;
  sidenav_sort_type: string = '';
  selected_cards: any[] = [];
  sidenav_sort = '';

  hidden = false;
  loading = false;

  counts: any[] = [];

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
      console.log(json_data);
      if (json_data.game_data) { //is the entire board request
        if (!json_data.game_data.id) {
          this.router.navigate(['/']);
        }
        this.game_data = json_data.game_data;
        console.log(this.game_data);
        if (this.game_data.players){
          for (let player of this.game_data.players) {
            if (player.id == this.current_user.id) {
              this.user = player;
              console.log('user registered');
              console.log(this.user);
            }
          }
        }
        if (this.user == null) { //user is not in the game
          console.log('no user')
          if(this.game_data.turn_count == 0) { //it is the start of the game
            console.log('game start')
            this.openDeckSelectDialog();
          }
        }
      }
      else if (json_data.player_data) { //is it a player data request (deck change, etc)
        if (json_data.player_data != {}) {
          let found = false;
          for (let i = 0; i < this.game_data.players.length; i++) {
            if (this.game_data.players[i].id == json_data.player_data.id) {
              found = true;
              this.game_data.players[i] = json_data.player_data;
              if (this.game_data.players[i].id == this.current_user.id) {
                this.user = this.game_data.players[i];
              }
              break;
            }
          }
          if (!found) {
            this.game_data.players.push(json_data.player_data);
            if (json_data.player_data.id == this.current_user.id) {
              for (let player of this.game_data.players) {
                if (player.id == this.current_user.id) {
                  this.user = player;
                  break;
                }
              }
            }
          }
        }
        console.log('user: ');
        console.log(this.user);
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

  sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
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
          out_player.command_tax_1 = 0;
          out_player.command_tax_2 = 0;
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
            if (card.iscommander) {
              out_player.deck.commander.push(card);
            }
          })
          out_player.deck.commander_saved = [];
          out_player.deck.commander.forEach((card: any) => {
            out_player.deck.commander_saved.push(card);
            out_player.deck.cards.splice(deck.cards.indexOf(card), 1);
          })

          out_player.selected = false;
          this.shuffleDeck(out_player.deck.cards);

          this.sendMsg({
            request: 'player_change',
            game_id: this.game_id,
            player_data:
              {
                id: id,
                player: out_player
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

  endTurn() {
    this.sendMsg({
      request: 'end_turn',
    });
  }

  sendPlayerUpdate() {
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

  /**------------------------------------------------
   *      Player-Interaction Helper Functions        *
   ------------------------------------------------**/

  reversePlaymat(array: any[]){
    return array.map((item,idx) => array[array.length-1-idx])
  }

  selectPlayer(selector: any) {
    for (let player of this.game_data.players) {
      player.selected = false;
    }
    selector.selected = true;
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

  shakeCard(card: any) {
    card.shaken = true;
    setTimeout(() => {
      card.shaken = false;
    }, 3000);
  }

  nextTurn() {
    this.game_data.current_turn ++;
    let max_turn = 0;
    let max_player = null;
    for (let player of this.game_data.players) {
      if (player.turn > max_turn) {
        max_turn = player.turn;
        max_player = player;
      }
    }
    if (this.game_data.current_turn > max_turn) {
      this.game_data.current_turn = 0;
      for (let player of this.game_data.players) {
        if (player.turn == 0) {
          max_player = player;
          break;
        }
      }
    }

    //DEBUG
    for (let player of this.game_data.players) {
      if (player.turn == this.game_data.current_turn) {
        this.user = player;
      }
    }

  }

  /**------------------------------------------------
   *      Keybind Functions        *
   ------------------------------------------------**/

  @HostListener('document:keydown.shift', ['$event']) onShiftDown(event: KeyboardEvent) {
    this.hoverdata.shift_pressed = !this.hoverdata.shift_pressed;
  }

  @HostListener('document:keyup.shift', ['$event']) onShiftUp(event: KeyboardEvent) {
  }

  @HostListener('document:keydown.control', ['$event']) onCtrlDown(event: KeyboardEvent) {
    this.hoverdata.control_pressed = true;
  }

  @HostListener('document:keyup.control', ['$event']) onCtrlUp(event: KeyboardEvent) {
    this.hoverdata.control_pressed = false;
  }

  @HostListener('document:keydown.escape', ['$event']) onEscape(event: KeyboardEvent) {
    this.clearSelection();
  }

  @HostListener('document:keydown.d', ['$event']) ondDown(event: KeyboardEvent) {
    this.drawX(1);
  }

  @HostListener('document:keydown.p', ['$event']) onpDown(event: KeyboardEvent) {
    this.togglePreview()
  }

  @HostListener('document:keydown.m', ['$event']) onmDown(event: KeyboardEvent) {
    this.mulliganHand(7);
  }

  togglePreview() {
    this.preview = !this.preview;
  }

  /**------------------------------------------------
   *      Board-Interaction Helper Functions        *
   ------------------------------------------------**/

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
    this.counts.push({
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      value: 0,
      search_type: '',
      type: type
    })
  }

  deleteCounter(counter: any) {
    this.counts.splice(this.counts.indexOf(counter), 1);
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
    let out_token: any = null;
    for (let tok of this.user.deck.tokens) {
      if (tok.name === token.name) {
        out_token = JSON.parse(JSON.stringify(tok));
        out_token.is_token = true;
        out_token.selected = false;
        out_token.owner = -1;
        this.clearCard(out_token);
        out_token.visible = [];
        for(let player of this.game_data.players) {
          out_token.visible.push(player.id);
        }
        this.user.temp_zone.push(out_token);
        this.clearSelection();
        this.sendPlayerUpdate();
        return;
      }
    }
    this.fddp_data.getCardInfo(token.name).then((token_data: any) => {
      this.getCardImages(token.name).then((image_data: any) => {
        let images = image_data;
        out_token = token_data;
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

    tokDialogRef.beforeClosed().subscribe(() => {
    })

    tokDialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createTokenFromImage(result);
      }
    });
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
            this.sendCardToZone(card, spot, 'deck');
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
          this.sendCardToZone(card, spot, 'temp_zone');
        }
        else {
          this.sendCardToZone(card, spot, 'deck');
        }
      }
    }
    this.sendPlayerUpdate();
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
  moveCardToZone(event: any, location: string, sidebar?: boolean, facedown?: boolean, noupdate?: boolean) {
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
            }
            break;
          case 'deck':
            if (card_select.card.is_token) {
              card_select.from.splice(card_select.from.indexOf(card_select.card), 1);
              break;
            }
            card_select.card.visible = [];
            card_select.card.facedown = false;
            this.clearCard(card_select.card); //wipe all counters
            if (card_select.from === this.getPlayer(card_select.card.owner).deck.cards) { //If it is already in the deck
              if (!(sidebar && this.sidenav_sort !== '')) { //if it is trying to move in a sorted sidebar, prevent
                moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
              }
            }
            else {
              if (sidebar) {
                if (!(sidebar && this.sidenav_sort !== '')) {
                  transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), event.currentIndex);
                }
              }
              else {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), 0);
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
              moveItemInArray(card_select.from, card_select.from.indexOf(card_select.card), event.currentIndex)
            }
            else {
              transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).deck.cards, card_select.from.indexOf(card_select.card), this.getPlayer(card_select.card.owner).deck.cards.length);
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
                }
              }
              else {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).grave, card_select.from.indexOf(card_select.card), 0);
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
                }
              }
              else {
                transferArrayItem(card_select.from, this.getPlayer(card_select.card.owner).exile, card_select.from.indexOf(card_select.card), 0);
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
      this.sendPlayerUpdate();
    }
  }

  /**
   * Manual handler for moving a card. Constructs a drag event and passes into the drag handler.
   * @param card card to move
   * @param from location of card to move
   * @param location string value of where to move the card.
   * Accepts: 'hand', 'deck_top', 'deck_bottom', 'grave', 'exile', 'temp_zone', 'selected', 'command_zone' or 'play'
   */
  sendCardToZone(card: any, from: any[], location: string, noupdate?: boolean) {
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
          location = 'temp_zone';
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
      this.sendCardToZone(from[0], from, dest);
    }
  }

  revealCard(card: any, whomst: any, besides?: any) {
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
    this.sendPlayerUpdate();
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
        this.sendCardToZone(cur_card, this.user.deck.cards, 'temp_zone');
        if (cur_card.types) {
          if (cur_card.types.includes(type)) {
            break;
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
    let scry_num = Number(count);
    for (let i = 0; i < scry_num; i++) {
      this.user.temp_scry_zone.push(this.user.deck.cards[0]);
      this.user.deck.cards.splice(0, 1);
    }
    this.scrying = true;
    this.sendPlayerUpdate();
  }

  endScry() {
    if (this.user.temp_scry_zone.length > 0) {
      for (let card of this.reversePlaymat(this.user.temp_scry_zone)) {
        this.selectCard(card, this.user.temp_scry_zone);
      }
      this.scrySendTo(this.user.temp_scry_zone[0], 'top');
    }
    this.user.temp_scry_zone = [];
    this.scrying = false;
    this.sendPlayerUpdate();
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
    this.sidenav_sort = '';
    this.sidenav_sort_type = '';
    this.getSidenavSort();
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
          break;
        case 'infect':
          item.player.infect --;
          break;
        case 'counter_1':
          item.card.counter_1_value --;
          break;
        case 'counter_2':
          item.card.counter_2_value --;
          break;
        case 'counter_3':
          item.card.counter_3_value --;
          break;
        case 'multiplier':
          item.card.multiplier_value --;
          break;
        case 'power':
          item.card.power_mod --;
          break;
        case 'toughness':
          item.card.toughness_mod --;
          break;
        case 'loyalty':
          item.card.loyalty_mod --;
          break;
        case 'command_tax_1':
          this.user.command_tax_1 --;
          break;
        case 'command_tax_2':
          this.user.command_tax_2 --;
          break;
        case 'custom_counter':
          item.counter.value--;
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
  selector: 'deck-select-dialog',
  templateUrl: 'deck-select-dialog.html',
})
export class DeckSelectDialog {

  decks: any[] = [];
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<TokenInsertDialog>,
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
      if (commander.mana_cost) {
        if (colors == null) {
          colors = [];
        }
        for (let mana of commander.mana_cost) {
          if (mana === 'W' || mana === 'U' || mana === 'B' || mana === 'R' || mana === 'G'){
            colors.push(mana);
          }
        }
        if (commander.back_mana_cost) {
          for (let mana of commander.back_mana_cost) {
            if (mana === 'W' || mana === 'U' || mana === 'B' || mana === 'R' || mana === 'G'){
              colors.push(mana);
            }
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