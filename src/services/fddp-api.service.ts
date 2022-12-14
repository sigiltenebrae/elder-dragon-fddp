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

  public getUsers(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/users').subscribe((users: any) => {
        if (users.errors) {
          console.log('Error getting users');
          console.log(users.errors);
          resolve([]);
        }
        else {
          resolve(users);
        }
      }, (error) => {
        console.log('Error getting users');
        console.log(error);
        resolve([]);
      })
    });
  }

  public getPlanes(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/planes').subscribe((planes: any) => {
        resolve(planes);
      }, (error) => {
        resolve([]);
      })
    })
  }

  public getArchidektDeck(archidekt_deckid: number): Promise<any> {
    return new Promise<any> ((resolve) => {
      this.http.get(environment.fddp_api_url + '/archidekt/deck/' + archidekt_deckid).subscribe((archidekt_data: any) => {
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
          resolve_images(image_data);
      }, () => {
          resolve_images([]);
      });
    });
  }

  public getAllOfCard(card: string): Promise<any[]> {
    return new Promise<any[]>((resolve_card, reject) => {
      this.http.post(environment.fddp_api_url + '/cards/all',
        JSON.stringify({name: card}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((image_data: any) => {
        resolve_card(image_data);
      }, () => {
        resolve_card([]);
      });
    });
  }

  public getAllOfToken(card: string): Promise<any[]> {
    return new Promise<any[]>((resolve_card, reject) => {
      this.http.post(environment.fddp_api_url + '/tokens/all',
        JSON.stringify({name: card}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((token_data: any) => {
        resolve_card(token_data);
      }, () => {
        resolve_card([]);
      });
    });
  }

  public getCardInfo(card: string): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.post(environment.fddp_api_url + '/cards',
        JSON.stringify({name: card}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((card_data: any) => {
          resolve(card_data);
      }, () => {
          resolve({});
      });
    })
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

  public deleteDeck(deckid: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.delete(environment.fddp_api_url + '/decks/' + deckid).subscribe(() => { resolve(); })
    });
  }

  public getDecksBasic(userid?: any): Promise<any> {
    return new Promise<any>((resolve) => {
      let url = environment.fddp_api_url;
      if (userid) {
        url += '/userdecks/basic/' + userid;
      }
      else {
        url += '/decks/basic/'
      }
      this.http.get(url).subscribe((decks: any) => {
        if(decks.errors && decks.errors.length > 0) {
          console.log('Errors in getting decks')
          console.log(decks.errors);
        }
        resolve(decks.decks);
      }, (error) => {
        console.log('Error getting decks')
        console.log(error);
        resolve(null);
      });
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

  public getRandomDeck(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/cheap/randomdeck').subscribe((deck_data) => {
        resolve(deck_data);
      }, () => {
        resolve(null);
      })
    })
  }

  public createCustomCard(name: any, image: any, creator: number): Promise<void> {
    return new Promise<void>((resolve_card, reject) => {
      this.http.post(environment.fddp_api_url + '/custom_cards',
        JSON.stringify({name: name, image: image, creator: creator}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((card_response: any) => {
          console.log('sent custom card');
        if (card_response.errors) {
          console.log('Error in custom card creation: ');
          card_response.errors.forEach((err: any) => {
            console.log(err);
          });
          console.log('done');
          resolve_card();
        }
      }, (err) => {
        console.log('Error in custom card creation: ');
        console.log(err);
        resolve_card();
      })
      setTimeout(resolve_card, 3000);
    })
  }

  public createCustomToken(token:any): Promise<void> {
    return new Promise<void>((resolve_token, reject) => {
      this.http.post(environment.fddp_api_url + '/custom_tokens',
        JSON.stringify({token: token}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((card_response: any) => {
        if (card_response.errors) {
          console.log('Error in custom token creation: ');
          card_response.errors.forEach((err: any) => {
            console.log(err);
          });
          resolve_token();
        }
      }, (err) => {
        console.log('Error in custom token creation: ');
        console.log(err);
        resolve_token();
      })
      setTimeout(resolve_token, 3000);
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

  public deleteCustomCard(cardid: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.delete(environment.fddp_api_url + '/custom_cards/' + cardid).subscribe(() => { resolve(); })
    });
  }

}
