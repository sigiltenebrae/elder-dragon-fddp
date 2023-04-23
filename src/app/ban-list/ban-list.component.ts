import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";
import {debounceTime, distinctUntilChanged, Observable, OperatorFunction, switchMap, tap} from "rxjs";
import * as Scry from "scryfall-sdk";
import {MatAccordion} from "@angular/material/expansion";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'app-ban-list',
  templateUrl: './ban-list.component.html',
  styleUrls: ['./ban-list.component.scss']
})
export class BanListComponent implements OnInit {

  @ViewChild(MatAccordion) accordion: MatAccordion;

  cards: any[] = [];
  types: any[] = [];
  ban_list: any[] = [];

  loading = false;

  new_ban_name = null;
  new_ban_type = 1;

  search_term = '';

  changelog: any[] = [];

  constructor(private fddp_data: FddpApiService,  private tokenStorage: TokenStorageService, private router: Router, public dialog: MatDialog) { }

  isAdmin() {
    return this.tokenStorage.getUser().isAdmin;
  }

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.loading = true;
      this.fddp_data.getBanList().then((cards: any) => {
        this.cards = cards;
        this.cards.sort((a: any, b: any) => (a.created < b.created) ? 1: -1);
        for (let i = 0; i < this.cards.length; i++) {
          if (i == 5) {
            break;
          }
          this.changelog.push(this.cards[i]);
        }
        this.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1);
        let card_promises = [];
        this.cards.forEach((card: any) => {
          card.visible = true;
          card_promises.push(this.getCardImage(card));
        });
        this.fddp_data.getBanTypes().then((types: any) => {
          this.types = types;
          this.types.reverse();
          Promise.all(card_promises).then(() => {
            this.ban_list = [[], [], [], []];
            this.cards.forEach((card: any) => {
              this.ban_list[card.ban_type - 1].push(card);
            });
            this.loading = false;
          });
        });
      });
    }
  }

  getBanType(id) {
    for (let type of this.types) {
      if (type.id == id) {
        return type.type;
      }
    }
    return null;
  }

  /**
   * Loads in an image for the card (attempts to use the most recent)
   * @param card card object to load in
   */
  getCardImage(card: any): Promise<void> {
    return new Promise<void>((resolve) => {
      if (card.image != null && card.image !== '') {
        resolve();
      }
      else {
        this.fddp_data.getImagesForCard(card.name).then((card_image_data: any) => {
          console.log('image for card: ' + card.name + ' not in db, grabbing');
          let card_images = card_image_data.images;
          card.image = card_images && card_images.length > 0? card_images[card_images.length - 1].image: '';
          if (card_images.length == 0){
            console.log('failed to find ' + card.name);
            resolve();
          }
          else {
            this.fddp_data.setBanImage(card).then(() => {
              resolve();
            });
          }
        });
      }
    });
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

  submitBan() {
    if (this.new_ban_name != null) {
      this.fddp_data.banCard({name: this.new_ban_name, ban_type: this.new_ban_type}).then(() => {
        this.reloadPage();
      })
    }
  }

  deleteBan(card: any) {
    this.fddp_data.removeBan(card).then(() => {
      console.log('ban removed!');
      this.reloadPage();
    })
  }

  changeImage(card: any) {
    this.fddp_data.getImagesForCard(card.name).then((image_data:any) => {
      if (image_data.images && image_data.images.length > 0) {
        const imgDialogRef = this.dialog.open(BanlistImageDialog, {
          width: '800px',
          data: {name: card.name, images: image_data.images},
        });
        imgDialogRef.afterClosed().subscribe(result => {
          if (result) {
            card.image = result.image;
            this.fddp_data.setBanImage(card).then(() => {
              this.reloadPage();
            });
          }
        })
      }
    })
  }

  getVisible(list) {
    let out_list = [];
    for (let item of list) {
      if (item.visible) {
        out_list.push(item);
      }
    }
    return out_list;
  }

  updateVisibility() {
    if (this.search_term && this.search_term !== '') {
      for (let ban_type of this.types) {
        for (let card of this.ban_list[ban_type.id - 1]) {
          card.visible = card.name.toLowerCase().includes(this.search_term.toLowerCase());
        }
      }
    }
    else {
      for (let ban_type of this.types) {
        for (let card of this.ban_list[ban_type.id - 1]) {
          card.visible = true;
        }
      }
    }
  }

  noneVisible() {
    for(let ban_type of this.types) {
      if (this.getVisible(this.ban_list[ban_type.id - 1]).length > 0) {
        return false;
      }
    }
    return true;
  }

  reloadPage(): void {
    window.location.reload();
  }

}

@Component({
  selector: 'ban-list-image-dialog',
  templateUrl: 'ban-list-image-dialog.html',
})
export class BanlistImageDialog {
  constructor(
    public dialogRef: MatDialogRef<BanlistImageDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  images: any[] = this.data.images;
  card_name = this.data.name;

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  selectImage(res: any) {
    this.dialogRef.close(res);
  }
}
