import { Component, OnInit } from '@angular/core';

import { AuthService } from "../../services/auth.service";
import {AbstractControl, ValidationErrors, ValidatorFn} from "@angular/forms";

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  constructor(private authService: AuthService) { }

  ngOnInit(): void {}

  form: any = {
    username: null,
    name: null,
    password: null,
    repeat_password: null,
  };
  isSuccessful = false;
  isSignUpFailed = false;
  errorMessage = '';

  hide_password_1 = true;
  hide_repeat_password = true;

  onSubmit(): void {
    const { username, name, password } = this.form;
    this.authService.register(username, name, password).subscribe({
      next: data => {
        console.log(data);
        this.isSuccessful = true;
        this.isSignUpFailed = false;
      },
      error: err => {
        this.errorMessage = err.error.message;
        this.isSignUpFailed = true;
      }
    });
  }
}
