import {Component, Inject, OnInit} from '@angular/core';
import {debounceTime, distinctUntilChanged, Observable, OperatorFunction, switchMap, tap} from "rxjs";
import * as Scry from "scryfall-sdk";
import {FddpApiService} from "../../services/fddp-api.service";
import {Router} from "@angular/router";
import {TokenStorageService} from "../../services/token-storage.service";
import {TokenSelectDialog} from "../game-handler/game-handler-addons.component";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'app-custom-images',
  templateUrl: './custom-images.component.html',
  styleUrls: ['./custom-images.component.scss']
})
export class CustomImagesComponent implements OnInit {

  name: any = null;
  image: string = '';
  image_google: string = '';
  card_type = 'cards';

  token_type = '';
  token_power = '';
  token_toughness = '';
  token_text = '';
  token_colors = { w: false, u: false, b: false, r: false, g: false};

  constructor(private fddp_data: FddpApiService, public dialog: MatDialog,
              private router: Router, private tokenStorage: TokenStorageService) {
  }

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
  }

  searching = false;
  /**
   * OperatorFunction for Scryfall autocomplete on typeahead.
   * @param text$ string to autocomplete
   */
    // @ts-ignore
  public card_search: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.searching = true),
      // @ts-ignore
      switchMap(async term => {
        this.searching = true;
        return await Scry.Cards.autoCompleteName(term);
      }),
      tap(() => {
        this.searching = false;
      }));

  /**
   * Creates the custom card and clears out the form
   */
  createCustomCard() {
    if (this.name && this.image !== '') {
      this.fddp_data.createCustomCard(this.name, this.image, this.tokenStorage.getUser().id).then(() => {
        this.image = '';
        this.image_google = '';
        this.name = null;
      });
    }
  }

  /**
   * Creates a custom token and clears out the form.
   */
  createCustomToken() {
    if(this.name && this.image) {
      let out_token: any = {
        name: this.name,
        image: this.image,
        type_line: this.token_type,
        power: this.token_power === ''? null: this.token_power,
        toughness: this.token_toughness === ''? null: this.token_toughness,
        oracle_text: this.token_text,
        colors: this.token_colors,
        creator: this.tokenStorage.getUser().id
      }
      this.fddp_data.createCustomToken(out_token).then(() => {
        this.image = '';
        this.image_google = '';
        this.token_type = '';
        this.token_power = '';
        this.token_toughness = '';
        this.token_text = '';
        this.token_colors = { w: false, u: false, b: false, r: false, g: false};
      })
    }
  }

  /**
   * Helper function to take a google drive share link and format it for correct use.
   * @param type format type to use. Currently, only accepts google.
   */
  formatLink(type: string) {
    if (type === 'google') {
      if (this.image_google.includes('/file/d/') && this.image_google.includes('/view?usp=sharing')) {
        this.image = "https://drive.google.com/uc?export=view&id=" + this.image_google.substring(this.image_google.indexOf('/file/d/') + 8, this.image_google.indexOf('/view?usp=sharing'));
      }
      if (this.image_google.includes('/file/d/') && this.image_google.includes('/view?usp=share_link')) {
        this.image = "https://drive.google.com/uc?export=view&id=" + this.image_google.substring(this.image_google.indexOf('/file/d/') + 8, this.image_google.indexOf('/view?usp=share_link'));
      }
    }
  }

  /**
   * Open the token select dialog
   */
  openTokenDialog() {
    if (this.name != null && this.name !== '' && this.card_type === 'tokens') {
      this.fddp_data.getAllOfCard(this.name).then((token_list) => {
        if (token_list.length > 0) {
          const tokDialogRef = this.dialog.open(CustomTokenDialog, {
            width: '800px',
            data: {tokens: token_list},
          });
          tokDialogRef.afterClosed().subscribe(result => {
            if (result) {
              this.name = result.name;
              this.token_type = result.type_line != null ? result.type_line: 'Token';
              this.token_power = result.power != null? result.power: '';
              this.token_toughness = result.toughness != null? result.toughness: '';
              this.token_text = result.oracle_text != null? result.oracle_text: '';
              if (result.colors != null && result.colors.length > 0) {
                this.token_colors.w = result.colors.includes("W");
                this.token_colors.u = result.colors.includes("U");
                this.token_colors.b = result.colors.includes("B");
                this.token_colors.r = result.colors.includes("R");
                this.token_colors.g = result.colors.includes("G");
              }
            }
          });
        }
      })
    }
  }
}


@Component({
  selector: 'custom-token-dialog',
  templateUrl: 'custom-token-dialog.html',
})
export class CustomTokenDialog {
  constructor(
    public dialogRef: MatDialogRef<CustomTokenDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  tokens: any[] = this.data.tokens;

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  selectToken(res: any) {
    this.dialogRef.close(res);
  }
}
