import { Component, OnInit } from '@angular/core';
import {TokenStorageService} from "../../services/token-storage.service";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  user: any = null;

  constructor(private tokenStorage: TokenStorageService) { }

  ngOnInit(): void {
    this.user = this.tokenStorage.getUser();
  }

}
