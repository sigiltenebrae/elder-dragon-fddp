import { Component, OnInit } from '@angular/core';
import {FddpApiService} from "../../services/fddp-api.service";
import {TokenStorageService} from "../../services/token-storage.service";

@Component({
  selector: 'app-commander-generator',
  templateUrl: './commander-generator.component.html',
  styleUrls: ['./commander-generator.component.scss']
})
export class CommanderGeneratorComponent implements OnInit {

  generated = false;
  color_w = false;
  color_u = false;
  color_b = false;
  color_r = false;
  color_g = false;
  commanders: any = null;

  constructor(private fddp_data: FddpApiService,  private tokenStorage: TokenStorageService) { }

  ngOnInit(): void {
  }

  generateCommander() {
    let colors = [];
    if (this.color_w){ colors.push('W'); }
    if (this.color_u){ colors.push('U'); }
    if (this.color_b){ colors.push('B'); }
    if (this.color_r){ colors.push('R'); }
    if (this.color_g){ colors.push('G'); }
    this.fddp_data.getRandomCommander(colors).then((cmdr_data) => {
      this.commanders = cmdr_data;
      console.log(this.commanders);
      this.generated = true;
    })
  }

}
