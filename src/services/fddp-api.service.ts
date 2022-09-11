import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from "../environments/environment";
import {ActivatedRoute, Router} from "@angular/router";
import {end} from "@popperjs/core";

@Injectable({
  providedIn: 'root'
})
export class FddpApiService {

  constructor(private http: HttpClient) { }

  public getArchidektDeck(archidekt_deckid: number): Promise<any> {
    return new Promise<any> ((resolve) => {
      this.http.get('/archidekt/api/decks/' + archidekt_deckid + '/').subscribe((archidekt_data: any) => {
        resolve(archidekt_data);
      }, (error) => {
        console.log('Error pulling data from archidekt');
        console.log(error);
        resolve(null);
      })
    })
  }

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
    return new Promise<any>((resolve_deck, reject) => {
      this.http.post(environment.fddp_api_url + '/decks',
        JSON.stringify({deck: deck}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((deck_response: any) => {
          if (deck_response.errors) {
            if (deck_response.errors.length == 0) {
              console.log('deck created');
            }
            else {
              console.log('Error in deck creation: ');
              deck_response.errors.forEach((err: any) => {
                console.log(err);
              });
            }

          }
          resolve_deck(null);
      }, (err) => {
          console.log('Error in deck creation: ');
          console.log(err);
          resolve_deck(null);
      })
    })
  }

  public updateDeck(deck: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.put<any>(environment.fddp_api_url + '/decks/' + deck.id,
        JSON.stringify({deck: deck}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((deck_response: any) => {
         if (deck_response.errors) {
           if (deck_response.errors.length == 0) {
             console.log('deck updated');
           }
           else {
             console.log('Errors in deck update: ');
             deck.errors.forEach((error: any) => {
               console.log(error);
             });
           }
           resolve();
         }
      }, (error) => {
          console.log('Error updating deck');
          console.log(error);
          resolve();
      });
    });
  }

  public getDeck(deckid: number): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/decks/' + deckid).subscribe((deck:any) => {
        if (deck.errors) {
          console.log('Errors in getting deck');
          console.log(deck.errors);
        }
        resolve(deck.deck);
      }, (error) => {
        console.log('Error getting deck with id: ' + deckid);
        console.log(error);
        resolve(null);
      });
    });
  }

  public createCustomCard(name: any, image: any): Promise<any> {
    return new Promise<any>((resolve_card, reject) => {
      this.http.post(environment.fddp_api_url + '/custom_cards',
        JSON.stringify({name: name, image: image}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((card_response: any) => {
        if (card_response.errors) {
          console.log('Error in custom card creation: ');
          card_response.errors.forEach((err: any) => {
            console.log(err);
          });
          resolve_card(null);
        }
      }, (err) => {
        console.log('Error in custom card creation: ');
        console.log(err);
        resolve_card(null);
      })
    })
  }

  public getCustomCards(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/custom_cards').subscribe((cards: any) => {
        resolve(cards);
      }, () => {
        resolve([]);
      })
    })
  }

  public getDeckForPlay(deckid: number): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/game/deck/' + deckid).subscribe((deck_data) => {
        resolve(deck_data);
      }, () => {
        resolve(null);
      })
    })
  }

}
