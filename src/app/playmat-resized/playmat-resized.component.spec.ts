import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaymatResizedComponent } from './playmat-resized.component';

describe('PlaymatResizedComponent', () => {
  let component: PlaymatResizedComponent;
  let fixture: ComponentFixture<PlaymatResizedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaymatResizedComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaymatResizedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
