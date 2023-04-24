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

  public updateProfile(user) {
    return new Promise<void>((resolve) => {
      this.http.put<any>(environment.fddp_api_url + '/users/' + user.id, JSON.stringify({user: user}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((profile_response: any) => {
        if (profile_response.errors) {
          if (profile_response.errors.length > 0) {
            profile_response.errors.length.forEach((error: any) => {
              console.log(error);
            });
          }
          resolve(profile_response.errors);
        }
      });
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

  public getAttractions(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/attractions').subscribe((attractions: any) => {
        resolve(attractions);
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

  public searchCard(card:string): Promise<any[]> {
    return new Promise<any[]>((resolve) => {
      this.http.post(environment.fddp_api_url + '/cards/search',
        JSON.stringify({name: card}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((card_list: any[]) => {
        resolve(card_list);
      }, () => {
        resolve([]);
      });
    })
  }

  public autocompleteCard(card:string, options?: any): Promise<string[]> {
    return new Promise<string[]>((resolve) => {
      this.http.post(environment.fddp_api_url + '/cards/autocomplete',
        JSON.stringify({name: card, options: options? options: null}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((card_list: string[]) => {
        resolve(card_list);
      }, () => {
        resolve([]);
      });
    })
  }

  public getImagesForCard(card: string): Promise<any> {
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

  public getAllOfToken(card: string, search?): Promise<any[]> {
    return new Promise<any[]>((resolve_card, reject) => {
      this.http.post(environment.fddp_api_url + '/tokens/all',
        JSON.stringify({name: card, search: search != null? search: false}),
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
          if (deck_response.id) {
            resolve_deck(deck_response.id);
          }
          else {
            resolve_deck(null);
          }
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

  public getDeckList(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/decklist').subscribe((deck_list) => {
        resolve(deck_list);
      }, () => {
        resolve([]);
      })
    })
  }

  public getCheapRandomDeck(colors?: any): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.post(environment.fddp_api_url + '/randomdeck/cheap',
        JSON.stringify({colors: colors != null? colors: null}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((deck_data) => {
        resolve(deck_data);
      }, () => {
        resolve(null);
      })
    })
  }

  public getRegularRandomDeck(colors?: any): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.post(environment.fddp_api_url + '/randomdeck/regular',
        JSON.stringify({colors: colors != null? colors: null}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((deck_data) => {
        resolve(deck_data);
      }, () => {
        resolve(null);
      })
    })
  }

  public getRandomCommander(colors?: any): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.post(environment.fddp_api_url + '/randomcommander/',
        JSON.stringify({colors: colors != null? colors: null}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((cmdr_data) => {
        resolve(cmdr_data);
      }, () => {
        resolve(null);
      });
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
      });
    });
  }

  public getCustomTokens(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/custom_tokens').subscribe((cards: any) => {
        resolve(cards);
      }, () => {
        resolve([]);
      });
    });
  }

  public deleteCustomCard(cardid: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.delete(environment.fddp_api_url + '/custom_cards/' + cardid).subscribe(() => { resolve(); })
    });
  }

  public deleteCustomToken(cardid: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.delete(environment.fddp_api_url + '/custom_tokens/' + cardid).subscribe(() => { resolve(); })
    });
  }

  public getBanList(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/bans/list').subscribe((cards: any) => {
        resolve(cards);
      }, () => {
        resolve([]);
      });
    });
  }

  public getBanTypes(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/bans/types').subscribe((types: any) => {
        resolve(types);
      }, () => {
        resolve([]);
      });
    });
  }

  public getGames(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/games').subscribe((games: any) => {
        resolve(games)
      }, () => {
        resolve([]);
      })
    })
  }

  public getGamesNoTests(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/gamesnt').subscribe((games: any) => {
        resolve(games)
      }, () => {
        resolve([]);
      })
    })
  }

  public getGameResults(gameid): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/games/results/' + gameid).subscribe((results: any) => {
        resolve(results);
      }, () => {
        resolve([]);
      })
    })
  }

  public updateGameResults(gameid, results) {
    return new Promise<void>((resolve) => {
      this.http.put<any>(environment.fddp_api_url + '/games/results/' + gameid, JSON.stringify({results: results}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((results_response: any) => {
        if (results_response.errors) {
          if (results_response.errors.length > 0) {
            results_response.errors.length.forEach((error: any) => {
              console.log(error);
            });
          }
          resolve();
        }
        resolve();
      }, () => {
          resolve();
      });
    });
  }

  public getThemes(): Promise<any> {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/themes').subscribe((theme_data: any) => {
        resolve(theme_data);
      }, () => {
        resolve({themes: [], tribes: []});
      })
    })
  }

  public updateDeckThemes(deckid, themes, tribes): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.put<any>(environment.fddp_api_url + '/themes/decks/' + deckid, JSON.stringify({themes: themes, tribes: tribes}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((resp: any) => {
          if (resp.errors) {
            console.log(resp.errors);
          }
          console.log(resp);
          resolve();
      }, () => {
          resolve();
      });
    });
  }

  public updateDeckLegality(deckid): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.get(environment.fddp_api_url + '/legality/update/' + deckid).subscribe((legality_data: any) => {
        resolve();
      }, () => {
        resolve();
      })
    })
  }

  public banCard(card: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.post<any>(environment.fddp_api_url + '/bans/create', JSON.stringify({card: card}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((resp: any) => {
        if (resp.errors) {
          console.log(resp.errors);
        }
        console.log(resp);
        resolve();
      }, () => {
        resolve();
      });
    })
  }

  public removeBan(card: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.post<any>(environment.fddp_api_url + '/bans/delete', JSON.stringify({card: card}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((resp: any) => {
        if (resp.errors) {
          console.log(resp.errors);
        }
        console.log(resp);
        resolve();
      }, () => {
        resolve();
      });
    })
  }

  public setBanImage(card: any): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.post<any>(environment.fddp_api_url + '/bans/image', JSON.stringify({card: card}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((resp: any) => {
          resolve();
      })
    })
  }

  public getEdhrecCommanderThemes(commander: any, commander2: any) {
    return new Promise<void>((resolve) => {
      this.http.post<any>(environment.fddp_api_url + '/edhrec/cmdrthemes', JSON.stringify({commander: commander, commander2: commander2}),
        {headers : new HttpHeaders({'Content-Type': 'application/json'})}).subscribe((resp: any) => {
        resolve(resp);
      })
    })
  }

  public getCardUsage(user_id: number) {
    return new Promise<any>((resolve) => {
      this.http.get(environment.fddp_api_url + '/users/carddata/' + user_id).subscribe((card_data) => {
        resolve(card_data);
      }, () => {
        resolve(null);
      })
    })
  }
}
