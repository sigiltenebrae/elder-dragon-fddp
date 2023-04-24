import { Injectable } from '@angular/core';
declare var require: any;
const CryptoJS = require('crypto-js');
const TOKEN_KEY = 'auth-token';
const USER_KEY = 'auth-user';
const SECRET_KEY = '0123456789123456';


@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {

  constructor() { }

  signOut(): void {
    window.sessionStorage.clear();
  }

  public saveToken(token: string): void {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.setItem(TOKEN_KEY, token);
  }

  public getToken(): string | null {
    return window.sessionStorage.getItem(TOKEN_KEY);
  }

  public saveUser(user: any): void {
    //user.isAdmin = false;
    if (user.roles) {
      for (let role of user.roles) {
        if (role.name === "admin") {
          user.isAdmin = true;
          break;
        }
      }
    }
    window.sessionStorage.removeItem(USER_KEY);
    let _key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
    let _iv = CryptoJS.enc.Utf8.parse(SECRET_KEY);
    let encrypted_user = CryptoJS.AES.encrypt(
      JSON.stringify(user), _key, {
        keySize: 16,
        iv: _iv,
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      });
    window.sessionStorage.setItem(USER_KEY, encrypted_user.toString());
    console.log('user saved');
  }

  public getUser(): any {
    const user = window.sessionStorage.getItem(USER_KEY);
    if (user) {
      let _key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
      let _iv = CryptoJS.enc.Utf8.parse(SECRET_KEY);
      let decrypted_user = CryptoJS.AES.decrypt(
        user, _key, {
          keySize: 16,
          iv: _iv,
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted_user);
    }
    return {};
  }
}
