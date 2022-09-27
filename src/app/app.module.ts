import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { Router, RouterModule} from "@angular/router";
import { HttpClientModule } from "@angular/common/http";

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgScrollbarModule } from "ngx-scrollbar";

import { MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatSliderModule } from "@angular/material/slider";
import { MatGridListModule } from "@angular/material/grid-list";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatCardModule } from "@angular/material/card";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatOptionModule, MatRippleModule } from "@angular/material/core";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatStepperModule } from "@angular/material/stepper";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import {FlexLayoutModule} from "@angular/flex-layout";
import {DragDropModule} from "@angular/cdk/drag-drop";
import {GameHandlerComponent} from './game-handler/game-handler.component';
import {DeckSelectDialog,
  TokenInsertDialog,
  TokenSelectDialog,
  NoteDialog,
  CounterSetDialog,
  TwoHeadedTeamsDialog,
  SelectColorsDialog,
  EndGameDialog} from './game-handler/game-handler-addons.component'
import {MatMenuModule} from "@angular/material/menu";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import { DeckEditComponent } from './deck-edit/deck-edit.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CustomImagesComponent } from './custom-images/custom-images.component';
import { CustomImageManagerComponent } from './custom-image-manager/custom-image-manager.component';
import { DeckManagerComponent } from './deck-manager/deck-manager.component';
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialogModule } from "@angular/material/dialog";
import { GameManagerComponent } from './game-manager/game-manager.component';
import { LoginComponent } from './login/login.component';



@NgModule({
  declarations: [
    AppComponent,
    GameHandlerComponent,
    DeckEditComponent,
    CustomImagesComponent,
    CustomImageManagerComponent,
    DeckManagerComponent,
    TokenInsertDialog,
    TokenSelectDialog,
    NoteDialog,
    DeckSelectDialog,
    CounterSetDialog,
    TwoHeadedTeamsDialog,
    EndGameDialog,
    SelectColorsDialog,
    GameManagerComponent,
    LoginComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonToggleModule,
    MatSliderModule,
    MatGridListModule,
    MatSlideToggleModule,
    MatCardModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatButtonModule,
    MatChipsModule,
    MatRippleModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatOptionModule,
    MatSelectModule,
    MatTooltipModule,
    MatStepperModule,
    MatSnackBarModule,
    MatDialogModule,
    HttpClientModule,
    NgScrollbarModule,
    RouterModule.forRoot([
      {path: '', component: DeckManagerComponent},
      {path: 'login', component: LoginComponent},
      {path: 'game', component: GameManagerComponent},
      {path: 'games/:gameid', component: GameHandlerComponent},
      {path: 'decks/:deckid', component: DeckEditComponent},
      {path: 'upload', component: CustomImagesComponent},
      {path: 'custom', component: CustomImageManagerComponent}
    ]),
    FlexLayoutModule,
    DragDropModule,
    MatMenuModule,
    FormsModule,
    MatAutocompleteModule,
    NgbModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
