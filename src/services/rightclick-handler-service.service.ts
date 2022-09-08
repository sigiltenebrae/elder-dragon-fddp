import {Inject, Injectable} from '@angular/core';
import {DOCUMENT} from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class RightclickHandlerServiceService {

  constructor(@Inject(DOCUMENT) private document: Document) { }
  overrideRightClick() {
    this.document.addEventListener('contextmenu', (event) =>
      event.preventDefault()
    );
  }
}
