import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {FddpApiService} from "../../services/fddp-api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {CDK_DRAG_CONFIG, CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {animate, state, style, transition, trigger} from "@angular/animations";



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

  async searchToken(token: string) {
    this.results = [];
    //const values = await Scry.Cards.search('"' + token + '"', {include_extras: true}).waitForAll();
    this.fddp_data.getAllOfToken(token, true).then((token_list) => {
      this.results = token_list;
    })
  }

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  createToken(res: any) {
    this.dialogRef.close(res);
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
  animations: [
    trigger('flipState', [
      state('true', style({
        transform: 'rotateY(179deg)'
      })),
      state('false', style({
        transform: 'rotateY(0)'
      })),
      transition('true => false', animate('500ms ease-out')),
      transition('false => true', animate('500ms ease-in'))
    ])
  ]
})
export class DeckSelectDialog {

  decks: any[] = [];
  decks_others: any = {};
  loading = false;
  loading_others = false;
  loaded_others = false;
  users = [];

  selected_decks = []; //used for deck test

  constructor(
    public dialogRef: MatDialogRef<DeckSelectDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fddp_data: FddpApiService
  )
  {
    this.loading = true;
    if (this.data.random) {
      if (this.data.test) {
        let randomPromises: any[] = [];
        for(let i = 0; i < this.data.max_players; i++) {
          randomPromises.push(
            new Promise<void>((resolve) => {
              this.fddp_data.getCheapRandomDeck().then((deck) => {
                this.selected_decks.push(deck);
                resolve();
              });
            }));
        }
        Promise.all(randomPromises).then(() => {
          this.selectMultiple();
        });
      }
      else {
        let colors = this.generateStarColors(this.data.star_color, this.data.star_color_count);
        this.fddp_data.getCheapRandomDeck(colors).then((deck) => {
          if (deck != null) {
            this.loading = false;
            this.dialogRef.close(deck);
          }
        });
      }
    }
    else if (this.data.random && this.data.expensive) {
      if (this.data.test) {
        let randomPromises: any[] = [];
        for(let i = 0; i < this.data.max_players; i++) {
          randomPromises.push(
            new Promise<void>((resolve) => {
              this.fddp_data.getRegularRandomDeck().then((deck) => {
                this.selected_decks.push(deck);
                resolve();
              });
            }));
        }
        Promise.all(randomPromises).then(() => {
          this.selectMultiple();
        });
      }
      else {
        let colors = this.generateStarColors(this.data.star_color, this.data.star_color_count);
        this.fddp_data.getRegularRandomDeck(colors).then((deck) => {
          if (deck != null) {
            this.loading = false;
            this.dialogRef.close(deck);
          }
        });
      }
    }
    else {

      this.fddp_data.getUsers().then((user_list: any) => {
        this.users = user_list;

        this.fddp_data.getDecksBasic(this.data.user).then((decks: any) => {
          this.decks = decks;
          for (let deck of this.decks) {
            if (!deck.active) {
              this.decks.splice(this.decks.indexOf(deck), 1);
            }
            else {
              deck.selected = false;
            }
          }
          this.loading = false
          for (let other of this.users) {
            if (other.id != this.data.user) {
              this.decks_others[other.id] = [];
            }
          }
        });
      });
    }
  }

  loadOthers() {
    return new Promise<void>((resolve) => {
      if (this.loaded_others) {
        resolve();
      }
      else {
        this.loading_others = true;
        this.fddp_data.getDecksBasic().then((decks: any) => {
          decks.forEach((deck: any) => {
            if (deck.owner !== this.data.user && deck.active) {
              deck.selected = false;
              this.decks_others[deck.owner].push(deck);
            }
          });
          this.loading_others = false;
          this.loaded_others = true;
          resolve();
        });
      }
    });
  }

  selectMultiple() {
    this.dialogRef.close(this.selected_decks);
  }

  selectRandom() {
    let sel = this.decks[Math.floor(Math.random() * this.decks.length)];
    if (this.data.test && sel.selected) {
      this.selectRandom();
    }
    else {
      this.selectDeck(sel);
    }
  }

  selectRandomAll() {
    this.loadOthers().then(() => {
      let selectedUser = this.users[Math.floor(Math.random() * this.users.length)];
      let sel = this.decks_others[selectedUser.id][Math.floor(Math.random() * this.decks_others[selectedUser.id].length)];
      if (this.data.test && sel.selected) {
        this.selectRandomAll();
      }
      else {
        this.selectDeck(sel);
      }
    });
  }

  selectDeck(deck: any) {
    if (this.data.test) {
      if (deck.selected) {
        this.selected_decks.splice(this.selected_decks.indexOf(deck), 1)
        deck.selected = !deck.selected;
      }
      else {
        if (this.selected_decks.length < this.data.max_players) {
          this.selected_decks.push(deck);
          deck.selected = !deck.selected;
        }
      }
    }
    else {
      this.dialogRef.close(deck);
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }


  generateStarColors(color, count) {
    count = Number(count);
    switch(color){
      case "W":
        switch(count) {
          case 2:
            if (Math.floor(Math.random()) * 2 == 0) {
              return ['G', 'W'];
            }
            else {
              return ['W', 'U'];
            }
          case 3:
            return ['G', 'W', 'U'];
          default:
            return ['W'];
        }
      case "U":
        switch(count) {
          case 2:
            if (Math.floor(Math.random()) * 2 == 0) {
              return ['W', 'U'];
            }
            else {
              return ['U', 'B'];
            }
          case 3:
            return ['W', 'U', 'B'];
          default:
            return ['U'];
        }
      case "B":
        switch(count) {
          case 2:
            if (Math.floor(Math.random()) * 2 == 0) {
              return ['U', 'B'];
            }
            else {
              return ['B', 'R'];
            }
          case 3:
            return ['U', 'B', 'R'];
          default:
            return ['B'];
        }
      case "R":
        switch(count) {
          case 2:
            if (Math.floor(Math.random()) * 2 == 0) {
              return ['B', 'R'];
            }
            else {
              return ['R', 'G'];
            }
          case 3:
            return ['B', 'R', 'G'];
          default:
            return ['R'];
        }
      case "G":
        switch(count) {
          case 2:
            if (Math.floor(Math.random()) * 2 == 0) {
              return ['R', 'G'];
            }
            else {
              return ['G', 'W'];
            }
          case 3:
            return ['R', 'G', 'W'];
          default:
            return ['G'];
        }
    }
    return null;
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

@Component({
  selector: 'counter-set-dialog',
  templateUrl: 'counter-set-dialog.html',
})
export class CounterSetDialog {
  constructor(
    public dialogRef: MatDialogRef<CounterSetDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  new_value = this.data.value;

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  saveValue() {
    this.dialogRef.close(this.new_value);
  }
}

const DragConfig = {
  dragStartThreshold: 0,
  pointerDirectionChangeThreshold: 5,
  zIndex: 10000
};

@Component({
  selector: 'two-headed-teams-dialog',
  templateUrl: 'two-headed-teams.html',
  providers: [{ provide: CDK_DRAG_CONFIG, useValue: DragConfig }]
})
export class TwoHeadedTeamsDialog {
  constructor(
    public dialogRef: MatDialogRef<TwoHeadedTeamsDialog>,
    private snackbar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  players: any[] = this.data.players;
  team_slots: any[] = this.data.team_array;

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  randomTeams() {
    for (let team of this.team_slots) {
      for (let player of team) {
        transferArrayItem(
          team,
          this.players,
          team.indexOf(player),
          0,
        );
      }
    }
    for (let i = 0; i < this.players.length; i++) {
      while(true) {
        let current = Math.floor(Math.random() * this.team_slots.length);
        if (this.team_slots[current].length < 2) {
          transferArrayItem(
            this.players,
            this.team_slots[current],
            0,
            0,
          );
          i -= 1;
          break;
        }
      }
      console.log(this.team_slots);
    }
  }

  checkValidTeams() {
    if (this.players.length == 0) {
      let bad = false;
      for (let team of this.team_slots) {
        if (team.length != 2){
          bad = true;
          break;
        }
      }
      if (bad) {
        this.snackbar.open('Not all teams have 2 players',
          'dismiss', {duration: 3000});
      }
      else {
        this.setTeams(this.team_slots);
      }
    }
    else {
      this.snackbar.open('Not all players assigned to a team',
        'dismiss', {duration: 3000});
    }
  }
  setTeams(res: any[]) {
    let team_ids: any[] = []
    for (let team of res) {
      let team_id = [];
      for (let player of team) {
        team_id.push(player.id);
      }
      team_ids.push(team_id);
    }
    this.dialogRef.close(team_ids);
  }

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      if (event.container.data.length < 2 || event.container.data == this.players) {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      }
    }
  }
}

@Component({
  selector: 'end-game-dialog',
  templateUrl: 'end-game.html',
  providers: [{ provide: CDK_DRAG_CONFIG, useValue: DragConfig }]
})
export class EndGameDialog {

  players: any[] = [];
  winners: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<EndGameDialog>,
    private snackbar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {

    this.data.players.forEach((player: any) => {
      this.players.push(player);
    });
  }


  onNoClick(): void {
    this.dialogRef.close(null);
  }

  submit_winners() {
    this.dialogRef.close({
      winners: this.winners
    });
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
}

@Component({
  selector: 'select-colors-dialog',
  templateUrl: 'star-select-colors.html',
})
export class SelectColorsDialog {
  constructor(
    public dialogRef: MatDialogRef<EndGameDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  players: any[] = this.data.players;

  colors = ['W', 'U', 'B', 'R', 'G'];

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  randomColors() {
    let available_colors = ['W', 'U', 'B', 'R', 'G'];
    for (let player of this.players) {
      let cur_color = Math.floor(Math.random() * available_colors.length);
      player.star_color = available_colors[cur_color];
      available_colors.splice(cur_color, 1);
    }
  }

  nextColor(player: any) {
    if (player.star_color == null) {
      player.star_color = 'W';
    }
    else if (player.star_color === 'W') {
      player.star_color = 'U';
    }
    else if (player.star_color === 'U') {
      player.star_color = 'B';
    }
    else if (player.star_color === 'B') {
      player.star_color = 'R';
    }
    else if (player.star_color === 'R') {
      player.star_color = 'G';
    }
    else if (player.star_color === 'G') {
      player.star_color = null;
    }
  }

  colorsComplete() {
    let w_true = false;
    let u_true = false;
    let b_true = false;
    let r_true = false;
    let g_true = false;
    for (let player of this.players){
      if (player.star_color == 'W') {
        w_true = true;
      }
      if (player.star_color == 'U') {
        u_true = true;
      }
      if (player.star_color == 'B') {
        b_true = true;
      }
      if (player.star_color == 'R') {
        r_true = true;
      }
      if (player.star_color == 'G') {
        g_true = true;
      }
    }
    return w_true && u_true && b_true && r_true && g_true;
  }

  submit_colors() {
    let colors_out = [];
    for (let player of this.players) {
      colors_out.push({id: player.id, star_color: player.star_color});
    }
    this.dialogRef.close({
      colors: colors_out
    });
  }


}

@Component({
  selector: 'help-dialog',
  templateUrl: 'help-dialog.html',
})
export class HelpDialog {
  constructor(
    public dialogRef: MatDialogRef<HelpDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  players: any[] = this.data.players;
  team_slots: any[] = this.data.team_array;

  onNoClick(): void {
    this.dialogRef.close(null);
  }
}
