import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";

@Component({
  selector: 'app-custom-image-manager',
  templateUrl: './custom-image-manager.component.html',
  styleUrls: ['./custom-image-manager.component.scss']
})
export class CustomImageManagerComponent implements OnInit {

  cards: any[] = [];

  constructor(private fddp_data: FddpApiService) { }

  ngOnInit(): void {
    this.fddp_data.getCustomCards().then((cards: any) => {
      this.cards = cards;
      this.cards.sort((a: any, b: any) => (a.name > b.name) ? 1: -1)
    })
  }

}
