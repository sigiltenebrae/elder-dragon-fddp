import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestWsComponent } from './test-ws.component';

describe('TestWsComponent', () => {
  let component: TestWsComponent;
  let fixture: ComponentFixture<TestWsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TestWsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestWsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
