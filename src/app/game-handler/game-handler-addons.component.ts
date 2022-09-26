import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {FddpApiService} from "../../services/fddp-api.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {CDK_DRAG_CONFIG, CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";



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
    console.log(this.data);
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
      if (event.container.data.length < 2) {
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
