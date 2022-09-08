import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaymatComponent } from './playmat.component';

describe('PlaymatComponent', () => {
  let component: PlaymatComponent;
  let fixture: ComponentFixture<PlaymatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaymatComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaymatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
