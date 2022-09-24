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
import {TokenInsertDialog} from "./game-handler-addons.component";

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

  game_data: any;

  //Debugger Variables
  current_user: any = {
    "id": 1,
    "name": "Chris",
    "playmat": "https://i.imgur.com/nrcc9KM.png",
    "theme": "dark"
  }

  user: any = {
    "star_color": null,
    "teammate_id": null,
    "deck": {
      "id": 9,
      "name": "Enraged",
      "owner": 1,
      "sleeves": "https://c1.scryfall.com/file/scryfall-card-backs/large/59/597b79b3-7d77-4261-871a-60dd17403388.jpg?1561757129",
      "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/6/6/6674c7f7-8022-4457-9a8a-6b87ff3348b0.png?1658282667",
      "link": "https://www.archidekt.com/decks/3214006#Enraged",
      "rating": 3,
      "cards": [
        {
          "id": 92,
          "deckid": 9,
          "name": "Elemental Bond",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/5/1/516ebdba-0f25-459a-a26b-f6fa928b96e6.png?1568004541",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Enchantment"
          ],
          "back_types": [],
          "oracle_text": "Whenever a creature with power 3 or greater enters the battlefield under your control, draw a card.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=470709",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 96,
          "deckid": 9,
          "name": "Endbringer",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/0/103cee09-5938-4a5b-bfd6-78f0e57826c8.png?1562871423",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "5",
            "C"
          ],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Eldrazi"
          ],
          "back_types": [],
          "oracle_text": "Untap Endbringer during each other player's untap step.\n{T}: Endbringer deals 1 damage to any target.\n{C}, {T}: Target creature can't attack or block this turn.\n{C}{C}, {T}: Draw a card.",
          "back_oracle_text": "",
          "power": 5,
          "back_power": null,
          "toughness": 5,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 6,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 66.81590213642089,
          "deckid": 9,
          "name": "Forest",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/0031d026-9e9a-46f6-8204-1acfee8b8809.png?1561894880",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Forest"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {G}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 170,
          "deckid": 9,
          "name": "Windswept Heath",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/6/16f6ba7d-76fd-4f98-a41e-fde9a6f3ab64.png?1562900544",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "{T}, Pay 1 life, Sacrifice Windswept Heath: Search your library for a Forest or Plains card, put it onto the battlefield, then shuffle.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 49.692401693662674,
          "deckid": 9,
          "name": "Mountain",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/005a993c-5111-4364-9fba-75b3d94a8296.png?1559591904",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Mountain"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {R}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=891",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 151,
          "deckid": 9,
          "name": "Selvala, Heart of the Wilds",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/5/05294ec8-96d7-496f-a106-aab19ec9b659.png?1562253017",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "G",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Legendary",
            "Creature",
            "Elf",
            "Scout"
          ],
          "back_types": [],
          "oracle_text": "Whenever another creature enters the battlefield, its controller may draw a card if its power is greater than each other creature's power.\n{G}, {T}: Add X mana in any combination of colors, where X is the greatest power among creatures you control.",
          "back_oracle_text": "",
          "power": 2,
          "back_power": null,
          "toughness": 3,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 137,
          "deckid": 9,
          "name": "Raging Regisaur",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/c/0c1632bd-30bc-40a2-963f-44be3b42efb3.png?1601080507",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "R",
            "G"
          ],
          "color_identity": [
            "G",
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Whenever Raging Regisaur attacks, it deals 1 damage to any target.",
          "back_oracle_text": "",
          "power": 4,
          "back_power": null,
          "toughness": 4,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 4,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=489438",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 117,
          "deckid": 9,
          "name": "Ill-Tempered Loner // Howlpack Avenger",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/3/6/36c22e93-4b37-4912-9491-eff17510b08d.png?1637195572",
          "count": 1,
          "iscommander": false,
          "back_image": "https://c1.scryfall.com/file/scryfall-cards/png/back/3/6/36c22e93-4b37-4912-9491-eff17510b08d.png?1637195572",
          "back_face": true,
          "mana_cost": [
            "2",
            "R",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Human",
            "Werewolf"
          ],
          "back_types": [
            "Creature",
            "Werewolf"
          ],
          "oracle_text": "Whenever Ill-Tempered Loner is dealt damage, it deals that much damage to any target.\n{1}{R}: Ill-Tempered Loner gets +2/+0 until end of turn.\nDaybound (If a player casts no spells during their own turn, it becomes night next turn.)",
          "back_oracle_text": "Whenever a permanent you control is dealt damage, Howlpack Avenger deals that much damage to any target.\n{1}{R}: Howlpack Avenger gets +2/+0 until end of turn.\nNightbound (If a player casts at least two spells during their own turn, it becomes day next turn.)",
          "power": 3,
          "back_power": 4,
          "toughness": 3,
          "back_toughness": 4,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 4,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 2.9826733793769087,
          "deckid": 9,
          "name": "Plains",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/00293ce4-3475-4064-8510-9e8c02faf3bf.png?1592674050",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Plains"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {W}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=430511",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 83,
          "deckid": 9,
          "name": "Apex Altisaur",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/5/f/5f8b022e-3e7a-40e6-99a0-53e5adbdafc5.png?1568003585",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "7",
            "G",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "When Apex Altisaur enters the battlefield, it fights up to one target creature you don't control.\nEnrage — Whenever Apex Altisaur is dealt damage, it fights up to one target creature you don't control.",
          "back_oracle_text": "",
          "power": 10,
          "back_power": null,
          "toughness": 10,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 9,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=470577",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 113,
          "deckid": 9,
          "name": "Heartwood Storyteller",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/7/a/7a5e2f7a-8cfe-4d1b-a68d-7e6d8d10bd27.png?1619398147",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "G",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Treefolk"
          ],
          "back_types": [],
          "oracle_text": "Whenever a player casts a noncreature spell, each of that player's opponents may draw a card.",
          "back_oracle_text": "",
          "power": 2,
          "back_power": null,
          "toughness": 3,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=509574",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 127,
          "deckid": 9,
          "name": "Mountain",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/005a993c-5111-4364-9fba-75b3d94a8296.png?1559591904",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Mountain"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {R}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=891",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 164,
          "deckid": 9,
          "name": "Ulvenwald Tracker",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/4/6/46199391-a4f5-4532-b89c-b7691b229bd0.png?1592709478",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Human",
            "Shaman"
          ],
          "back_types": [],
          "oracle_text": "{1}{G}, {T}: Target creature you control fights another target creature.",
          "back_oracle_text": "",
          "power": 1,
          "back_power": null,
          "toughness": 1,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 1,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=240154",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 109,
          "deckid": 9,
          "name": "Gavony Township",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/f/1fd782cf-414c-4340-9431-4b7809c8c04e.png?1645566867",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "{T}: Add {C}.\n{2}{G}{W}, {T}: Put a +1/+1 counter on each creature you control.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 101,
          "deckid": 9,
          "name": "Feldon of the Third Path",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/6/1665327f-8267-4054-9be5-43a610887c26.png?1562272451",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "R",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Legendary",
            "Creature",
            "Human",
            "Artificer"
          ],
          "back_types": [],
          "oracle_text": "{2}{R}, {T}: Create a token that's a copy of target creature card in your graveyard, except it's an artifact in addition to its other types. It gains haste. Sacrifice it at the beginning of the next end step.",
          "back_oracle_text": "",
          "power": 2,
          "back_power": null,
          "toughness": 3,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [
            {
              "name": "Copy",
              "types": [
                "Token"
              ]
            }
          ],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=446742",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 89,
          "deckid": 9,
          "name": "Boros Charm",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/2/2/22dc1c3a-0110-4925-a745-e51b20553027.png?1625977428",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "R",
            "W"
          ],
          "color_identity": [
            "R",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Instant"
          ],
          "back_types": [],
          "oracle_text": "Choose one —\n• Boros Charm deals 4 damage to target player or planeswalker.\n• Permanents you control gain indestructible until end of turn.\n• Target creature gains double strike until end of turn.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 2,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=519245",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 159,
          "deckid": 9,
          "name": "Temple Altisaur",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/9/a/9a3df66a-2332-4734-9236-23b0d3163569.png?1562926124",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "4",
            "W"
          ],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "If a source would deal damage to another Dinosaur you control, prevent all but 1 of that damage.",
          "back_oracle_text": "",
          "power": 3,
          "back_power": null,
          "toughness": 4,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 134,
          "deckid": 9,
          "name": "Powerstone Minefield",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/b/1/b17807b9-8feb-48ac-813a-829577f5b9e8.png?1562936913",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "R",
            "W"
          ],
          "color_identity": [
            "R",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Enchantment"
          ],
          "back_types": [],
          "oracle_text": "Whenever a creature attacks or blocks, Powerstone Minefield deals 2 damage to it.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 4,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=23198",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 149,
          "deckid": 9,
          "name": "Sacred Foundry",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/a/0a26d900-c652-4f9c-8681-a35c5f8b1937.png?1561815185",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "R",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Land",
            "Mountain",
            "Plains"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {R} or {W}.)\nAs Sacred Foundry enters the battlefield, you may pay 2 life. If you don't, it enters the battlefield tapped.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=366439",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 156,
          "deckid": 9,
          "name": "Stomping Ground",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/4/a/4acf970d-d2d7-413d-aba7-587ee53d8d5c.png?1641594524",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G",
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Land",
            "Mountain",
            "Forest"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {R} or {G}.)\nAs Stomping Ground enters the battlefield, you may pay 2 life. If you don't, it enters the battlefield tapped.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 133,
          "deckid": 9,
          "name": "Plateau",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/8/0829af6e-7dd9-4bce-bf14-1c5d509556cb.png?1630620277",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "R",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Land",
            "Mountain",
            "Plains"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {R} or {W}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 138,
          "deckid": 9,
          "name": "Rampaging Ferocidon",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/3/9/39d3c658-1927-4af3-9077-88c4a669c730.png?1566819584",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Menace\nPlayers can't gain life.\nWhenever another creature enters the battlefield, Rampaging Ferocidon deals 1 damage to that creature's controller.",
          "back_oracle_text": "",
          "power": 3,
          "back_power": null,
          "toughness": 3,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=435308",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 40.04372191674262,
          "deckid": 9,
          "name": "Plains",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/00293ce4-3475-4064-8510-9e8c02faf3bf.png?1592674050",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Plains"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {W}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=430511",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 119,
          "deckid": 9,
          "name": "Karametra, God of Harvests",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/2/1/21efbf4f-f084-4abb-9f3d-f303f2dd8f97.png?1632146262",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "G",
            "W"
          ],
          "color_identity": [
            "G",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Legendary",
            "Enchantment",
            "Creature",
            "God"
          ],
          "back_types": [],
          "oracle_text": "Indestructible\nAs long as your devotion to green and white is less than seven, Karametra isn't a creature.\nWhenever you cast a creature spell, you may search your library for a Forest or Plains card, put it onto the battlefield tapped, then shuffle.",
          "back_oracle_text": "",
          "power": 6,
          "back_power": null,
          "toughness": 7,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 122,
          "deckid": 9,
          "name": "Luminous Broodmoth",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/5/0535c823-f6e9-4a2f-8adf-f69b6f0fea1f.png?1592272940",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "W",
            "W"
          ],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Insect"
          ],
          "back_types": [],
          "oracle_text": "Flying\nWhenever a creature you control without flying dies, return it to the battlefield under its owner's control with a flying counter on it.",
          "back_oracle_text": "",
          "power": 3,
          "back_power": null,
          "toughness": 4,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 4,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 82.42339854661805,
          "deckid": 9,
          "name": "Forest",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/0031d026-9e9a-46f6-8204-1acfee8b8809.png?1561894880",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Forest"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {G}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 112,
          "deckid": 9,
          "name": "Herald's Horn",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/7/07b06421-778a-4d23-862b-30fc5fa25928.png?1562599082",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3"
          ],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Artifact"
          ],
          "back_types": [],
          "oracle_text": "As Herald's Horn enters the battlefield, choose a creature type.\nCreature spells you cast of the chosen type cost {1} less to cast.\nAt the beginning of your upkeep, look at the top card of your library. If it's a creature card of the chosen type, you may reveal it and put it into your hand.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=433294",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 105,
          "deckid": 9,
          "name": "Forerunner of the Empire",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/9/4/947644ab-02b3-4ebe-b62a-c087ab205ab0.png?1555040426",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Human",
            "Soldier"
          ],
          "back_types": [],
          "oracle_text": "When Forerunner of the Empire enters the battlefield, you may search your library for a Dinosaur card, reveal it, then shuffle and put that card on top.\nWhenever a Dinosaur enters the battlefield under your control, you may have Forerunner of the Empire deal 1 damage to each creature.",
          "back_oracle_text": "",
          "power": 1,
          "back_power": null,
          "toughness": 3,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 4,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=439759",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 85,
          "deckid": 9,
          "name": "Aura of Silence",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/c/1c325b30-c769-41e0-839b-2407e3273bfd.png?1562051909",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "W",
            "W"
          ],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Enchantment"
          ],
          "back_types": [],
          "oracle_text": "Artifact and enchantment spells your opponents cast cost {2} more to cast.\nSacrifice Aura of Silence: Destroy target artifact or enchantment.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 171,
          "deckid": 9,
          "name": "Wooded Foothills",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/0/1066a94a-8e4f-4d77-820b-7a77a18116f0.png?1604195216",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "{T}, Pay 1 life, Sacrifice Wooded Foothills: Search your library for a Mountain or Forest card, put it onto the battlefield, then shuffle.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=497164",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 115,
          "deckid": 9,
          "name": "Huatli, Warrior Poet",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/a/0/a0cc61ba-e91a-4b30-841c-cae8dd288b40.png?1562561182",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "R",
            "W"
          ],
          "color_identity": [
            "R",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Legendary",
            "Planeswalker",
            "Huatli"
          ],
          "back_types": [],
          "oracle_text": "+2: You gain life equal to the greatest power among creatures you control.\n0: Create a 3/3 green Dinosaur creature token with trample.\n−X: Huatli, Warrior Poet deals X damage divided as you choose among any number of target creatures. Creatures dealt damage this way can't block this turn.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 3,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [
            {
              "name": "Dinosaur",
              "types": [
                "Token",
                "Creature",
                "Dinosaur"
              ]
            }
          ],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=435380",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 153,
          "deckid": 9,
          "name": "Silverclad Ferocidons",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/b/0b480b36-61b1-476c-a04c-37720fd35c05.png?1566582437",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "5",
            "R",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Enrage — Whenever Silverclad Ferocidons is dealt damage, each opponent sacrifices a permanent.",
          "back_oracle_text": "",
          "power": 8,
          "back_power": null,
          "toughness": 5,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 7,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 173,
          "deckid": 9,
          "name": "Zetalpa, Primal Dawn",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/1/119836fe-70e5-4000-81b7-21e410cc04ab.png?1576267211",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "6",
            "W",
            "W"
          ],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Legendary",
            "Creature",
            "Elder",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Flying, double strike, vigilance, trample, indestructible",
          "back_oracle_text": "",
          "power": 4,
          "back_power": null,
          "toughness": 8,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 8,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=476081",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 91,
          "deckid": 9,
          "name": "Bellowing Aegisaur",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/c/3/c3e3b6c5-fd30-4d45-a122-ce60d5707357.png?1562563552",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "5",
            "W"
          ],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Enrage — Whenever Bellowing Aegisaur is dealt damage, put a +1/+1 counter on each other creature you control.",
          "back_oracle_text": "",
          "power": 3,
          "back_power": null,
          "toughness": 5,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 6,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=435155",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 162,
          "deckid": 9,
          "name": "Topiary Stomper",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/5/15de3307-137c-4055-add8-acd10f03fb46.png?1651797751",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "G",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Plant",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Vigilance\nWhen Topiary Stomper enters the battlefield, search your library for a basic land card, put it onto the battlefield tapped, then shuffle.\nTopiary Stomper can't attack or block unless you control seven or more lands.",
          "back_oracle_text": "",
          "power": 4,
          "back_power": null,
          "toughness": 4,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 160,
          "deckid": 9,
          "name": "Temple Garden",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/9/19706d19-414e-4221-8e46-b389e3bb3c2d.png?1570826959",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Land",
            "Forest",
            "Plains"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {G} or {W}.)\nAs Temple Garden enters the battlefield, you may pay 2 life. If you don't, it enters the battlefield tapped.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 141,
          "deckid": 9,
          "name": "Reap",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/2/2/229f8a3d-d1a5-46d7-9b1b-e165397e6579.png?1562052809",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Instant"
          ],
          "back_types": [],
          "oracle_text": "Return up to X target cards from your graveyard to your hand, where X is the number of black permanents target opponent controls as you cast this spell.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 2,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=4781",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 150,
          "deckid": 9,
          "name": "Savannah",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/e/0e9aeaa8-9a75-4719-992f-cbb316f72175.png?1559591729",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Land",
            "Forest",
            "Plains"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {G} or {W}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=579",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 139,
          "deckid": 9,
          "name": "Ranging Raptors",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/8/08df7e63-65d6-4e42-8699-7510453d3100.png?1576267416",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Enrage — Whenever Ranging Raptors is dealt damage, you may search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
          "back_oracle_text": "",
          "power": 2,
          "back_power": null,
          "toughness": 3,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=476115",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 130,
          "deckid": 9,
          "name": "Otepec Huntmaster",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/c/3/c334e6f3-1378-4429-b4f1-fa8ed7ab7123.png?1562563501",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Human",
            "Shaman"
          ],
          "back_types": [],
          "oracle_text": "Dinosaur spells you cast cost {1} less to cast.\n{T}: Target Dinosaur gains haste until end of turn.",
          "back_oracle_text": "",
          "power": 1,
          "back_power": null,
          "toughness": 2,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 2,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=435307",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 90,
          "deckid": 9,
          "name": "Brash Taunter",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/2/026fb1dc-9044-47c1-bd8d-d7ce53335d72.png?1630633376",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "4",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Goblin"
          ],
          "back_types": [],
          "oracle_text": "Indestructible\nWhenever Brash Taunter is dealt damage, it deals that much damage to target opponent.\n{2}{R}, {T}: Brash Taunter fights another target creature.",
          "back_oracle_text": "",
          "power": 1,
          "back_power": null,
          "toughness": 1,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 131,
          "deckid": 9,
          "name": "Pariah's Shield",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/8/d/8d22e9ad-117a-4dbb-9d84-cd454e25eb93.png?1654714977",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "5"
          ],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Artifact",
            "Equipment"
          ],
          "back_types": [],
          "oracle_text": "All damage that would be dealt to you is dealt to equipped creature instead.\nEquip {3}",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 167,
          "deckid": 9,
          "name": "Verdant Sun's Avatar",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/b/1bff425c-9f92-4f6e-a48d-e6257b48f169.png?1566582128",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "5",
            "G",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur",
            "Avatar"
          ],
          "back_types": [],
          "oracle_text": "Whenever Verdant Sun's Avatar or another creature enters the battlefield under your control, you gain life equal to that creature's toughness.",
          "back_oracle_text": "",
          "power": 5,
          "back_power": null,
          "toughness": 5,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 7,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 169,
          "deckid": 9,
          "name": "Wayward Swordtooth",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/d/1d98486a-bfbe-4144-b65c-c2e8e8e5a3ca.png?1566582416",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Ascend (If you control ten or more permanents, you get the city's blessing for the rest of the game.)\nYou may play an additional land on each of your turns.\nWayward Swordtooth can't attack or block unless you have the city's blessing.",
          "back_oracle_text": "",
          "power": 5,
          "back_power": null,
          "toughness": 5,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        },
        {
          "id": 31.225872362832163,
          "deckid": 9,
          "name": "Plains",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/00293ce4-3475-4064-8510-9e8c02faf3bf.png?1592674050",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Plains"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {W}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=430511",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": ""
        }
      ],
      "tokens": [
        {
          "id": 1,
          "deckid": 9,
          "name": "Copy",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/6/06f62ebf-1600-4eaa-a998-3fd7d1ea2f65.png?1604195073",
          "types": [
            "Token"
          ],
          "oracle_text": "(This token can be used to represent a token that's a copy of a permanent.)",
          "power": null,
          "toughness": null
        },
        {
          "id": 3,
          "deckid": 9,
          "name": "Dinosaur",
          "image": "https://i.imgur.com/4ZpQXcZ.png",
          "types": [
            "Token",
            "Creature",
            "Dinosaur"
          ],
          "oracle_text": "Trample (This creature can deal excess combat damage to the player or planeswalker it's attacking.)",
          "power": 3,
          "toughness": 3
        },
        {
          "id": 4,
          "deckid": 9,
          "name": "Dragon Spirit",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/a/4/a4c06e08-2026-471d-a6d0-bbb0f040420a.png?1654565998",
          "types": [
            "Token",
            "Creature",
            "Dragon",
            "Spirit"
          ],
          "oracle_text": "Flying",
          "power": 5,
          "toughness": 5
        },
        {
          "id": 2,
          "deckid": 9,
          "name": "Insect",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/0057f94e-c2be-44e1-a93b-e31432f4ffa5.png?1562086858",
          "types": [
            "Token",
            "Creature",
            "Insect"
          ],
          "oracle_text": null,
          "power": 1,
          "toughness": 1
        }
      ],
      "commander":
        {
          name: "commander",
          cards:[{
              "id": 108,
              "deckid": 9,
              "name": "Gishath, Sun's Avatar",
              "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/6/6/6674c7f7-8022-4457-9a8a-6b87ff3348b0.png?1658282667",
              "count": 1,
              "iscommander": true,
              "back_image": null,
              "back_face": false,
              "mana_cost": [
                "5",
                "R",
                "G",
                "W"
              ],
              "color_identity": [
                "G",
                "R",
                "W"
              ],
              "back_mana_cost": [],
              "types": [
                "Legendary",
                "Creature",
                "Dinosaur",
                "Avatar"
              ],
              "back_types": [],
              "oracle_text": "Vigilance, trample, haste\nWhenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
              "back_oracle_text": "",
              "power": 7,
              "back_power": null,
              "toughness": 6,
              "back_toughness": null,
              "loyalty": 0,
              "back_loyalty": null,
              "cmc": 8,
              "tokens": [],
              "gatherer": null,
              "counter_1": false,
              "counter_2": false,
              "counter_3": false,
              "multiplier": false,
              "counter_1_value": 0,
              "counter_2_value": 0,
              "counter_3_value": 0,
              "multiplier_value": 0,
              "owner": 1,
              "power_mod": 0,
              "toughness_mod": 0,
              "loyalty_mod": 0,
              "locked": false,
              "primed": false,
              "triggered": false,
              "is_token": false,
              "tapped": "untapped",
              "sidenav_visible": true,
              "visible": [
                1
              ],
              "alt": false,
              "facedown": false,
              "shaken": false,
              "inverted": false,
              "notes": "",
              "selected": false
            }],
          saved:[{
              "id": 108,
              "deckid": 9,
              "name": "Gishath, Sun's Avatar",
              "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/6/6/6674c7f7-8022-4457-9a8a-6b87ff3348b0.png?1658282667",
              "count": 1,
              "iscommander": true,
              "back_image": null,
              "back_face": false,
              "mana_cost": [
                "5",
                "R",
                "G",
                "W"
              ],
              "color_identity": [
                "G",
                "R",
                "W"
              ],
              "back_mana_cost": [],
              "types": [
                "Legendary",
                "Creature",
                "Dinosaur",
                "Avatar"
              ],
              "back_types": [],
              "oracle_text": "Vigilance, trample, haste\nWhenever Gishath, Sun's Avatar deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order.",
              "back_oracle_text": "",
              "power": 7,
              "back_power": null,
              "toughness": 6,
              "back_toughness": null,
              "loyalty": null,
              "back_loyalty": null,
              "cmc": 8,
              "tokens": [],
              "gatherer": null,
              "counter_1": false,
              "counter_2": false,
              "counter_3": false,
              "multiplier": false,
              "counter_1_value": 0,
              "counter_2_value": 0,
              "counter_3_value": 0,
              "multiplier_value": 0,
              "owner": 1,
              "power_mod": 0,
              "toughness_mod": 0,
              "loyalty_mod": 0,
              "locked": false,
              "primed": false,
              "triggered": false,
              "is_token": false,
              "tapped": "untapped",
              "sidenav_visible": true,
              "visible": [],
              "alt": false,
              "facedown": false,
              "shaken": false,
              "inverted": false,
              "notes": ""
            }],
          owner: 1
        }
    },
    "name": "Chris",
    "playmat_image": "https://i.ibb.co/Df3dC43/bolasplaymatfinal.png",
    "id": 1,
    "life": 40,
    "infect": 0,
    "playmat": [],
    "turn": 0,
    "command_tax_1": 0,
    "command_tax_2": 0,
    "scooped": false,
    "top_flipped": false,
    "card_preview": {
      "position": {
        "x": 1502,
        "y": 430
      }
    },
    "play_counters": [],
    "hand": {
      owner: 1,
      name: 'hand',
      cards: []
    },
    "hand_preview": [1],
    "grave": {
      owner: 1,
      name: 'grave',
      cards: [
      {
        "id": 100,
        "deckid": 9,
        "name": "Farseek",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/6/061f0032-eb14-4c63-8231-aa61472396c2.png?1568004554",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [
          "1",
          "G"
        ],
        "color_identity": [
          "G"
        ],
        "back_mana_cost": [],
        "types": [
          "Sorcery"
        ],
        "back_types": [],
        "oracle_text": "Search your library for a Plains, Island, Swamp, or Mountain card, put it onto the battlefield tapped, then shuffle.",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": 2,
        "tokens": [],
        "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=470711",
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 152,
        "deckid": 9,
        "name": "Secluded Courtyard",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/5/0539b1a5-8704-476f-ba1f-2fe01190e157.png?1654568998",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [],
        "color_identity": [],
        "back_mana_cost": [],
        "types": [
          "Land"
        ],
        "back_types": [],
        "oracle_text": "As Secluded Courtyard enters the battlefield, choose a creature type.\n{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type or activate an ability of a creature or creature card of the chosen type.",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": null,
        "tokens": [],
        "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=548588",
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 95,
        "deckid": 9,
        "name": "Chaos Warp",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/4/042431bc-0b21-4920-802f-6dd02e4c8721.png?1592713490",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [
          "2",
          "R"
        ],
        "color_identity": [
          "R"
        ],
        "back_mana_cost": [],
        "types": [
          "Instant"
        ],
        "back_types": [],
        "oracle_text": "The owner of target permanent shuffles it into their library, then reveals the top card of their library. If it's a permanent card, they put it onto the battlefield.",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": 3,
        "tokens": [],
        "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=236466",
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 128,
        "deckid": 9,
        "name": "Noxious Revival",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/b/1bdd1243-1d14-496a-9b7a-0c5b34461361.png?1562875840",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [
          "G",
          "P"
        ],
        "color_identity": [
          "G"
        ],
        "back_mana_cost": [],
        "types": [
          "Instant"
        ],
        "back_types": [],
        "oracle_text": "({G/P} can be paid with either {G} or 2 life.)\nPut target card from a graveyard on top of its owner's library.",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": 1,
        "tokens": [],
        "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=230067",
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 129,
        "deckid": 9,
        "name": "Needletooth Raptor",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/e/9/e9a90b68-d5f4-4f3c-bd4b-af59dd868919.png?1555040463",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [
          "3",
          "R"
        ],
        "color_identity": [
          "R"
        ],
        "back_mana_cost": [],
        "types": [
          "Creature",
          "Dinosaur"
        ],
        "back_types": [],
        "oracle_text": "Enrage — Whenever Needletooth Raptor is dealt damage, it deals 5 damage to target creature an opponent controls.",
        "back_oracle_text": "",
        "power": 2,
        "back_power": null,
        "toughness": 2,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": 4,
        "tokens": [],
        "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=439764",
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 94,
        "deckid": 9,
        "name": "Caltrops",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/8/7/8769b55a-a0a1-4b6f-8c80-669385a34425.png?1562242172",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [
          "3"
        ],
        "color_identity": [],
        "back_mana_cost": [],
        "types": [
          "Artifact"
        ],
        "back_types": [],
        "oracle_text": "Whenever a creature attacks, Caltrops deals 1 damage to it.",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": 3,
        "tokens": [],
        "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=25655",
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 143,
        "deckid": 9,
        "name": "Ripjaw Raptor",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/4/b/4bdf9bf0-5247-4a30-91f1-0172b6aa6be6.png?1566582099",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [
          "2",
          "G",
          "G"
        ],
        "color_identity": [
          "G"
        ],
        "back_mana_cost": [],
        "types": [
          "Creature",
          "Dinosaur"
        ],
        "back_types": [],
        "oracle_text": "Enrage — Whenever Ripjaw Raptor is dealt damage, draw a card.",
        "back_oracle_text": "",
        "power": 4,
        "back_power": null,
        "toughness": 5,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": 4,
        "tokens": [],
        "gatherer": null,
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 145,
        "deckid": 9,
        "name": "Rite of Passage",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/b/e/bea92a0c-f73f-4e85-9d87-6401aa1b052e.png?1562879491",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [
          "2",
          "G"
        ],
        "color_identity": [
          "G"
        ],
        "back_mana_cost": [],
        "types": [
          "Enchantment"
        ],
        "back_types": [],
        "oracle_text": "Whenever a creature you control is dealt damage, put a +1/+1 counter on it. (It must survive the damage to get the counter.)",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": 3,
        "tokens": [],
        "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=51163",
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 99,
        "deckid": 9,
        "name": "Cindervines",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/3/3/33c159a1-0cf5-4aa2-abdc-ab8daafc1225.png?1551250121",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [
          "R",
          "G"
        ],
        "color_identity": [
          "G",
          "R"
        ],
        "back_mana_cost": [],
        "types": [
          "Enchantment"
        ],
        "back_types": [],
        "oracle_text": "Whenever an opponent casts a noncreature spell, Cindervines deals 1 damage to that player.\n{1}, Sacrifice Cindervines: Destroy target artifact or enchantment. Cindervines deals 2 damage to that permanent's controller.",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": 2,
        "tokens": [],
        "gatherer": null,
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 161,
        "deckid": 9,
        "name": "The Great Henge",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/1/11bacd78-fdd0-48c9-ae36-3880bde2e97e.png?1571850971",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [
          "7",
          "G",
          "G"
        ],
        "color_identity": [
          "G"
        ],
        "back_mana_cost": [],
        "types": [
          "Legendary",
          "Artifact"
        ],
        "back_types": [],
        "oracle_text": "This spell costs {X} less to cast, where X is the greatest power among creatures you control.\n{T}: Add {G}{G}. You gain 2 life.\nWhenever a nontoken creature enters the battlefield under your control, put a +1/+1 counter on it and draw a card.",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": 9,
        "tokens": [],
        "gatherer": null,
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 118,
        "deckid": 9,
        "name": "Jetmir's Garden",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/c/0c629c6b-59b3-4a53-b9fc-94a0b5867c57.png?1651796880",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [],
        "color_identity": [
          "G",
          "R",
          "W"
        ],
        "back_mana_cost": [],
        "types": [
          "Land",
          "Mountain",
          "Forest",
          "Plains"
        ],
        "back_types": [],
        "oracle_text": "({T}: Add {R}, {G}, or {W}.)\nJetmir's Garden enters the battlefield tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": null,
        "tokens": [],
        "gatherer": null,
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      },
      {
        "id": 88,
        "deckid": 9,
        "name": "Arid Mesa",
        "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/6/16c8d2fa-54a7-46e8-980c-905258497c90.png?1562610110",
        "count": 1,
        "iscommander": false,
        "back_image": null,
        "back_face": false,
        "mana_cost": [],
        "color_identity": [],
        "back_mana_cost": [],
        "types": [
          "Land"
        ],
        "back_types": [],
        "oracle_text": "{T}, Pay 1 life, Sacrifice Arid Mesa: Search your library for a Mountain or Plains card, put it onto the battlefield, then shuffle.",
        "back_oracle_text": "",
        "power": null,
        "back_power": null,
        "toughness": null,
        "back_toughness": null,
        "loyalty": 0,
        "back_loyalty": null,
        "cmc": null,
        "tokens": [],
        "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=177584",
        "counter_1": false,
        "counter_2": false,
        "counter_3": false,
        "multiplier": false,
        "counter_1_value": 0,
        "counter_2_value": 0,
        "counter_3_value": 0,
        "multiplier_value": 0,
        "owner": 1,
        "power_mod": 0,
        "toughness_mod": 0,
        "loyalty_mod": 0,
        "locked": false,
        "primed": false,
        "triggered": false,
        "is_token": false,
        "tapped": "untapped",
        "sidenav_visible": true,
        "visible": [
          1
        ],
        "alt": false,
        "facedown": false,
        "shaken": false,
        "inverted": false,
        "notes": "",
        "selected": false
      }
    ]
    },
    "exile": {
      owner: 1,
      name: 'exile',
      cards: [
        {
          "id": 154,
          "deckid": 9,
          "name": "Siegehorn Ceratops",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/a/0a9c4c63-402e-489e-ab0d-1c98309b010a.png?1555040949",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "G",
            "W"
          ],
          "color_identity": [
            "G",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Enrage — Whenever Siegehorn Ceratops is dealt damage, put two +1/+1 counters on it. (It must survive the damage to get the counters.)",
          "back_oracle_text": "",
          "power": 2,
          "back_power": null,
          "toughness": 2,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 2,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=439832",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 126,
          "deckid": 9,
          "name": "Mother of Runes",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/b/0b1a46ab-95cb-4c24-924f-fc2afd4fcac7.png?1562862312",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "W"
          ],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Human",
            "Cleric"
          ],
          "back_types": [],
          "oracle_text": "{T}: Target creature you control gains protection from the color of your choice until end of turn.",
          "back_oracle_text": "",
          "power": 1,
          "back_power": null,
          "toughness": 1,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 1,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=5704",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 93,
          "deckid": 9,
          "name": "Etali, Primal Storm",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/d/1d3d8bb4-0430-45bb-930d-5d6db6521945.png?1587309687",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "4",
            "R",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Legendary",
            "Creature",
            "Elder",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Whenever Etali, Primal Storm attacks, exile the top card of each player's library, then you may cast any number of spells from among those cards without paying their mana costs.",
          "back_oracle_text": "",
          "power": 6,
          "back_power": null,
          "toughness": 6,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 6,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=439757",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 157,
          "deckid": 9,
          "name": "Sunhome, Fortress of the Legion",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/2/12fc2aff-35e0-44e9-a976-70810d43634c.png?1562841221",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "R",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "{T}: Add {C}.\n{2}{R}{W}, {T}: Target creature gains double strike until end of turn.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=205363",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 146,
          "deckid": 9,
          "name": "Regisaur Alpha",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/e/0e27be78-a209-4a64-a75a-bea677cca1b5.png?1562897741",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "R",
            "G"
          ],
          "color_identity": [
            "G",
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Other Dinosaurs you control have haste.\nWhen Regisaur Alpha enters the battlefield, create a 3/3 green Dinosaur creature token with trample.",
          "back_oracle_text": "",
          "power": 4,
          "back_power": null,
          "toughness": 4,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [
            {
              "name": "Dinosaur",
              "types": [
                "Token",
                "Creature",
                "Dinosaur"
              ]
            }
          ],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 142,
          "deckid": 9,
          "name": "Rhythm of the Wild",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/7/0/70d13ff4-e6ba-4bfe-9668-d11f7facb8d3.png?1651656195",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "R",
            "G"
          ],
          "color_identity": [
            "G",
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Enchantment"
          ],
          "back_types": [],
          "oracle_text": "Creature spells you control can't be countered.\nNontoken creatures you control have riot. (They enter the battlefield with your choice of a +1/+1 counter or haste.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=554224",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 86,
          "deckid": 9,
          "name": "Darksteel Plate",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/3/f/3f99fb1e-99a6-4c83-98eb-7bff23996a7f.png?1655823991",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3"
          ],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Artifact",
            "Equipment"
          ],
          "back_types": [],
          "oracle_text": "Indestructible\nEquipped creature has indestructible.\nEquip {2}",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=571637",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 148,
          "deckid": 9,
          "name": "Rogue's Passage",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/3/8/38f6e656-7272-4232-8366-6f26fcbe2e21.png?1650425575",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "{T}: Add {C}.\n{4}, {T}: Target creature can't be blocked this turn.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=559994",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 155,
          "deckid": 9,
          "name": "Snapping Sailback",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/a/0af1eadf-f7ea-40be-a0cc-b79e4161db34.png?1562550413",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "4",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Flash\nEnrage — Whenever Snapping Sailback is dealt damage, put a +1/+1 counter on it. (It must survive the damage to get the counter.)",
          "back_oracle_text": "",
          "power": 4,
          "back_power": null,
          "toughness": 4,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=435364",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 87,
          "deckid": 9,
          "name": "Desert",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/2/0/201155ea-f474-4e13-acda-cb071a6ca977.png?1562900934",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Land",
            "Desert"
          ],
          "back_types": [],
          "oracle_text": "{T}: Add {C}.\n{T}: Desert deals 1 damage to target attacking creature. Activate only during the end of combat step.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=986",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 98,
          "deckid": 9,
          "name": "Exotic Orchard",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/d/0de15320-485c-4191-8f15-12f9d1b340ba.png?1654119348",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "{T}: Add one mana of any color that a land an opponent controls could produce.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=567710",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 147,
          "deckid": 9,
          "name": "Rites of Flourishing",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/e/0e3d43ce-8297-47f6-a877-d723b9b43fdb.png?1562632419",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Enchantment"
          ],
          "back_types": [],
          "oracle_text": "At the beginning of each player's draw step, that player draws an additional card.\nEach player may play an additional land on each of their turns.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=235188",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 125,
          "deckid": 9,
          "name": "Monster Manual // Zoological Study",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/2/7/27223ee4-970a-438a-beff-a1b13b14aff4.png?1660728031",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": true,
          "mana_cost": [
            "3",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [
            "2",
            "G"
          ],
          "types": [
            "Artifact"
          ],
          "back_types": [
            "Sorcery",
            "Adventure"
          ],
          "oracle_text": "{1}{G}, {T}: You may put a creature card from your hand onto the battlefield.",
          "back_oracle_text": "Mill five cards, then return a creature card milled this way to your hand. (Then exile this card. You may cast the artifact later from exile.)",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 4,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=563125",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 144,
          "deckid": 9,
          "name": "Reliquary Tower",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/1/2/1241912a-92d6-4942-b97b-f795e702c4ca.png?1654119503",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "You have no maximum hand size.\n{T}: Add {C}.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=567728",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 67.51548213065605,
          "deckid": 9,
          "name": "Forest",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/0031d026-9e9a-46f6-8204-1acfee8b8809.png?1561894880",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Forest"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {G}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 79.13271298866356,
          "deckid": 9,
          "name": "Mountain",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/005a993c-5111-4364-9fba-75b3d94a8296.png?1559591904",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Mountain"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {R}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=891",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 172,
          "deckid": 9,
          "name": "Zacama, Primal Calamity",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/3/5/3581f83f-f757-468d-bb4d-17793ac666b3.png?1566582434",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "6",
            "R",
            "G",
            "W"
          ],
          "color_identity": [
            "G",
            "R",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Legendary",
            "Creature",
            "Elder",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Vigilance, reach, trample\nWhen Zacama, Primal Calamity enters the battlefield, if you cast it, untap all lands you control.\n{2}{R}: Zacama deals 3 damage to target creature.\n{2}{G}: Destroy target artifact or enchantment.\n{2}{W}: You gain 3 life.",
          "back_oracle_text": "",
          "power": 9,
          "back_power": null,
          "toughness": 9,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 9,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 132,
          "deckid": 9,
          "name": "Plains",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/00293ce4-3475-4064-8510-9e8c02faf3bf.png?1592674050",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Plains"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {W}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=430511",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 166,
          "deckid": 9,
          "name": "Trapjaw Tyrant",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/7/c/7cb5fc7e-5ac4-4245-9f88-3921ab5704b9.png?1562920143",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "W",
            "W"
          ],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Enrage — Whenever Trapjaw Tyrant is dealt damage, exile target creature an opponent controls until Trapjaw Tyrant leaves the battlefield.",
          "back_oracle_text": "",
          "power": 5,
          "back_power": null,
          "toughness": 5,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 163,
          "deckid": 9,
          "name": "Thrashing Brontodon",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/d/0d9264ff-9f7c-46f3-862a-fee7ad213250.png?1555040755",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "G",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "{1}, Sacrifice Thrashing Brontodon: Destroy target artifact or enchantment.",
          "back_oracle_text": "",
          "power": 3,
          "back_power": null,
          "toughness": 4,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=439805",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 120,
          "deckid": 9,
          "name": "Kessig Wolf Run",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/2/3/23809d14-5f52-43c5-ab7a-0db9f9ab7b3c.png?1650425389",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G",
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "{T}: Add {C}.\n{X}{R}{G}, {T}: Target creature gets +X/+0 and gains trample until end of turn.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=559983",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 168,
          "deckid": 9,
          "name": "Vrondiss, Rage of Ancients",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/6/4/64d9699b-d90f-482f-89eb-f3d06af94997.png?1651355247",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "R",
            "G"
          ],
          "color_identity": [
            "G",
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Legendary",
            "Creature",
            "Dragon",
            "Barbarian"
          ],
          "back_types": [],
          "oracle_text": "Enrage — Whenever Vrondiss, Rage of Ancients is dealt damage, you may create a 5/4 red and green Dragon Spirit creature token with \"When this creature deals damage, sacrifice it.\"\nWhenever you roll one or more dice, you may have Vrondiss deal 1 damage to itself.",
          "back_oracle_text": "",
          "power": 5,
          "back_power": null,
          "toughness": 4,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [
            {
              "name": "Dragon Spirit",
              "types": [
                "Token",
                "Creature",
                "Dragon",
                "Spirit"
              ]
            }
          ],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 111,
          "deckid": 9,
          "name": "Harbinger of the Hunt",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/7/07b311ec-fa6b-462c-a969-780726fb3d23.png?1562875759",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "R",
            "G"
          ],
          "color_identity": [
            "G",
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dragon"
          ],
          "back_types": [],
          "oracle_text": "Flying\n{2}{R}: Harbinger of the Hunt deals 1 damage to each creature without flying.\n{2}{G}: Harbinger of the Hunt deals 1 damage to each other creature with flying.",
          "back_oracle_text": "",
          "power": 5,
          "back_power": null,
          "toughness": 3,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 124,
          "deckid": 9,
          "name": "Mirari's Wake",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/2/02747420-c635-4f0f-9888-81cf4f7dfc91.png?1590118136",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "G",
            "W"
          ],
          "color_identity": [
            "G",
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Enchantment"
          ],
          "back_types": [],
          "oracle_text": "Creatures you control get +1/+1.\nWhenever you tap a land for mana, add one mana of any type that land produced.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 52.65077525382667,
          "deckid": 9,
          "name": "Mountain",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/005a993c-5111-4364-9fba-75b3d94a8296.png?1559591904",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Mountain"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {R}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=891",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 84,
          "deckid": 9,
          "name": "Command Tower",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/9/09e008b9-c27c-40ad-9242-d7da52a2a0a8.png?1562896932",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "{T}: Add one mana of any color in your commander's color identity.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 158,
          "deckid": 9,
          "name": "Taiga",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/1/01006833-6007-4c16-9ebb-20d31c60a57a.png?1559592223",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G",
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Land",
            "Mountain",
            "Forest"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {R} or {G}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=883",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 102,
          "deckid": 9,
          "name": "Flumph",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/2/6/263501c5-dec0-4c01-8129-61f9fdd22b54.png?1632361015",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "W"
          ],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Jellyfish"
          ],
          "back_types": [],
          "oracle_text": "Defender, flying\nWhenever Flumph is dealt damage, you and target opponent each draw a card.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": 4,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 2,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=530482",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 123,
          "deckid": 9,
          "name": "Marauding Raptor",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/d/0da7e676-202c-441e-9515-0f33849f8968.png?1599764935",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Creature spells you cast cost {1} less to cast.\nWhenever another creature enters the battlefield under your control, Marauding Raptor deals 2 damage to it. If a Dinosaur is dealt damage this way, Marauding Raptor gets +2/+0 until end of turn.",
          "back_oracle_text": "",
          "power": 2,
          "back_power": null,
          "toughness": 3,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 2,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 104,
          "deckid": 9,
          "name": "Forest",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/0/0031d026-9e9a-46f6-8204-1acfee8b8809.png?1561894880",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Basic",
            "Land",
            "Forest"
          ],
          "back_types": [],
          "oracle_text": "({T}: Add {G}.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 110,
          "deckid": 9,
          "name": "Guardian Project",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/6/9/6980aff2-b91c-49c8-adc6-dbe652c853eb.png?1551250087",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Enchantment"
          ],
          "back_types": [],
          "oracle_text": "Whenever a nontoken creature enters the battlefield under your control, if it doesn't have the same name as another creature you control or a creature card in your graveyard, draw a card.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 4,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 106,
          "deckid": 9,
          "name": "Frilled Deathspitter",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/d/2/d20a38fa-bf26-403e-98bb-4e078084b154.png?1573511709",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Enrage — Whenever Frilled Deathspitter is dealt damage, it deals 2 damage to target opponent or planeswalker.",
          "back_oracle_text": "",
          "power": 3,
          "back_power": null,
          "toughness": 2,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 136,
          "deckid": 9,
          "name": "Pyrohemia",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/b/0b778d44-60a9-4230-8090-73c38e7c9697.png?1562565718",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "R",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Enchantment"
          ],
          "back_types": [],
          "oracle_text": "At the beginning of the end step, if no creatures are on the battlefield, sacrifice Pyrohemia.\n{R}: Pyrohemia deals 1 damage to each creature and each player.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 4,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=122436",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 103,
          "deckid": 9,
          "name": "Fiendlash",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/5/0/50f13e7b-6d20-434d-82d1-103c9a63aa9a.png?1632017593",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Artifact",
            "Equipment"
          ],
          "back_types": [],
          "oracle_text": "Equipped creature gets +2/+0 and has reach.\nWhenever equipped creature is dealt damage, it deals damage equal to its power to target player or planeswalker.\nEquip {2}{R}",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 2,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=531520",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 116,
          "deckid": 9,
          "name": "Hour of Devastation",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/3/4/340b2e60-320d-4d64-9940-6aac9ed1b8c3.png?1597250398",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "3",
            "R",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Sorcery"
          ],
          "back_types": [],
          "oracle_text": "All creatures lose indestructible until end of turn. Hour of Devastation deals 5 damage to each creature and each non-Bolas planeswalker.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 5,
          "tokens": [],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 121,
          "deckid": 9,
          "name": "Kinjalli's Sunwing",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/2/b/2b9e0b0f-651a-44e6-8fb0-e46bfda0ada9.png?1562552626",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "W"
          ],
          "color_identity": [
            "W"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Flying\nCreatures your opponents control enter the battlefield tapped.",
          "back_oracle_text": "",
          "power": 2,
          "back_power": null,
          "toughness": 3,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=435170",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 165,
          "deckid": 9,
          "name": "Unclaimed Territory",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/0/5/053ce80a-1f32-4982-8d23-d1e313e925a4.png?1637632712",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "As Unclaimed Territory enters the battlefield, choose a creature type.\n{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=539448",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 107,
          "deckid": 9,
          "name": "Garruk's Uprising",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/7/1/71a4860a-8bb6-45c0-b00a-b4a42da33ab9.png?1594737017",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Enchantment"
          ],
          "back_types": [],
          "oracle_text": "When Garruk's Uprising enters the battlefield, if you control a creature with power 4 or greater, draw a card.\nCreatures you control have trample. (They can deal excess combat damage to the player or planeswalker they're attacking.)\nWhenever a creature with power 4 or greater enters the battlefield under your control, draw a card.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=485509",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 140,
          "deckid": 9,
          "name": "Raptor Hatchling",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/8/0/8093e88d-fd3c-43d3-a025-9ebb9f02a84f.png?1562558980",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "1",
            "R"
          ],
          "color_identity": [
            "R"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Enrage — Whenever Raptor Hatchling is dealt damage, create a 3/3 green Dinosaur creature token with trample.",
          "back_oracle_text": "",
          "power": 1,
          "back_power": null,
          "toughness": 1,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 2,
          "tokens": [
            {
              "name": "Dinosaur",
              "types": [
                "Token",
                "Creature",
                "Dinosaur"
              ]
            }
          ],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=435309",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 135,
          "deckid": 9,
          "name": "Polyraptor",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/5/3/53cfded0-ff53-49f6-85be-f8e9225a91fa.png?1562912034",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "6",
            "G",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Dinosaur"
          ],
          "back_types": [],
          "oracle_text": "Enrage — Whenever Polyraptor is dealt damage, create a token that's a copy of Polyraptor.",
          "back_oracle_text": "",
          "power": 5,
          "back_power": null,
          "toughness": 5,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 8,
          "tokens": [
            {
              "name": "Copy",
              "types": [
                "Token"
              ]
            }
          ],
          "gatherer": null,
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        },
        {
          "id": 114,
          "deckid": 9,
          "name": "Hornet Nest",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/4/7/4784dbd3-8ae0-45a0-8cde-908fba6af9d2.png?1562786341",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [
            "2",
            "G"
          ],
          "color_identity": [
            "G"
          ],
          "back_mana_cost": [],
          "types": [
            "Creature",
            "Insect"
          ],
          "back_types": [],
          "oracle_text": "Defender (This creature can't attack.)\nWhenever Hornet Nest is dealt damage, create that many 1/1 green Insect creature tokens with flying and deathtouch. (Any amount of damage a creature with deathtouch deals to a creature is enough to destroy it.)",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": 2,
          "back_toughness": null,
          "loyalty": 0,
          "back_loyalty": null,
          "cmc": 3,
          "tokens": [
            {
              "name": "Insect",
              "types": [
                "Token",
                "Creature",
                "Insect"
              ]
            }
          ],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=383267",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        }
      ]
    },
    "temp_zone": {
      owner: 1,
      name: 'temp_zone',
      cards: [
        {
          "id": 97,
          "deckid": 9,
          "name": "Cavern of Souls",
          "image": "https://c1.scryfall.com/file/scryfall-cards/png/front/4/2/4222863c-c851-4ef7-b29f-7111b05bb843.png?1655400377",
          "count": 1,
          "iscommander": false,
          "back_image": null,
          "back_face": false,
          "mana_cost": [],
          "color_identity": [],
          "back_mana_cost": [],
          "types": [
            "Land"
          ],
          "back_types": [],
          "oracle_text": "As Cavern of Souls enters the battlefield, choose a creature type.\n{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type, and that spell can't be countered.",
          "back_oracle_text": "",
          "power": null,
          "back_power": null,
          "toughness": null,
          "back_toughness": null,
          "loyalty": null,
          "back_loyalty": null,
          "cmc": null,
          "tokens": [],
          "gatherer": "https://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=426057",
          "counter_1": false,
          "counter_2": false,
          "counter_3": false,
          "multiplier": false,
          "counter_1_value": 0,
          "counter_2_value": 0,
          "counter_3_value": 0,
          "multiplier_value": 0,
          "owner": 1,
          "power_mod": 0,
          "toughness_mod": 0,
          "loyalty_mod": 0,
          "locked": false,
          "primed": false,
          "triggered": false,
          "is_token": false,
          "tapped": "untapped",
          "sidenav_visible": true,
          "visible": [
            1
          ],
          "alt": false,
          "facedown": false,
          "shaken": false,
          "inverted": false,
          "notes": "",
          "selected": false
        }
      ]
    }
  }

  players: any[] = [1, 2, 3, 4, 5]

  action_log: any[] = [];

  //Page Interaction
  rightclicked_item: any = null; //Set to the object that triggers the right click event.
  menuTopLeftPosition =  {x: '0', y: '0'} //The top left position of the 'right click' menu

  //Board Interaction
  magnified_card: any = null; //Pointer to the card object
  currently_dragging: any = null;
  teammate_view: boolean = false; //True if the player is viewing their partner's field (in partner game modes)

  //Messaging
  counter_buffer: any = false; //True if a counter update is in the message queue. Prevents counter updates from spamming

  ngOnInit(): void {
    for (let i = 0; i < 36; i++) {
      this.user.playmat.push({ name: 'play', id: i, owner: 1, cards: [] })
    }
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

  /**------------------------------------------------
   *      Playmat Display Utility Functions         *
   ------------------------------------------------**/

  /**
   * Helper function for changing whose board is being displayed.
   */
  currentPlayer() {
    return this.user;
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

  /**
   * Toggles the tap state of an input card
   * @param card
   */
  toggleCardTap(card: any) {
    let log = '';
    if (card.tapped === 'tapped') {
      card.tapped = 'untapped';
      log += ' {untap} ' + card.name
    }
    else {
      card.tapped = 'tapped';
      log += ' {tap} ' + card.name
    }
    /*
    if (log !== '') {
      log = '*' + this.user.name + '*' + log;
      this.sendPlayerUpdate(log);
    }
    else {
      this.sendPlayerUpdate(null);
    }
    */
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

  /**------------------------------------------------
   *          Message Handling Functions            *
   ------------------------------------------------**/

  logAction(type: string, data: any) {
    switch(type) {
      case 'move':
        if (data.source.name !== data.dest.name) {
          this.action_log.push([
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

  /**------------------------------------------------
   *    Input Detection/Replacement Functions       *
   ------------------------------------------------**/

  @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: any;
  onRightClick(event: MouseEvent, item: any) {
    event.preventDefault();
    event.stopPropagation();
    this.rightclicked_item = item;
    this.menuTopLeftPosition.x = event.clientX + 'px';
    this.menuTopLeftPosition.y = event.clientY + 'px';
    this.matMenuTrigger.openMenu();
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
