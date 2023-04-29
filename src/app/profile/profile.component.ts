import {Component, HostListener, Inject, OnInit} from '@angular/core';
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";
import {FddpApiService} from "../../services/fddp-api.service";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {TokenFinderDialog} from "../deck-edit/deck-edit.component";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  user: any = null;
  current_keybind = null;

  constructor(private tokenStorage: TokenStorageService, private router: Router, private fddp_data: FddpApiService, public dialog: MatDialog) { }

  ngOnInit(): void {
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      this.router.navigate(['login']);
    }
    else {
      this.user = this.tokenStorage.getUser();
    }
  }

  editDefaultImages() {
    this.fddp_data.getDefaultImages(this.user.id).then((image_data:any) => {
      const imageDialogRef = this.dialog.open(DefaultImagesDialog, {
        width: '800px',
        height: '500px',
        data: {image_data: image_data, user: this.user},
      });
      imageDialogRef.afterClosed().subscribe(result => {
          console.log('done');
        }
      )
    })
  }



  saveProfile() {
    this.fddp_data.updateProfile(this.user).then((errors: any) => {
      if (errors.length > 0) {
        console.log(errors);
      }
      else {
        this.tokenStorage.saveUser(this.user);
        window.location.reload();
      }
    });
  }

  selectInput(id: any) {
    this.current_keybind = true;
    console.log(id);
  }

  onKeyDown(event: any) {
    if (this.current_keybind != null) {
      console.log(event.key);
    }
  }

}

@Component({
  selector: 'default-images-dialog',
  templateUrl: 'default-images-dialog.html',
})
export class DefaultImagesDialog {
  constructor(
    public dialogRef: MatDialogRef<DefaultImagesDialog>,
    private fddp_data: FddpApiService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  image_data: any[] = this.data.image_data;
  user = this.data.user;

  deleteDefaultImage(card) {
    this.fddp_data.deleteDefaultImage(this.user.id, card).then(() => {
      console.log('deleted default.');
    });
    this.image_data.splice(card, 1);
  }

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  selectToken(res: any) {
    this.dialogRef.close(res);
  }
}
