import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomImageManagerComponent } from './custom-image-manager.component';

describe('CustomImageManagerComponent', () => {
  let component: CustomImageManagerComponent;
  let fixture: ComponentFixture<CustomImageManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomImageManagerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomImageManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
