import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from "../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class FddpApiService {

  constructor(private http: HttpClient) { }

  public getImagesForCard(card: string): Promise<any[]> {
    return new Promise<any[]>((resolve_images, reject) => {
      this.http.post(environment.fddp_api_url + '/cards/images',
        JSON.stringify({name: card}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((image_data: any) => {
          resolve_images(image_data.images);
      }, () => {
          resolve_images([]);
      });
    });
  }

  public createDeck(deck: any): Promise<any> {
    console.log(deck);
    return new Promise<any>((resolve_deck, reject) => {
      this.http.post(environment.fddp_api_url + '/decks',
        JSON.stringify({deck: deck}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((deck_response: any) => {
          if (deck_response.errors) {
            console.log('Error in deck creation: ');
            deck_response.errors.forEach((err: any) => {
              console.log(err);
            })
          }
      }, (err) => {
          console.log('Error in deck creation: ');
          console.log(err);
      })
    })
  }
}
