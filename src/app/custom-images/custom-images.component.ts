import { Component, OnInit } from '@angular/core';
import {debounceTime, distinctUntilChanged, Observable, OperatorFunction, switchMap, tap} from "rxjs";
import * as Scry from "scryfall-sdk";

@Component({
  selector: 'app-custom-images',
  templateUrl: './custom-images.component.html',
  styleUrls: ['./custom-images.component.scss']
})
export class CustomImagesComponent implements OnInit {

  card: any = null;
  image: string = '';

  constructor() { }

  ngOnInit(): void {
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

}
