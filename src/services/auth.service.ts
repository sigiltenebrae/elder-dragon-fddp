import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from "../environments/environment";
import {TokenStorageService} from "./token-storage.service";

const AUTH_API = environment.fddp_api_url + '/auth';
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json'})
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient, private tokenStorage: TokenStorageService) { }

  login(username: string, password: string): Observable<any> {
    return this.http.post(AUTH_API + 'signin', {
      username,
      password
    }, httpOptions);
  }

  register(username: string, password: string): Observable<any> {
    return this.http.post(AUTH_API + 'signup', {
      username,
      password
    }, httpOptions);
  }

  changePassword(password: string, new_password: string) {
    return this.http.post(AUTH_API + 'change_password', {
      id: this.tokenStorage.getUser().id,
      password: password,
      new_password: new_password
    }, httpOptions);
  }
}
