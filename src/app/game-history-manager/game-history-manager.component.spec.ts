import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameHistoryManagerComponent } from './game-history-manager.component';

describe('GameHistoryManagerComponent', () => {
  let component: GameHistoryManagerComponent;
  let fixture: ComponentFixture<GameHistoryManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GameHistoryManagerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameHistoryManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
