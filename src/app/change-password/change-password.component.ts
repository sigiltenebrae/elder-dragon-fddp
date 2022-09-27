import { Component, OnInit } from '@angular/core';
import {AuthService} from "../../services/auth.service";
import {TokenStorageService} from "../../services/token-storage.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {

  constructor(private authService: AuthService, private tokenStorage: TokenStorageService, private router: Router) { }

  ngOnInit(): void {
    //force user to log in to view
    if (this.tokenStorage.getUser() == null || this.tokenStorage.getUser() == {} ||
      this.tokenStorage.getUser().id == null || this.tokenStorage.getUser().id < 0) {
      //this.router.navigate(['login']);
    }
  }

  public loading = false; //display spinner while page is loading

  form: any = {
    old_password: null,
    new_password: null,
    repeat_password: null,
  };

  isSuccessful = false;
  isChangeFailed = false;
  errorMessage = '';

  hide_old_password = true;
  hide_password_1 = true;
  hide_repeat_password = true;

  onSubmit(): void {
    const password = this.form.old_password;
    const new_password = this.form.repeat_password;
    this.authService.changePassword(password, new_password).subscribe({
      next: data => {
        console.log(data);
        this.isSuccessful = true;
        this.isChangeFailed = false;
      },
      error: err => {
        this.errorMessage = err.error.message;
        this.isChangeFailed = true;
      }
    });
  }
}
