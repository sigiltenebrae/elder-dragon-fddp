import { Component, OnInit } from '@angular/core';
import {debounceTime, distinctUntilChanged, Observable, OperatorFunction, switchMap, tap} from "rxjs";
import * as Scry from "scryfall-sdk";
import {FddpApiService} from "../../services/fddp-api.service";
import {Router} from "@angular/router";
import {TokenStorageService} from "../../services/token-storage.service";

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

  constructor(private fddp_data: FddpApiService, private router: Router, private tokenStorage: TokenStorageService) {
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

  createCustomCard() {
    console.log('create');
    if (this.name && this.image !== '') {
      this.fddp_data.createCustomCard(this.name, this.image, this.tokenStorage.getUser().id).then(() => {
        console.log('success');
        this.image = '';
        this.image_google = '';
        this.name = null;
      });
    }
  }

  formatLink(type: string) {
    if (type === 'google') {
      if (this.image_google.includes('/file/d/') && this.image_google.includes('/view?usp=sharing')) {
        this.image = "https://drive.google.com/uc?export=view&id=" + this.image_google.substring(this.image_google.indexOf('/file/d/') + 8, this.image_google.indexOf('/view?usp=sharing'));
      }
    }
  }

}
