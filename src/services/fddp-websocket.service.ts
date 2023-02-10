import {Injectable} from '@angular/core';
import { Observable, Observer } from 'rxjs';
import {Subject} from "rxjs";
import {AnonymousSubject} from 'rxjs/internal/Subject';
import {map} from 'rxjs/operators';
import {environment} from "../environments/environment";


@Injectable({
  providedIn: 'root'
})
export class FddpWebsocketService {
  private subject: AnonymousSubject<MessageEvent>;
  public messages: Subject<any>;

  constructor() {
    this.messages = <Subject<any>>this.connect(environment.fddp_websocket_url).pipe(
      map(
        (response: MessageEvent): any => {
          return JSON.parse(response.data);
        }
      )
    );
  }

  public connect(url: string): AnonymousSubject<MessageEvent> {
    if (!this.subject) {
      this.subject = this.create(url);
      console.log("Successfully connected: " + url);
    }
    return this.subject;
  }


  private create(url: string): AnonymousSubject<MessageEvent> {
    let ws = new WebSocket(url);
    let observable = new Observable((obs: Observer<MessageEvent>) => {
      ws.onmessage = obs.next.bind(obs);
      ws.onerror = () => {
        console.log('websocket error');
        obs.error.bind(obs);
      }
      ws.onclose = () => {
        console.log('closing socket');
        obs.complete.bind(obs);
      }
      return ws.close.bind(ws);
    });
    let observer = {
      error: null,
      complete: null,
      next: (data: any) => {
        if (data.content != null && data.content.ping) {

        }
        else {
          console.log('Message sent to websocket: ', data);
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
        else {
          console.log()
        }
      }
    };
    // @ts-ignore
    return new AnonymousSubject<MessageEvent>(observer, observable);
  }
}
